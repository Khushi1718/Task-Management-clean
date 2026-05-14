import mongoose from 'mongoose';
import { connectDB } from './src/server/db.js';
import WorkLog from './src/server/models/WorkLog.js';
import User from './src/server/models/User.js';

async function debug() {
  await connectDB();
  console.log("Connected to DB");
  
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log("Collections:", collections.map(c => c.name));
  
  const logCount = await WorkLog.countDocuments();
  console.log("Total WorkLogs:", logCount);
  
  const submittedLogs = await WorkLog.find({ state: { $in: ["submitted", "auto_submitted"] } });
  console.log("Submitted WorkLogs:", submittedLogs.length);
  
  if (submittedLogs.length > 0) {
    const firstLog = submittedLogs[0];
    console.log("First Log Sample:", {
      userId: firstLog.userId,
      tasksCount: firstLog.tasks.length,
      completedTasks: firstLog.tasks.filter(t => t.status === "completed").length,
      state: firstLog.state
    });
    
    const user = await User.findById(firstLog.userId);
    console.log("Log User:", user ? user.name : "Not Found");
  }

  process.exit(0);
}

debug();
