import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/server/db';
import Assignment from '../src/server/models/Assignment';
import Task from '../src/server/models/Task';

async function debug() {
  try {
    await connectDB();
    const aCount = await Assignment.countDocuments();
    const tCount = await Task.countDocuments();
    console.log(`Total Assignments: ${aCount}`);
    console.log(`Total Tasks: ${tCount}`);
    
    const completedTasks = await Task.countDocuments({ status: "completed" });
    console.log(`Completed Tasks: ${completedTasks}`);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
debug();
