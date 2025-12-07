# 🛡️ Woman Safety SOS

A robust, real-time web application designed to ensure personal safety. In an emergency, a single click triggers an SOS alert, sending your live geolocation to emergency contacts and administrators via email.


## 🚀 Key Features

*   **One-Click SOS**: Instantly sends an emergency alert with a Google Maps location link.
*   **Dual Alert System**: Sends emails to multiple pre-configured contacts simultaneously.
    *   **Admin Override**: Alerts always go to the system admin for redundancy.
    *   **Dynamic Contacts**: Users can manage their own list of trusted contacts.
*   **Live Geolocation**: Uses the browser's Geolocation API for precise tracking.
*   **Anonymous Mode**: Allows sending SOS alerts even without logging in (labeled as "Anonymous Guest").
*   **Secure Authentication**: User registration and login protected with encrypted passwords (bcrypt) and session management.
*   **Modern UI/UX**: A sleek, responsive design featuring glassmorphism and pulsing animations for high visibility in panic situations.
*   **Vercel Ready**: Refactored backend API optimized for serverless deployment (replaced WebSockets with REST).

## 🛠️ Tech Stack

*   **Frontend**: HTML5, CSS3 (Custom Design System), JavaScript (ES6+), Leaflet.js (Maps).
*   **Backend**: Node.js, Express.js.
*   **Database**: MongoDB Atlas (Cloud) with Mongoose.
*   **Authentication**: Passport.js, express-session (with connect-mongo for persistent storage).
*   **Email Service**: Nodemailer (SMTP with Gmail).

## ⚙️ Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/women-safety-sos.git
    cd women-safety-sos
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory:
    ```env
    MONGO_URI=your_mongodb_atlas_connection_string
    EMAIL_USER=your_gmail_address
    EMAIL_PASS=your_gmail_app_password
    SESSION_SECRET=your_random_secret_string
    ```

4.  **Run Locally**
    ```bash
    node server.js
    ```
    Visit `http://localhost:5000`

## ☁️ Deployment (Vercel)

This project is optimized for Vercel.
1.  Push code to GitHub.
2.  Import project in Vercel.
3.  Add the Environment Variables in Vercel Settings.
4.  Deploy!

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/yourusername/women-safety-sos/issues).

## 📝 License

This project is licensed under the ISC License.
# women-safety-sos
