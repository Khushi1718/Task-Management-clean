import { NextRequest, NextResponse } from "next/server";
import { isCloudinaryConfigured, getCloudinary } from "@/server/cloudinary";

export async function GET() {
  try {
    const isConfigured = isCloudinaryConfigured();
    
    if (!isConfigured) {
      return NextResponse.json({ 
        success: false, 
        message: "Cloudinary is not configured on the server." 
      }, { status: 503 });
    }

    // Try to ping Cloudinary
    const cloudinary = getCloudinary();
    // This is a simple way to test the connection without uploading anything
    const result = await cloudinary.api.ping();

    return NextResponse.json({ 
      success: true, 
      message: "Cloudinary is correctly configured and reachable.",
      details: result
    });
  } catch (error: any) {
    console.error("Cloudinary Health Check Error:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Cloudinary configuration is invalid or unreachable.",
      error: error.message
    }, { status: 500 });
  }
}
