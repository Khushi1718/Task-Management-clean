import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/server/db';
import User from '../src/server/models/User';
import AdminMicroTask from '../src/server/models/AdminMicroTask';

async function debug() {
  try {
    await connectDB();
    const userId = "6a0314e25a82dcad85a1d176";
    const user = await User.findById(userId);
    console.log("User found:", {
      id: user?._id,
      name: user?.name,
      role: user?.role,
      team: user?.team
    });

    const microTasks = await AdminMicroTask.find({ submittedBy: new mongoose.Types.ObjectId(userId) });
    console.log("MicroTasks count for user:", microTasks.length);
    if (microTasks.length > 0) {
      console.log("Sample MicroTask:", {
        id: microTasks[0]._id,
        title: microTasks[0].title,
        status: microTasks[0].status
      });
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
debug();
