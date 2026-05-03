import * as dotenv from "dotenv";
dotenv.config();
import { uploadToCloudinary } from "../src/server/cloudinary";

async function testCloudinary() {
  console.log("Testing Cloudinary upload...");
  console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
  console.log("API Key:", process.env.CLOUDINARY_API_KEY ? "EXISTS" : "MISSING");
  console.log("API Secret:", process.env.CLOUDINARY_API_SECRET ? "EXISTS" : "MISSING");

  const mockBuffer = Buffer.from("this is a test file content");
  
  try {
    const result = await uploadToCloudinary(mockBuffer, "test-file.txt", "text/plain");
    console.log("Upload Success!");
    console.log("Result:", result);
  } catch (err: any) {
    console.error("Upload Failed!");
    console.error("Error Message:", err.message);
    console.error("Full Error:", err);
  }
}

testCloudinary();
