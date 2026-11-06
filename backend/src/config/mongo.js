const mongoose = require('mongoose');

const connectMongo = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://mongouser:mongopass@localhost:27017/queue_logs?authSource=admin';

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
    });

    console.log('[MongoDB] Connected successfully');

    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Disconnected');
    });
  } catch (err) {
    console.warn(`[MongoDB] Could not connect to external MongoDB (${err.message}). Using in-memory activity log store.`);
    const ActivityLog = require('../models/ActivityLog');
    const inMemoryLogs = [];

    ActivityLog.create = async (doc) => {
      const entry = {
        _id: 'mock_' + (inMemoryLogs.length + 1),
        ...doc,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryLogs.unshift(entry);
      return entry;
    };

    ActivityLog.countDocuments = async () => inMemoryLogs.length;
    ActivityLog.find = () => {
      let skipped = 0;
      let limitCount = inMemoryLogs.length;
      const query = {
        sort: () => query,
        skip: (n) => { skipped = n; return query; },
        limit: (n) => { limitCount = n; return query; },
        lean: async () => inMemoryLogs.slice(skipped, skipped + limitCount),
      };
      return query;
    };
  }
};

module.exports = { connectMongo };
