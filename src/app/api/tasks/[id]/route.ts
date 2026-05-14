import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import User from "@/server/models/User";
import Assignment from "@/server/models/Assignment";
import Task from "@/server/models/Task";
import ActivityLog from "@/server/models/ActivityLog";
import { verifyToken } from "@/server/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return verifyToken(authHeader.slice(7));
}

function fail(status: number, message: string) {
  return NextResponse.json({ success: false, message }, { status });
}

function ok(message: string, data?: any, status = 200) {
  return NextResponse.json({ success: true, message, data }, { status });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const auth = getAuth(request);
    if (!auth) return fail(401, "Unauthorized");

    const taskId = params.id;
    const task = await Task.findById(taskId)
      .populate("assignedBy", "name email role")
      .populate("assignedTo", "name email role")
      .lean();

    if (!task) return fail(404, "Task not found");
    return ok("Task retrieved successfully", task);
  } catch (error: any) {
    console.error("GET /tasks/[id] error:", error);
    return fail(500, "Internal Server Error");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const auth = getAuth(request);
    if (!auth) return fail(401, "Unauthorized");

    const taskId = params.id;
    const task = await Task.findById(taskId);
    if (!task) return fail(404, "Task not found");

    const assignment = await Assignment.findById(task.assignmentId).lean();
    if (!assignment) return fail(404, "Parent assignment not found");

    const isAssignee = assignment.assignedTo.toString() === auth.userId;
    const isAssigner = assignment.assignedBy.toString() === auth.userId;
    const isMasterAdmin = auth.role === "master_admin";

    if (!isAssignee && !isAssigner && !isMasterAdmin) {
      return fail(403, "Not authorized to update this task");
    }

    const body = await request.json();
    const { status, remarks, evidence, completionRemarks, evidenceFiles } = body;
    
    if (status) task.status = status;
    if (remarks !== undefined) task.remarks = remarks;
    if (evidence !== undefined) task.evidence = evidence;
    if (completionRemarks !== undefined) task.completionRemarks = completionRemarks;
    if (evidenceFiles !== undefined) task.evidenceFiles = evidenceFiles;

    if (status === "completed") {
      task.completedAt = new Date();
      if (task.timerStartedAt) {
        const now = new Date();
        const diff = Math.floor((now.getTime() - task.timerStartedAt.getTime()) / 1000);
        task.timeSpent += diff;
        task.timerStartedAt = undefined;
      }
    }

    await task.save();

    try {
      await ActivityLog.create({
        userId: auth.userId,
        action: "update_task",
        resourceType: "task",
        resourceId: task._id.toString(),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
        timestamp: new Date(),
      });
    } catch (e) {}

    return ok("Task updated successfully", task);
  } catch (error: any) {
    console.error("PUT /tasks/[id] error:", error);
    return fail(500, "Internal Server Error");
  }
}
