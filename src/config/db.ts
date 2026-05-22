import mongoose from 'mongoose';
const { MongoMemoryServer } = require('mongodb-memory-server');

export const connectDB = async () => {
  try {
    let uri = process.env.MONGODB_URI as string;
    if (uri === 'memory') {
      const mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
      console.log('Using MongoDB Memory Server');
    }
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};
