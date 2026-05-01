import express from "express";
import multer from "multer";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import "dotenv/config"; // Ensure env variables are loaded

const prisma = new PrismaClient();
const app = express();

// 1. Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Setup Cloudinary Storage for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "user_uploads", // Folder name in Cloudinary
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

const upload = multer({ storage });

// 3. Middleware
app.use(cors());
app.use(express.json());

// --- ROUTES ---

/**
 * @route   POST /upload
 * @desc    Upload image to Cloudinary and save reference in DB
 */
app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const imageUrl = req.file.path; // Cloudinary URL

    const newImage = await prisma.image.create({
      data: {
        url: imageUrl,      // Must match schema.prisma
        status: "PENDING",  // For the worker to pick up
      },
    });

    // Send 201 (Created)
    res.status(201).json(newImage);
  } catch (error) {
    // This will now show the REAL error message in your terminal
    console.error("❌ Database Error:", error); 
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route   GET /images
 * @desc    Fetch all completed images
 */
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

// --- SERVER START ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});
