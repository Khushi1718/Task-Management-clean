import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/server/db";
import User from "@/server/models/User";
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
  if (!data) return {};
  return {
    backlinks: Number(data.backlinks) || 0,
    submissions: Number(data.submissions) || 0,
    guestPosts: Number(data.guestPosts) || 0,
    articles: Number(data.articles) || 0,
    others: Number(data.others) || 0,
  };
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const auth = getAuth(request);
    if (!auth) return fail(401, "Unauthorized");

    const body = await request.json();
    const {
      title,
      tasks,
      meetingsAttended,
      focusForTomorrow,
      status,
      date,
      meetingNotes,
      attachments,
      seoData,
    } = body;

    if (!title || !date) {
      return fail(400, "Title and date are required");
    }

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return fail(400, "At least one task is required");
    }

    const logDate = new Date(date);
    const dayStart = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate(), 0, 0, 0);
    const dayEnd = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate(), 23, 59, 59);

    const existingLog = await WorkLog.findOne({
      userId: auth.userId,
      date: { $gte: dayStart, $lte: dayEnd }
    });

    if (existingLog) {
      if (existingLog.state !== "draft") {
        return fail(400, `Cannot modify a ${existingLog.state} log`);
      }

      existingLog.title = title;
      existingLog.tasks = tasks;
      existingLog.meetingsAttended = meetingsAttended || existingLog.meetingsAttended;
      existingLog.focusForTomorrow = focusForTomorrow || existingLog.focusForTomorrow;
      existingLog.status = status || existingLog.status;
      existingLog.meetingNotes = meetingNotes || existingLog.meetingNotes;
      if (attachments) existingLog.attachments = attachments;
      if (seoData !== undefined) existingLog.seoData = normalizeSeoData(seoData);

      await existingLog.save();

      try {
        await ActivityLog.create({
          userId: auth.userId,
          action: "update_log",
          resourceType: "worklog",
          resourceId: existingLog._id.toString(),
          ipAddress: request.headers.get("x-forwarded-for") || "unknown",
          userAgent: request.headers.get("user-agent") || "unknown",
          timestamp: new Date(),
        });
      } catch (e) {}

      return ok("Work log updated successfully", existingLog);
    }

    const workLog = await WorkLog.create({
      userId: auth.userId,
      title,
      tasks,
      meetingsAttended: meetingsAttended || 0,
      focusForTomorrow,
      status: status || "completed",
      date: dayStart,
      meetingNotes,
      attachments: attachments || [],
      seoData: normalizeSeoData(seoData),
      state: "draft",
    });

    try {
      await ActivityLog.create({
        userId: auth.userId,
        action: "create_log",
        resourceType: "worklog",
        resourceId: workLog._id.toString(),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
        timestamp: new Date(),
      });
      await User.findByIdAndUpdate(auth.userId, { $inc: { totalLogs: 1 } });
    } catch (e) {}

    return ok("Work log created successfully", workLog, 201);
  } catch (error: any) {
    console.error("POST /work-logs error:", error);
    return fail(500, "Internal Server Error");
  }
}
