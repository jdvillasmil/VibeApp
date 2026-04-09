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
        process.env.RAILWAY_STATIC_URL, // Railway frontend if applicable
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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/health', require('./routes/health'));

module.exports = app;
