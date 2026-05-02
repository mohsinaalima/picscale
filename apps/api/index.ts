import express from "express";
import multer from "multer";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import "dotenv/config";

const prisma = new PrismaClient();
const app = express(); // ✅ sabse pehle ye hona chahiye

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Debug env check
console.log("ENV CHECK:", {
  cloud: process.env.CLOUDINARY_CLOUD_NAME,
  key: process.env.CLOUDINARY_API_KEY ? "OK" : "MISSING",
});

// Storage (simple version)
const storage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: "user_uploads",
  }),
});

const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json());

// Upload route
app.post("/upload", upload.single("image"), async (req, res) => {
  console.log("📦 FILE DATA:", req.file);

  if (!req.file) {
    console.log("❌ No file received");
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const imageUrl = req.file.path;
    console.log("✅ Cloudinary URL:", imageUrl);

    const newImage = await prisma.image.create({
      data: {
        url: imageUrl,
        status: "PENDING",
      },
    });

    console.log("✅ DB SAVED:", newImage);

    res.status(201).json(newImage);
  } catch (error: any) {
    console.error("❌ ERROR:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Fetch route
app.get("/images", async (req, res) => {
  try {
    const images = await prisma.image.findMany({
      where: { status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
    });
    res.json(images);
  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({ error: "Failed to fetch images" });
  }
});

// Start server
app.listen(5000, () => {
  console.log("🚀 API running on http://localhost:5000");
});
