import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/server/db";
import User from "@/server/models/User";
import Assignment from "@/server/models/Assignment";
import Task from "@/server/models/Task";
import WorkLog from "@/server/models/WorkLog";
import AdminMicroTask from "@/server/models/AdminMicroTask";
import ActivityLog from "@/server/models/ActivityLog";
import { verifyToken } from "@/server/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return verifyToken(authHeader.slice(7));
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const auth = getAuth(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, message: "No token provided" },
        { status: 401 }
      );
    }

    const user = await User.findById(auth.userId).lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Calculate total tasks from different sources (Assignments, Work Logs, Micro Tasks)
    const [assignmentTasks, workLogTasksResult, adminMicroTasksCount] = await Promise.all([
      (async () => {
        const userAssignments = await Assignment.find({ assignedTo: auth.userId }).select("_id");
        return Task.countDocuments({ 
          assignmentId: { $in: userAssignments.map(a => a._id) },
          status: "completed"
        });
      })(),
      WorkLog.aggregate([
        { $match: { userId: new Types.ObjectId(auth.userId), state: { $in: ["submitted", "auto_submitted"] } } },
        { $unwind: "$tasks" },
        { $match: { "tasks.status": "completed" } },
        { $count: "count" }
      ]),
      AdminMicroTask.countDocuments({ submittedBy: auth.userId })
    ]);

    const totalTasks = assignmentTasks + (workLogTasksResult[0]?.count || 0) + adminMicroTasksCount;

    return NextResponse.json(
      {
        success: true,
        message: "Profile retrieved",
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          team: user.team,
          isActive: user.isActive,
          joinedAt: user.joinedAt,
          totalLogs: user.totalLogs || 0,
          totalTasks: totalTasks || 0,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Profile error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const auth = getAuth(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, message: "No token provided" },
        { status: 401 }
      );
    }

    const { name, team, email } = await request.json();
    
    const user = await User.findByIdAndUpdate(
      auth.userId, 
      { name, team, email }, 
      { new: true, runValidators: true }
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Log activity
    try {
      await ActivityLog.create({
        userId: auth.userId,
        action: "update_user",
        resourceType: "user",
        resourceId: auth.userId,
        details: { name: user.name, email: user.email },
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
        timestamp: new Date(),
      });
    } catch (e) {
      console.error("Activity logging error:", e);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Profile updated successfully",
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          team: user.team,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Profile update error:", error);
    
    // Handle duplicate email error
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: "Email already in use" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update profile", error: error.message },
      { status: 500 }
    );
  }
}
