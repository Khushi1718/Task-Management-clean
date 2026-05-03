import { v2 as cloudinary } from 'cloudinary';

const cleanEnvValue = (value?: string) => {
  return value?.trim().replace(/^['"]|['"]$/g, "");
};

const readCloudinaryEnv = () => ({
  cloudName: cleanEnvValue(process.env.CLOUDINARY_CLOUD_NAME),
  apiKey: cleanEnvValue(process.env.CLOUDINARY_API_KEY),
  apiSecret: cleanEnvValue(process.env.CLOUDINARY_API_SECRET),
});

// Helper to check if Cloudinary is configured
export const isCloudinaryConfigured = () => {
  const { cloudName, apiKey, apiSecret } = readCloudinaryEnv();
  return !!(
    cloudName &&
    apiKey &&
    apiSecret
  );
};

// Storage configuration (Lazy initialized or re-configured if needed)
export const getCloudinary = () => {
  const { cloudName, apiKey, apiSecret } = readCloudinaryEnv();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the deployment environment."
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  return cloudinary;
};

const getPublicId = (fileName: string) => {
  const baseName = fileName.replace(/\.[^/.]+$/, "");
  const safeName = baseName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  return `${Date.now()}-${safeName || "upload"}`;
};

/**
 * Uploads a file buffer to Cloudinary.
 * Using Base64 instead of Streams for better stability in serverless environments like Vercel.
 */
export const uploadToCloudinary = async (fileBuffer: Buffer, fileName: string, mimeType: string) => {
  const client = getCloudinary();
  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");

  try {
    // Convert buffer to Base64 data URI
    const base64Data = fileBuffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64Data}`;

    const result = await client.uploader.upload(dataUri, {
      folder: 'workflow-pro-uploads',
      resource_type: (isImage || isPdf) ? 'image' : 'auto',
      format: isPdf ? 'pdf' : undefined,
      public_id: getPublicId(fileName),
      access_mode: 'public',
    });

    return {
      url: result.secure_url,
      name: fileName,
      type: mimeType,
      public_id: result.public_id
    };
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

export default cloudinary;
