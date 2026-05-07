import { NextRequest, NextResponse } from "next/server";
import { uploadToCloudinary, isCloudinaryConfigured } from "@/server/cloudinary";
import { verifyToken } from "@/server/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;

// Helper for standardized responses
const ok = (message: string, data?: unknown, status = 200) =>
  NextResponse.json({ success: true, message, data }, { status });

const fail = (status: number, message: string, error?: unknown) =>
  NextResponse.json({ success: false, message, error: error || message }, { status });

const getUploadFailure = (error: any) => {
  const providerStatus = Number(error?.http_code) || 500;
  const rawMessage =
    (typeof error?.message === "string" && error.message) ||
    (typeof error?.error?.message === "string" && error.error.message) ||
    "Cloudinary upload failed.";

  // Use the provider's status if it's a client error (4xx), otherwise default to 502 for upstream issues.
  const status = providerStatus >= 400 && providerStatus < 500 ? providerStatus : 502;
  const message = rawMessage.includes("invalid JSON response")
    ? "Upload provider returned an invalid response. Verify Cloudinary credentials."
    : rawMessage;

  return { status, message };
};

export async function POST(request: NextRequest) {
  try {
    // 1. Auth Check
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return fail(401, "Authorization header missing");
    }
    try {
      verifyToken(authHeader.slice(7));
    } catch {
      return fail(401, "Invalid or expired token");
    }

    if (!isCloudinaryConfigured()) {
      return fail(
        503,
        "File uploads are not configured on the server.",
        "Missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET in the deployment environment."
      );
    }

    // 2. Parse Form Data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (e: any) {
      console.error("Upload FormData parse error:", e);
      return fail(400, "Failed to parse form data. Ensure you are sending multipart/form-data.");
    }

    const files = formData.getAll("files");
    if (!files || files.length === 0) {
      return fail(400, "No files found in the 'files' field.");
    }

    const uploadResults = [];

    for (const fileItem of files) {
      // Basic check if it's a file
      if (typeof fileItem === 'string' || !('arrayBuffer' in fileItem)) {
        continue;
      }

      const file = fileItem as File;

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return fail(
          413,
          `${file.name} is too large.`,
          `Maximum upload size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB per file.`
        );
      }
      
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const result: any = await uploadToCloudinary(buffer, file.name, file.type);
        
        uploadResults.push({
          id: result.public_id || `file_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          name: file.name,
          url: result.url,
          type: file.type
        });
      } catch (fileError: any) {
        console.error(`Error uploading ${file.name}:`, fileError);
        const uploadFailure = getUploadFailure(fileError);
        return fail(
          uploadFailure.status,
          `Failed to upload ${file.name}.`,
          uploadFailure.message
        );
      }
    }

    if (uploadResults.length === 0) {
      return fail(400, "No valid files were provided in the 'files' field.");
    }

    return ok("Upload successful", uploadResults.length === 1 ? uploadResults[0] : uploadResults);

  } catch (error: any) {
    console.error("Global Upload API Error:", error);
    return fail(500, "Internal Server Error during upload", error.message);
  }
}
