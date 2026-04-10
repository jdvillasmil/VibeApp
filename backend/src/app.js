require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// CORS — must include both Capacitor origins (iOS and Android differ)
app.use(
  cors({
    origin: function (origin, callback) {
      const allowed = [
        'capacitor://localhost', // iOS Capacitor WebView
        'http://localhost', // Android Capacitor WebView
        'http://localhost:8100', // ionic serve
        'http://localhost:4200', // ng serve
        process.env.RENDER_EXTERNAL_URL, // Render backend public URL
      ].filter(Boolean);
      // Allow requests with no origin (server-to-server, curl without -H Origin)
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS: origin not allowed — ' + origin));
      }
    },
    credentials: true,
  })
);
app.options('*', cors()); // enable pre-flight for all routes

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving — uploads/ must exist (see .gitkeep)
// dotfiles: 'allow' required so Express serves .gitkeep (dotfiles are denied by default)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { dotfiles: 'allow' }));

// Routes
app.use('/health', require('./routes/health'));
app.use('/auth', require('./routes/auth'));
app.use('/users', require('./routes/users'));
app.use('/', require('./routes/discovery'));
app.use('/chats', require('./routes/chats'));

// Global error handler
app.use((err, _req, res, _next) => {
  console.warn('Unhandled error:', err.message);
  res.status(err.status || 500).json({ data: null, error: err.message, message: 'Server error' });
});

module.exports = app;
