import mongoose from "mongoose";
import { connectDB } from "./db";
import User from "./models/User";
import * as dotenv from "dotenv";

dotenv.config();

async function createMasterAdmin() {
  try {
    await connectDB();
    
    const email = "master@google.com";
    const password = "password123";
    
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      console.log(`User ${email} already exists. Updating role to master_admin...`);
      existingUser.role = "master_admin";
      await existingUser.save();
      console.log("Role updated successfully.");
    } else {
      console.log(`Creating new Master Admin: ${email}`);
      await User.create({
        name: "Super Admin",
        email: email,
        password: password,
        role: "master_admin",
        team: "Executive",
        isActive: true,
      });
      console.log("Master Admin created successfully.");
    }

    console.log("-----------------------------------");
    console.log("Login Credentials:");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log("Role: Master Admin");
    console.log("-----------------------------------");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error creating master admin:", error);
    process.exit(1);
  }
}

createMasterAdmin();
