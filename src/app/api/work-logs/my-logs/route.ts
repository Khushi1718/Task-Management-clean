import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/server/db";
import WorkLog from "@/server/models/WorkLog";
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

function ok(message: string, data?: any, status = 200, meta?: any) {
  return NextResponse.json({ success: true, message, data, ...meta }, { status });
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const auth = getAuth(request);
    if (!auth) return fail(401, "Unauthorized");

    const query = request.nextUrl.searchParams;
    const limitNum = Math.min(Math.max(parseInt(query.get("limit") || "20"), 1), 100);
    const skipNum = Math.max(parseInt(query.get("skip") || "0"), 0);
    
    const filter: any = { userId: new Types.ObjectId(auth.userId) };
    const startDate = query.get("startDate");
    const endDate = query.get("endDate");
    const status = query.get("status");
    const submittedOnly = query.get("submittedOnly") === "true";

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    if (status) filter.status = status;
    if (submittedOnly) {
      filter.state = { $in: ["submitted", "auto_submitted"] };
    }

    const [logs, total] = await Promise.all([
      WorkLog.find(filter).sort({ date: -1 }).limit(limitNum).skip(skipNum).lean(),
      WorkLog.countDocuments(filter)
    ]);

    return ok("Logs retrieved successfully", logs, 200, {
      total,
      limit: limitNum,
      skip: skipNum,
    });
  } catch (error: any) {
    console.error("GET /work-logs/my-logs error:", error);
    return fail(500, "Internal Server Error");
  }
}
