import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import Assignment from "@/server/models/Assignment";
import Task from "@/server/models/Task";
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
    if (assignment?.assignedTo.toString() !== auth.userId) {
      return fail(403, "Only the assigned personnel can track time for this task.");
    }

    const body = await request.json();
    const { action } = body;

    if (action === "start") {
      if (task.status === "completed") return fail(400, "Cannot track time for completed task");
      task.timerStartedAt = new Date();
      task.status = "in_progress";
    } else if (action === "stop") {
      if (!task.timerStartedAt) return fail(400, "Timer not running");
      const now = new Date();
      const diff = Math.floor((now.getTime() - task.timerStartedAt.getTime()) / 1000);
      task.timeSpent = (task.timeSpent || 0) + diff; // Fixed the bug here
      task.timerStartedAt = undefined;
    } else {
        return fail(400, "Invalid action");
    }

    await task.save();
    return ok(`Timer ${action}ed`, task);
  } catch (error: any) {
    console.error("PUT /tasks/[id]/timer error:", error);
    return fail(500, "Internal Server Error");
  }
}
