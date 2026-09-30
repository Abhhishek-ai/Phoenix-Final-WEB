require('dotenv').config();
const dns = require('dns');

// Configure public DNS resolvers to handle SRV record lookups on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (err) {
  // Ignore fallback if custom DNS cannot be set
}

const http = require('http');
const path = require('path');
const express = require('express');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const sessionMiddleware = require('./config/session');

// Import routes and middleware
const indexRoutes = require('./routes/index');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const projectRoutes = require('./routes/projectRoutes');
const bidRoutes = require('./routes/bidRoutes');
const deliverableRoutes = require('./routes/deliverableRoutes');
const portfolioRoutes = require('./routes/portfolioRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const chatRoutes = require('./routes/chatRoutes');
const Notification = require('./models/Notification');
const { loadUser } = require('./middleware/auth');

// Initialize Express App
const app = express();
const server = http.createServer(app);

// Initialize Socket.io (Ready for realtime features)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Attach Socket.io instance to app for global availability in controllers/routes
app.set('io', io);

// Connect to MongoDB and auto-seed initial admins & skills
connectDB()
  .then(async () => {
    try {
      const { seedAdmins } = require('./seed/admins');
      const { seedSkills } = require('./seed/skills');
      await seedAdmins();
      await seedSkills();
    } catch (seedErr) {
      console.warn('[Auto-Seed] Note:', seedErr.message);
    }
  })
  .catch((err) => {
    console.error('[DB Connection Error]:', err.message);
  });

// Ensure DB connection is attempted non-blocking for every request
app.use(async (req, res, next) => {
  try {
    await connectDB();
  } catch (err) {
    // Non-blocking fallback
  }
  next();
});

// View Engine Setup (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static Files (with HTTP caching for optimized performance)
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : '1h',
  etag: true
}));

// Request Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Method Override for RESTful methods (PUT, DELETE via forms)
app.use(methodOverride('_method'));

// Session Middleware (with connect-mongo)
app.use(sessionMiddleware);

// Flash Messages Middleware
app.use(flash());

// Load Authenticated User from Database (Global Middleware)
app.use(loadUser);

// Global Template Locals (Available to all EJS templates)
app.use(async (req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.warning_msg = req.flash('warning_msg');
  res.locals.info_msg = req.flash('info_msg');
  res.locals.user = req.user || null;
  res.locals.currentUser = req.user || null;

  // Unread notifications count
  if (req.user && req.user._id) {
    try {
      res.locals.unreadNotifsCount = await Notification.countDocuments({
        recipientId: req.user._id,
        isRead: false
      });
    } catch (_) {
      res.locals.unreadNotifsCount = 0;
    }
  } else {
    res.locals.unreadNotifsCount = 0;
  }

  next();
});

// Mount Routes
app.use('/health', healthRoutes);
app.use('/admin', adminRoutes);
app.use('/', projectRoutes);
app.use('/', bidRoutes);
app.use('/', deliverableRoutes);
app.use('/', portfolioRoutes);
app.use('/', reviewRoutes);
app.use('/', notificationRoutes);
app.use('/', chatRoutes);
app.use('/', authRoutes);
app.use('/', indexRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).render('public/index', {
    title: '404 - Page Not Found | PHOENIX',
    activePage: ''
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Application Error]:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: {
      message: err.message || 'Internal Server Error',
      status
    }
  });
});

// Socket.io Connection Handler
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // Join project assignment chat room
  socket.on('join_assignment', (roomName) => {
    socket.join(roomName);
    console.log(`[Socket.io] Socket ${socket.id} joined room: ${roomName}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// Start Server if executed directly
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`[PHOENIX Server] Running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
  });
}

module.exports = { app, server, io };
