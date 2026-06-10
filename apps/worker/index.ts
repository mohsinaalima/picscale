import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

const prisma = new PrismaClient();

// Bulletproof standard Node.js path trick (import.meta hata diya hamesha ke liye)
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

async function processImages() {
  try {
    // Find a PENDING image using the 'url' field
    const image = await prisma.image.findFirst({
      where: { status: "PENDING" },
    });

    if (!image) return;

    console.log(`\n🤖 Found image to process: ${image.id}`);

    // Update status to PROCESSING
    await prisma.image.update({
      where: { id: image.id },
      data: { status: "PROCESSING" },
    });

    const thumbnailCloudinaryUrl = image.url.replace(
      "/upload/",
      "/upload/w_200,h_200,c_fill/",
    );

    await prisma.image.update({
      where: { id: image.id },
      data: {
        status: "COMPLETED",

        url: thumbnailCloudinaryUrl,
      },
    });

    console.log(`✅ Successfully processed thumbnail for ID: ${image.id}`);
  } catch (error) {
    console.error("\n❌ Worker Error:", error);
  }
}

// Start the engine
console.log("🤖 PicScale Worker is alive and watching for images...");

// Poll every 5 seconds
setInterval(processImages, 5000);
