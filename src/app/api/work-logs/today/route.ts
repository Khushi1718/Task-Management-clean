import { NextRequest, NextResponse } from "next/server";
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

function ok(message: string, data?: any, status = 200) {
  return NextResponse.json({ success: true, message, data }, { status });
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const auth = getAuth(request);
    if (!auth) return fail(401, "Unauthorized");

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();
    
    const start = new Date(year, month, day, 0, 0, 0);
    start.setHours(start.getHours() - 12); // Timezone buffer
    const end = new Date(year, month, day, 23, 59, 59);
    end.setHours(end.getHours() + 12); // Timezone buffer

    const log = await WorkLog.findOne({
      userId: auth.userId,
      date: { $gte: start, $lte: end }
    }).lean();

    return ok("Today's log retrieved", log);
  } catch (error: any) {
    console.error("GET /work-logs/today error:", error);
    return fail(500, "Internal Server Error");
  }
}
