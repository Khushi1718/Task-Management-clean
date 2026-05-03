import mongoose from "mongoose";
import { connectDB } from "../src/server/db";
import User from "../src/server/models/User";
import Project from "../src/server/models/Project";
import * as dotenv from "dotenv";

dotenv.config();

async function verify() {
  try {
    await connectDB();
    console.log("Database connected successfully.");

    const users = await User.find({});
    console.log(`Users count: ${users.length}`);
    users.forEach(u => console.log(` - ${u.email} (${u.role})`));

    const projects = await Project.find({});
    console.log(`Projects count: ${projects.length}`);
    projects.forEach(p => console.log(` - ${p.name}`));

    if (users.length >= 2 && projects.length >= 1) {
      console.log("\nBasic data verification PASSED.");
    } else {
      console.log("\nBasic data verification FAILED.");
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Verification error:", error);
    process.exit(1);
  }
}

verify();
