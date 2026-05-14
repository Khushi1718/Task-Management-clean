import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/server/db";
import WorkLog from "@/server/models/WorkLog";
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

function normalizeSeoData(data: any) {
  if (!data) return {
    questionsAnswered: 0,
    backlinksCreated: 0,
    proofs: []
  };
  return {
    questionsAnswered: Number(data.questionsAnswered) || 0,
    backlinksCreated: Number(data.backlinksCreated) || 0,
    proofs: Array.isArray(data.proofs) ? data.proofs : [],
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const auth = getAuth(request);
    if (!auth) return fail(401, "Unauthorized");

    const logId = params.id;
    let workLog;
    if (Types.ObjectId.isValid(logId)) {
      workLog = await WorkLog.findById(logId).populate("userId", "name email").lean();
    } else {
      workLog = await WorkLog.findOne({ id: logId }).populate("userId", "name email").lean();
    }

    if (!workLog) return fail(404, "Work log not found");

    if (workLog.userId._id.toString() !== auth.userId && auth.role !== "admin" && auth.role !== "master_admin") {
      return fail(403, "Access denied");
    }

    return ok("Work log retrieved", workLog);
  } catch (error: any) {
    console.error("GET /work-logs/[id] error:", error);
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

    const logId = params.id;
    const body = await request.json();

    let workLog;
    if (Types.ObjectId.isValid(logId)) {
      workLog = await WorkLog.findById(logId);
    } else {
      workLog = await WorkLog.findOne({ id: logId });
    }
    if (!workLog) return fail(404, "Work log not found");

    if (workLog.userId.toString() !== auth.userId && auth.role !== "admin" && auth.role !== "master_admin") {
      return fail(403, "Not authorized to update this log");
    }

    const updateData: Record<string, any> = {};
    const fields = ["title", "tasks", "status", "meetingsAttended", "focusForTomorrow", "meetingNotes", "attachments", "seoData"];
    fields.forEach((field) => {
      if (body[field] !== undefined && body[field] !== "") {
        updateData[field] = field === "seoData" ? normalizeSeoData(body[field]) : body[field];
      }
    });

    const updatedLog = await WorkLog.findByIdAndUpdate(workLog._id, updateData, {
      new: true,
      runValidators: true,
    });

    try {
      await ActivityLog.create({
        userId: auth.userId,
        action: "update_log",
        resourceType: "worklog",
        resourceId: updatedLog?._id.toString(),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
        timestamp: new Date(),
      });
    } catch (e) {}

    return ok("Work log updated successfully", updatedLog);
  } catch (error: any) {
    console.error("PUT /work-logs/[id] error:", error);
    return fail(500, "Internal Server Error");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const auth = getAuth(request);
    if (!auth) return fail(401, "Unauthorized");

    const logId = params.id;
    let workLog;
    if (Types.ObjectId.isValid(logId)) {
      workLog = await WorkLog.findById(logId);
    } else {
      workLog = await WorkLog.findOne({ id: logId });
    }
    
    if (!workLog) return fail(404, "Work log not found");

    if (workLog.userId.toString() !== auth.userId && auth.role !== "admin" && auth.role !== "master_admin") {
      return fail(403, "Not authorized to delete this log");
    }

    await WorkLog.findByIdAndDelete(workLog._id);

    try {
      await ActivityLog.create({
        userId: auth.userId,
        action: "delete_log",
        resourceType: "worklog",
        resourceId: workLog._id.toString(),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
        timestamp: new Date(),
      });
    } catch (e) {}

    return ok("Work log deleted successfully");
  } catch (error: any) {
    console.error("DELETE /work-logs/[id] error:", error);
    return fail(500, "Internal Server Error");
  }
}
