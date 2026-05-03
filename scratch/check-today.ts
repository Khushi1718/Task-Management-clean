import * as dotenv from "dotenv";
dotenv.config();
import { connectDB } from "../src/server/db";
import Assignment from "../src/server/models/Assignment";
import Task from "../src/server/models/Task";
import WorkLog from "../src/server/models/WorkLog";
import mongoose from "mongoose";

async function checkTodayData() {
  try {
    await connectDB();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log("Checking data for today (GTE):", today.toISOString());

    const assignments = await Assignment.find({ createdAt: { $gte: today } });
    console.log(`Found ${assignments.length} assignments created today.`);
    
    for (const a of assignments) {
      const tasks = await Task.find({ assignmentId: a._id });
      console.log(`Assignment "${a.title}" has ${tasks.length} tasks.`);
      console.log(JSON.stringify(tasks, null, 2));
    }

    const logs = await WorkLog.find({ date: { $gte: today } });
    console.log(`Found ${logs.length} work logs for today.`);
    
    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}

checkTodayData();
