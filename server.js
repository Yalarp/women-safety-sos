require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const session = require('express-session');
const flash = require('connect-flash');
const twilio = require('twilio');
const nodemailer = require('nodemailer');

// MongoDB connection
console.log('Attempting to connect to MongoDB URI:', process.env.MONGO_URI); // Debug log

if (!process.env.MONGO_URI) {
    console.error('FATAL ERROR: MONGO_URI is not defined in .env file.');
    process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB Connected Successfully');
    }).catch(err => {
        console.log('MongoDB connection error:', err);
    });

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// User model
const User = mongoose.model('User', new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    emergencyContacts: [String] // Array of email strings
}));

// Passport Local Strategy for login
const LocalStrategy = require('passport-local').Strategy;
passport.use(new LocalStrategy((username, password, done) => {
    User.findOne({ username: username }).then(user => {
        if (!user) {
            return done(null, false, { message: 'User not found' });
        }

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) throw err;
            if (isMatch) {
                return done(null, user);
            } else {
                return done(null, false, { message: 'Incorrect password' });
            }
        });
    }).catch(err => console.log(err));
}));

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user
passport.deserializeUser((id, done) => {
    User.findById(id).then(user => {
        done(null, user);
    }).catch(err => done(err));
});

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Registration Route
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.post('/register', (req, res) => {
    const { username, email, password } = req.body;

    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) throw err;

        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        newUser.save().then(user => {
            req.flash('success_msg', 'You are now registered and can log in.');
            res.redirect('/login');
        }).catch(err => console.log(err));
    });
});

// Login Route
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true
}));

// Dashboard Route (protected)
app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Logout Route
app.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

// Socket Connection (for SOS alert)
io.on('connection', (socket) => {
    console.log('A user connected');
    
    socket.on('sosAlert', (data) => {
        console.log(`Received SOS alert with location: Latitude ${data.lat}, Longitude ${data.lng}`);

        const sendAlertEmail = (username) => {
            // FORCING EMAIL TO SPECIFIC USER AS REQUESTED
            const recipients = ['2706pralay@gmail.com']; 
            console.log(`Sending Alert for ${username} to:`, recipients);

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            const googleMapsLink = `https://www.google.com/maps?q=${data.lat},${data.lng}`;
            const mailOptions = {
                from: process.env.EMAIL_USER,
                subject: `🚨 SOS ALERT: Emergency from ${username}!`,
                text: `Emergency Alert from ${username}.\n\nI need help!\nCurrent location: ${googleMapsLink}\n\nCoordinates: ${data.lat}, ${data.lng}`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ff4d4d; border-radius: 5px;">
                        <h2 style="color: #ff4d4d;">🚨 SOS Emergency Alert</h2>
                        <p><strong>${username}</strong> has triggered an SOS alert.</p>
                        <p>Please check their location immediately:</p>
                        <a href="${googleMapsLink}" style="background-color: #ff4d4d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View on Google Maps</a>
                        <p style="margin-top: 20px; font-size: 12px; color: #666;">Coordinates: ${data.lat}, ${data.lng}</p>
                    </div>
                `
            };

            mailOptions.to = recipients.join(',');
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log('Error sending email:', error);
                } else {
                    console.log('Emergency Email sent: ' + info.response);
                }
            });
        };

        if (data.userId) {
            // Logged in user
            User.findById(data.userId).then(user => {
                const username = user ? user.username : 'Unknown User';
                sendAlertEmail(username);
            }).catch(err => {
                console.log(err);
                sendAlertEmail('Unknown User (DB Error)');
            });
        } else {
            // Anonymous user
            sendAlertEmail('Anonymous Guest');
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// Start the server
const port = process.env.PORT || 5000;
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// Add a new route to handle emergency contacts
app.get('/emergency-contacts', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'emergency-contacts.html'));
});

// API Endpoint to get current user info (for frontend scripts)
app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ id: req.user._id, username: req.user.username });
    } else {
        res.json({ user: null }); // Not logged in
    }
});

// SOS Alert API Route (Vercel Friendly)
app.post('/api/sos', (req, res) => {
    const { lat, lng, userId } = req.body;
    console.log(`Received SOS API Alert: Lat ${lat}, Lng ${lng}`);

    const sendAlertEmail = (username, userContacts = []) => {
        // RECIPIENTS: Admin + All User Contacts
        const adminEmail = 'buizbee27@gmail.com';
        
        // Remove duplicates using Set
        const allRecipients = [...new Set([adminEmail, ...userContacts])];
        
        console.log(`Sending Alert for ${username} to:`, allRecipients);
        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const googleMapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            subject: `🚨 SOS ALERT: Emergency from ${username}!`,
            text: `Emergency Alert from ${username}.\n\nI need help!\nCurrent location: ${googleMapsLink}\n\nCoordinates: ${lat}, ${lng}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ff4d4d; border-radius: 5px;">
                    <h2 style="color: #ff4d4d;">🚨 SOS Emergency Alert</h2>
                    <p><strong>${username}</strong> has triggered an SOS alert.</p>
                    <p>Please check their location immediately:</p>
                    <a href="${googleMapsLink}" style="background-color: #ff4d4d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View on Google Maps</a>
                    <p style="margin-top: 20px; font-size: 12px; color: #666;">Coordinates: ${lat}, ${lng}</p>
                </div>
            `
        };

        mailOptions.to = allRecipients.join(',');
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error sending email:', error);
                res.status(500).json({ success: false, error: 'Failed to send email' });
            } else {
                console.log('Emergency Email sent: ' + info.response);
                res.json({ success: true, message: 'SOS Alert Sent Successfully' });
            }
        });
    };

    if (userId) {
        User.findById(userId).then(user => {
            const username = user ? user.username : 'Unknown User';
            const contacts = user ? user.emergencyContacts : [];
            sendAlertEmail(username, contacts);
        }).catch(err => {
            sendAlertEmail('Unknown User (DB Error)');
        });
    } else {
        sendAlertEmail('Anonymous Guest');
    }
});

// API to Add Emergency Contact
app.post('/api/contacts/add', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not logged in' });
    
    const { email } = req.body;
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Invalid email' });

    try {
        const user = await User.findById(req.user.id);
        
        // Sfty Check/Migration: Ensure emergencyContacts is an array
        if (!Array.isArray(user.emergencyContacts)) {
            user.emergencyContacts = [];
        }

        if (!user.emergencyContacts.includes(email)) {
            user.emergencyContacts.push(email);
            // Mark as modified if Mongoose doesn't detect the change (e.g. overwriting object)
            user.markModified('emergencyContacts'); 
            await user.save();
        }
        res.json({ success: true, contacts: user.emergencyContacts });
    } catch (err) {
        console.error('Error adding contact:', err); // Log the actual error
        res.status(500).json({ error: 'Server error' });
    }
});

// API to Remove Emergency Contact
app.post('/api/contacts/remove', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not logged in' });

    const { email } = req.body;
    try {
        const user = await User.findById(req.user.id);
        
        if (!Array.isArray(user.emergencyContacts)) {
            user.emergencyContacts = [];
        }

        user.emergencyContacts = user.emergencyContacts.filter(c => c !== email);
        user.markModified('emergencyContacts');
        await user.save();
        res.json({ success: true, contacts: user.emergencyContacts });
    } catch (err) {
        console.error('Error removing contact:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Contacts
app.get('/api/contacts', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not logged in' });
    try {
        const user = await User.findById(req.user.id);
        res.json({ contacts: user.emergencyContacts || [] });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});
