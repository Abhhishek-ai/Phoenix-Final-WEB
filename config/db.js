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
  const mongoURI = process.env.MONGO_URI;

  if (!mongoURI) {
    const errMsg = '[Database Error] MONGO_URI is not defined in environment variables.';
    console.error(errMsg);
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      throw new Error(errMsg);
    }
    process.exit(1);
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`[Database] MongoDB Connected successfully to '${conn.connection.name}' at ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      throw error;
    }
    process.exit(1);
  }
};

module.exports = connectDB;
