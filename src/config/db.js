const mongoose = require('mongoose');

const connectDB = async () => {
  // Prefer MONGO_URI (Render's default name) then MONGODB_URI
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('No MongoDB URI set (MONGO_URI or MONGODB_URI)');
  const conn = await mongoose.connect(uri);
  console.log(`MongoDB connected: ${conn.connection.host}`);
};

module.exports = connectDB;
