require('dotenv').config();
const { createServer } = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const setupSocket = require('./socket');

const CORS_ORIGINS = [
  'capacitor://localhost',
  'http://localhost',
  'http://localhost:8100',
  'http://localhost:4200',
  process.env.RENDER_EXTERNAL_URL,
].filter(Boolean);

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: CORS_ORIGINS, credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Attach io to every request so controllers can emit events
app.use((req, _res, next) => {
  req.io = io;
  next();
});

setupSocket(io);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
