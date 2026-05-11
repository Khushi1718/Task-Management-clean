import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import User from "@/server/models/User";
import { generateToken } from "@/server/jwt";
import ActivityLog from "@/server/models/ActivityLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isPasswordValid = await user.matchPassword(password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = generateToken(user._id.toString(), user.role);

    // Log activity
    try {
      await ActivityLog.create({
        userId: user._id.toString(),
        action: "login",
        resourceType: "user",
        details: {},
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
        message: "Login successful",
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            team: user.team,
            isActive: user.isActive,
            joinedAt: user.joinedAt,
            totalLogs: user.totalLogs || 0,
          },
          token,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
