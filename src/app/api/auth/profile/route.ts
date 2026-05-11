import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import User from "@/server/models/User";
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
