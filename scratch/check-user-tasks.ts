import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/server/db';
import Assignment from '../src/server/models/Assignment';
import Task from '../src/server/models/Task';
import User from '../src/server/models/User';

async function debug() {
  try {
    await connectDB();
    const assignments = await Assignment.find().lean();
    for (const a of assignments) {
      const user = await User.findById(a.assignedTo);
      const tasks = await Task.find({ assignmentId: a._id, status: "completed" });
      console.log(`User: ${user?.name} | Assignment: ${a.title} | Completed Tasks: ${tasks.length}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
debug();
