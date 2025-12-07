// Connect to the socket server
// Socket.IO removed for Vercel compatibility
// const socket = io(); 

let currentUserId = null;

// Fetch current user ID
fetch('/api/user')
    .then(response => response.json())
    .then(data => {
        if (data && data.id) {
            currentUserId = data.id;
            console.log("Logged in as user:", data.username);
            
            // Update UI for logged-in user
            const guestLinks = document.getElementById('guest-links');
            const userLinks = document.getElementById('user-links');
            const welcomeMsg = document.getElementById('welcome-msg');
            
            if (guestLinks && userLinks) {
                guestLinks.style.display = 'none';
                userLinks.style.display = 'block'; // or 'flex' depending on CSS
                if (welcomeMsg) welcomeMsg.textContent = `Hi, ${data.username}`;
            }
        } else {
            console.log("User not logged in");
        }
    })
    .catch(err => console.error("Error checking auth status:", err));

// Toast Notification Helper
const showToast = (message, type = 'success') => {
    // Check if container exists, if not create it
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
        
        // Inject styles dynamically if not in CSS
        const style = document.createElement('style');
        style.innerHTML = `
            .toast-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .toast {
                background: white;
                color: #333;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
                border-left: 4px solid #10B981;
                display: flex;
                align-items: center;
                animation: slideIn 0.3s ease forwards;
                min-width: 300px;
                font-weight: 500;
            }
            .toast.error { border-left-color: #EF4444; }
            .toast.info { border-left-color: #3B82F6; }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeOut {
                to { opacity: 0; transform: translateX(10%); }
            }
        `;
        document.head.appendChild(style);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        toast.addEventListener('animationend', () => toast.remove());
    }, 4000);
};

// Initialize map if element exists
const mapElement = document.getElementById('map');
let map;

if (mapElement) {
    map = L.map('map').setView([51.505, -0.09], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
}

// Function to locate user and handle geolocation
const locateUser = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

// Update map if it exists
                if (map) {
                    map.setView([lat, lng], 13);
                    L.marker([lat, lng]).addTo(map)
                        .bindPopup('You are here!')
                        .openPopup();
                }

                // SOS button functionality
                const alertButton = document.getElementById('alertButton');
                if (alertButton) {
                    alertButton.disabled = false; // Enable if disabled initially
                    alertButton.addEventListener('click', () => {
                        // Socket check removed for Vercel API
                        
                        // Loading state
                        const originalText = alertButton.textContent;
                        alertButton.textContent = 'Sending...';
                        alertButton.disabled = true;
                        alertButton.style.opacity = '0.7';

                        // Emit SOS alert
                        // Emit SOS alert (switched to API for Vercel compatibility)
                        /*
                        socket.emit('sosAlert', { lat, lng, userId: currentUserId });
                        */
                       
                        fetch('/api/sos', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ lat, lng, userId: currentUserId })
                        })
                        .then(res => res.json())
                        .then(data => {
                            if (data.success) {
                                showToast('SOS Alert Sent! Emergency contacts notified.', 'success');
                                alertButton.textContent = 'Alert Sent!';
                                alertButton.style.backgroundColor = '#10B981';
                            } else {
                                throw new Error(data.error);
                            }
                        })
                        .catch(err => {
                            showToast('Failed to send SOS: ' + err.message, 'error');
                            alertButton.textContent = 'Retry SOS';
                            alertButton.style.backgroundColor = '';
                            alertButton.disabled = false;
                            alertButton.style.opacity = '1';
                        })
                        .finally(() => {
                             if (alertButton.textContent === 'Alert Sent!') {
                                setTimeout(() => {
                                    alertButton.textContent = originalText;
                                    alertButton.disabled = false;
                                    alertButton.style.opacity = '1';
                                    alertButton.style.backgroundColor = '';
                                }, 5000);
                             }
                        });
                    });
                }
            },
            (error) => {
                console.error("Location error:", error);
                showToast('Unable to retrieve location. Please enable location services.', 'error');
            }
        );
    } else {
        showToast('Geolocation is not supported by your browser.', 'error');
    }
};

// Socket listeners removed for Vercel
/*
// Listen for connection events (Optional feedback)
socket.on('connect', () => {
    console.log('Connected to SOS server');
    showToast('Connected to Server', 'info');
});

socket.on('connect_error', (err) => {
    console.error('Connection Error:', err);
    // Don't spam toasts, just log
});

socket.on('disconnect', () => {
    showToast('Disconnected from Server', 'error');
});
*/

// Start location service
locateUser();
