import * as dotenv from "dotenv";
dotenv.config();
import { connectDB } from "../src/server/db";

import User from "../src/server/models/User";
import mongoose from "mongoose";

async function checkUsers() {
  try {
    await connectDB();
    const users = await User.find({}, "email role name");
    console.log("Current Users in DB:");
    console.log(JSON.stringify(users, null, 2));
    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}

checkUsers();
