import 'dotenv/config';
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
    // 3. Find a PENDING image
    const image = await prisma.image.findFirst({
      where: { status: "PENDING" },
    });

    if (!image) {
      // Small log to show it's working
      process.stdout.write(".");
      return;
    }

    console.log(`\nFound image: ${image.filename}. Starting resize...`);

    const inputPath = path.join(UPLOADS_DIR, image.filename);
    const outputPath = path.join(UPLOADS_DIR, `thumb_${image.filename}`);

    // Update status to PROCESSING
    await prisma.image.update({
      where: { id: image.id },
      data: { status: "PROCESSING" },
    });

    // 4. Resize with Sharp
    await sharp(inputPath)
      .resize(200, 200, { fit: "cover" })
      .toFile(outputPath);

    // Update status to COMPLETED
    await prisma.image.update({
      where: { id: image.id },
      data: { status: "COMPLETED" },
    });

    console.log(`✅ Successfully created thumbnail: thumb_${image.filename}`);
  } catch (error) {
    console.error("\n❌ Worker Error:", error);
  }
}

// 5. Start the engine
console.log("🤖 PicScale Worker is alive and watching for images...");
console.log(`📂 Monitoring folder: ${UPLOADS_DIR}`);

// Poll every 5 seconds
setInterval(processImages, 5000);
