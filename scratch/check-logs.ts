import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/server/db';
import WorkLog from '../src/server/models/WorkLog';

async function debug() {
  try {
    await connectDB();
    const count = await WorkLog.countDocuments();
    console.log(`Total WorkLogs in DB: ${count}`);
    
    if (count > 0) {
      const all = await WorkLog.find().limit(5).lean();
      console.log("Sample Logs:", JSON.stringify(all, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
debug();
