const mongoose = require('mongoose');
const dns = require('dns');

// Configure public DNS resolvers to prevent ECONNREFUSED on SRV lookups on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (err) {
  // Ignore if custom DNS cannot be set
}

/**
 * Connect to MongoDB database using Mongoose
 * MongoDB URI is loaded from process.env.MONGO_URI
 */
const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoURI) {
    console.warn('[Database] MONGO_URI is not defined. Running frontend-only mode without MongoDB.');
    return null;
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`[Database] MongoDB Connected successfully to '${conn.connection.name}' at ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`[Database Warning] Failed to connect to MongoDB (${error.message}). Continuing in fallback mode.`);
    return null;
  }
};

module.exports = connectDB;
