import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

// 1. Recreate __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

const UPLOADS_DIR = path.join(__dirname, "../../uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

async function processImages() {
  try {
    // 1. Find a PENDING image using the 'url' field
    const image = await prisma.image.findFirst({
      where: { status: "PENDING" },
    });

    if (!image) return;

    console.log(`\nFound image to process: ${image.id}`);

    // Update status to PROCESSING
    await prisma.image.update({
      where: { id: image.id },
      data: { status: "PROCESSING" },
    });

    /**
     * NOTE: Since you are using Cloudinary, you can actually
     * skip the local 'sharp' resize and just generate a
     * Cloudinary thumbnail URL by manipulating the string.
     */
    const thumbnailCloudinaryUrl = image.url.replace(
      "/upload/",
      "/upload/w_200,h_200,c_fill/",
    );

    // Update status to COMPLETED and store the thumbnail URL
    await prisma.image.update({
      where: { id: image.id },
      data: {
        status: "COMPLETED",
        thumbUrl: thumbnailCloudinaryUrl,
      },
    });

    console.log(`✅ Successfully processed thumbnail for ID: ${image.id}`);
  } catch (error) {
    console.error("\n❌ Worker Error:", error);
  }
}

// 5. Start the engine
console.log("🤖 PicScale Worker is alive and watching for images...");
console.log(`📂 Monitoring folder: ${UPLOADS_DIR}`);

// Poll every 5 seconds
setInterval(processImages, 5000);
