import mongoose from "mongoose";
import { connectDB } from "./db";
import User from "./models/User";
import WorkLog from "./models/WorkLog";
import * as dotenv from "dotenv";

dotenv.config();


async function seedDatabase() {
  try {
    console.log("Starting database seed...");

    await connectDB();
    const maskedUri = (process.env.MONGODB_URI || "").replace(/:([^@]+)@/, ":****@");
    console.log(`Connected to: ${maskedUri}`);

    console.log("Clearing existing data...");
    await User.deleteMany({});
    await WorkLog.deleteMany({});

    console.log("Creating test users...");

    const adminUser = await User.create({
      name: "Admin User",
      email: "admin@google.com",
      password: "password123",
      role: "admin",
      team: "Management",
      isActive: true,
    });

    const employeeUser = await User.create({
      name: "Ms. Khushi",
      email: "khushi@google.com",
      password: "password123",
      role: "employee",
      team: "Development",
      isActive: true,
    });

    const employeeUser2 = await User.create({
      name: "John Doe",
      email: "john@google.com",
      password: "password123",
      role: "employee",
      team: "Design",
      isActive: true,
    });

    console.log(`Admin created: ${adminUser.email}`);
    console.log(`Employee created: ${employeeUser.email}`);
    console.log(`Employee created: ${employeeUser2.email}`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sampleLogs = [
      {
        userId: employeeUser._id,
        title: "Database Optimization",
        tasks: [
          { id: "task_1", text: "Optimize MongoDB queries", status: "completed", priority: "high", notes: "Achieved 40% faster query execution" },
          { id: "task_2", text: "Add proper indexing", status: "completed", priority: "high", notes: "Indexes created for frequently accessed fields" },
        ],
        meetingsAttended: 2,
        focusForTomorrow: "Complete API authentication module",
        status: "completed",
        date: new Date(today),
        meetingNotes: "Performance review meeting successful",
        attachments: [],
      },
      {
        userId: employeeUser._id,
        title: "Bug Fixes and Testing",
        tasks: [
          { id: "task_3", text: "Fix authentication flow bugs", status: "completed", priority: "high", notes: "5 critical bugs fixed" },
          { id: "task_4", text: "Add test coverage", status: "completed", priority: "medium", notes: "Comprehensive test suite added" },
        ],
        meetingsAttended: 1,
        focusForTomorrow: "Implement notification system",
        status: "completed",
        date: new Date(new Date(today).getTime() - 24 * 60 * 60 * 1000), // Yesterday
        attachments: [],
      },
      {
        userId: employeeUser2._id,
        title: "UI Component Development",
        tasks: [
          { id: "task_5", text: "Create reusable UI components", status: "completed", priority: "high", notes: "8 components with accessibility support" },
          { id: "task_6", text: "Document component usage", status: "completed", priority: "medium", notes: "Storybook documentation complete" },
        ],
        meetingsAttended: 1,
        focusForTomorrow: "Design system documentation",
        status: "completed",
        date: new Date(today),
        attachments: [],
      },
      {
        userId: employeeUser._id,
        title: "API Development",
        tasks: [
          { id: "task_7", text: "Develop REST APIs", status: "completed", priority: "high", notes: "Work log management APIs complete" },
          { id: "task_8", text: "Add validation and error handling", status: "in_progress", priority: "high", notes: "In progress" },
        ],
        meetingsAttended: 0,
        focusForTomorrow: "Add caching layer",
        status: "in_progress",
        date: new Date(new Date(today).getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        attachments: [],
      },
      {
        userId: employeeUser2._id,
        title: "Design Review",
        tasks: [
          { id: "task_9", text: "Conduct design review", status: "completed", priority: "high", notes: "Team reviewed all designs" },
          { id: "task_10", text: "Update design guidelines", status: "completed", priority: "medium", notes: "Guidelines updated and documented" },
        ],
        meetingsAttended: 3,
        focusForTomorrow: "Create design specifications",
        status: "completed",
        date: new Date(new Date(today).getTime() - 24 * 60 * 60 * 1000), // Yesterday
        attachments: [],
      },
    ];

    await WorkLog.insertMany(sampleLogs);
    
    // Update user totalLogs counts based on seeded logs
    const userLogCounts = await WorkLog.aggregate([
      { $group: { _id: "$userId", count: { $sum: 1 } } }
    ]);
    
    for (const { _id, count } of userLogCounts) {
      await User.findByIdAndUpdate(_id, { totalLogs: count });
    }

    console.log("Database seeded successfully.");
    console.log("Admin: admin@google.com / password123");
    console.log("Employee: khushi@google.com / password123");
    console.log("Employee 2: john@google.com / password123");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seedDatabase();
