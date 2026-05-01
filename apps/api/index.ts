import express from "express";
import multer from "multer";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

// 1. Setup Prisma and Path
const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 2. Middleware
app.use(cors());
app.use(express.json());

// 3. Serve Uploads folder (Taaki browser thumbnails dekh sake)
app.use("/uploads", express.static(path.join(__dirname, "../../uploads")));

// 4. Multer Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// 5. POST: Upload Image & Create DB Entry
app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    // Database mein record banana taaki Worker ise dekh sake
    const newImage = await prisma.image.create({
      data: {
        filename: req.file.filename,
        status: "PENDING", // Worker sirf PENDING status waali images uthayega
      },
    });

    res.status(202).json({
      message: "Uploaded and queued for resizing",
      id: newImage.id,
      filename: newImage.filename,
    });
  } catch (error) {
    console.error("DB Error:", error);
    res.status(500).json({ error: "Could not save to database" });
  }
});

// 6. GET: Fetch Completed Images for Gallery
app.get("/images", async (req, res) => {
  try {
    const images = await prisma.image.findMany({
      where: { status: "COMPLETED" }, // Sirf wahi dikhao jo resize ho chuki hain
      orderBy: { createdAt: "desc" },
    });
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch images" });
  }
});

app.listen(5000, "0.0.0.0", () => {
  console.log("🚀 API running on http://localhost:5000");
});
