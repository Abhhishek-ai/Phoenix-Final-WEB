const session = require('express-session');
const MongoStore = require('connect-mongo');

/**
 * Configure express-session with connect-mongo storage
 * Stores only minimal session identifiers (e.g. req.session.userId)
 */
const sessionDays = parseInt(process.env.SESSION_MAX_AGE_DAYS, 10) || 7;
const maxAgeMs = 1000 * 60 * 60 * 24 * sessionDays;

const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

const storeOption = mongoURI
  ? MongoStore.create({
      mongoUrl: mongoURI,
      collectionName: 'sessions',
      ttl: sessionDays * 24 * 60 * 60, // in seconds
      autoRemove: 'native'
    })
  : new session.MemoryStore();

const sessionConfig = session({
  name: 'phoenix.sid',
  secret: process.env.SESSION_SECRET || 'phoenix_mbm_secure_session_secret_key_2026',
  resave: false,
  saveUninitialized: false,
  store: storeOption,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: maxAgeMs,
    sameSite: 'lax'
  }
});

module.exports = sessionConfig;
