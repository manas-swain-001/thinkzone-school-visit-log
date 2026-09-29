import mongoose from 'mongoose';
import config from './env.js';

mongoose.set('strictQuery', true);

export async function connectDatabase(uri = config.mongoUri) {
  await mongoose.connect(uri, {
    // Fail fast rather than hanging for 30s if MongoDB is not running.
    serverSelectionTimeoutMS: 5000,
  });
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

export default connectDatabase;
