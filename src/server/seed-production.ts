import mongoose from "mongoose";
import { connectDB } from "./db";
import User from "./models/User";
import Project from "./models/Project";
import * as dotenv from "dotenv";

dotenv.config();

async function seedProduction() {
  try {
    console.log("Starting production database seed...");

    await connectDB();
    const maskedUri = (process.env.MONGODB_URI || "").replace(/:([^@]+)@/, ":****@");
    console.log(`Connected to: ${maskedUri}`);

    // 1. Create Master Admin
    const masterEmail = "master@google.com";
    const masterPassword = "password123"; // Recommendation: Change this immediately
    
    const existingMaster = await User.findOne({ email: masterEmail });
    if (!existingMaster) {
      console.log(`Creating Master Admin: ${masterEmail}`);
      await User.create({
        name: "Super Admin",
        email: masterEmail,
        password: masterPassword,
        role: "master_admin",
        team: "Executive",
        isActive: true,
      });
    } else {
      console.log(`Master Admin ${masterEmail} already exists. Syncing role and password...`);
      existingMaster.role = "master_admin";
      existingMaster.password = masterPassword;
      await existingMaster.save();
    }


    // 2. Create a default Admin
    const adminEmail = "admin@google.com";
    const adminPassword = "password123";
    
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      console.log(`Creating Admin: ${adminEmail}`);
      await User.create({
        name: "Management Admin",
        email: adminEmail,
        password: adminPassword,
        role: "admin",
        team: "Management",
        isActive: true,
      });
    } else {
      console.log(`Admin ${adminEmail} already exists. Syncing role and password...`);
      existingAdmin.role = "admin";
      existingAdmin.password = adminPassword;
      await existingAdmin.save();
    }


    // 3. Create a default Project
    const master = await User.findOne({ role: "master_admin" });
    const defaultProjectName = "Internal Operations";
    
    const existingProject = await Project.findOne({ name: defaultProjectName });
    if (!existingProject && master) {
      console.log(`Creating default project: ${defaultProjectName}`);
      await Project.create({
        name: defaultProjectName,
        description: "Standard project for internal workflow and operations management.",
        status: "active",
        createdBy: master._id,
        members: [master._id],
      });
    }

    console.log("\n-----------------------------------");
    console.log("Production Seed Successful");
    console.log("-----------------------------------");
    console.log("Master Admin Login:");
    console.log(`Email: ${masterEmail}`);
    console.log(`Password: ${masterPassword}`);
    console.log("\nAdmin Login:");
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log("-----------------------------------");
    console.log("IMPORTANT: Please change these passwords after first login.");
    console.log("-----------------------------------\n");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Production Seed Error:", error);
    process.exit(1);
  }
}

seedProduction();
