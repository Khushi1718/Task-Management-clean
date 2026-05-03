import mongoose from 'mongoose';
import Assignment from "../src/server/models/Assignment.ts";
import Task from "../src/server/models/Task.ts";
import User from "../src/server/models/User.ts";
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/workflow-pro";

async function test() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to DB");
  
  const user = await User.findOne({ role: 'employee' });
  const admin = await User.findOne({ role: 'admin' });
  
  if (!user || !admin) {
    console.error("Could not find test users");
    process.exit(1);
  }
  
  try {
    const assignment = await Assignment.create({
      assignedBy: admin._id,
      assignedTo: user._id,
      title: "Test Assignment",
      priority: "medium",
      status: "pending",
    });
    console.log("Assignment created:", assignment._id);
    
    const task = await Task.create({
      assignmentId: assignment._id,
      title: "Test Task",
      description: "Test Description",
      deadline: new Date(),
      status: "pending",
      timeSpent: 0
    });
    console.log("Task created:", task._id);
    
    await Assignment.deleteOne({ _id: assignment._id });
    await Task.deleteOne({ _id: task._id });
    console.log("Test cleanup done");
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

test();
