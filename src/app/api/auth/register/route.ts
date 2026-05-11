import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import User from "@/server/models/User";
import ActivityLog from "@/server/models/ActivityLog";
import { verifyToken } from "@/server/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return verifyToken(authHeader.slice(7));
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const auth = getAuth(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, message: "No token provided" },
        { status: 401 }
      );
    }

    const { name, email, password, team, role: targetRole } = await request.json();
    if (!name || !email || !password || !team) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    // Role-based creation logic
    if (auth.role === "admin") {
      if (targetRole !== "employee") {
        return NextResponse.json(
          { success: false, message: "Admins can only create Employee accounts" },
          { status: 403 }
        );
      }
    } else if (auth.role !== "master_admin") {
      return NextResponse.json(
        { success: false, message: "Only Admins and Master Admins can create users" },
        { status: 403 }
      );
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Email already registered" },
        { status: 400 }
      );
    }

    const user = await User.create({
      name,
      email,
      password,
      team,
      role: ["admin", "employee"].includes(targetRole) ? targetRole : "employee",
    });

    try {
      await ActivityLog.create({
        userId: auth.userId,
        action: "create_user",
        resourceType: "user",
        resourceId: user._id.toString(),
        details: { name: user.name, role: user.role },
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
        message: "User created successfully",
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
