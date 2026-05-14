import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/server/db';
import WorkLog from '../src/server/models/WorkLog';
import User from '../src/server/models/User';

async function debug() {
  try {
    await connectDB();
    console.log("Connected to MongoDB");

    const users = await User.find({ team: /SEO/i });
    console.log(`Found ${users.length} users in SEO department (case-insensitive search)`);
    
    for (const user of users) {
      const logs = await WorkLog.find({ userId: user._id });
      const submittedLogs = logs.filter(l => ["submitted", "auto_submitted"].includes(l.state));
      
      let totalTasks = 0;
      submittedLogs.forEach(log => {
        totalTasks += log.tasks?.filter((t: any) => t.status === "completed").length || 0;
      });

      console.log(`User: ${user.name} (${user.email})`);
      console.log(` - Team in DB: "${user.team}"`);
      console.log(` - Total Logs: ${logs.length}`);
      console.log(` - Submitted Logs: ${submittedLogs.length}`);
      console.log(` - Completed Tasks: ${totalTasks}`);
    }

  } catch (err) {
    console.error("DEBUG ERROR:", err);
  } finally {
    process.exit(0);
  }
}

debug();
