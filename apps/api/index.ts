import express from "express";
import multer from "multer";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import "dotenv/config";

const prisma = new PrismaClient();
const app = express();

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Debug env check
console.log("ENV CHECK:", {
  key: process.env.CLOUDINARY_API_KEY ? "OK" : "MISSING",
});

// Storage
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

// ===============================
// Upload Route
// ===============================
app.post("/upload", upload.single("image"), async (req, res) => {
  console.log("📦 FILE DATA:", req.file);

  const { category, userId } = req.body;

  if (!req.file) {
    console.log("No file received");

    return res.status(400).json({
      error: "No file uploaded",
    });
  }

  try {
    const imageUrl = req.file.path;

    console.log("Cloudinary URL:", imageUrl);

    const newImage = await prisma.image.create({
      data: {
        url: (req.file as any).path,
        category: category || "Abstract",
        status: "COMPLETED",
        userId,
      },
    });

    console.log("DB SAVED:", newImage);

    res.status(201).json(newImage);
  } catch (error: any) {
    console.error("ERROR:", error);

    res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

// ===============================
// Delete Image
// ===============================
app.delete("/images/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const image = await prisma.image.findUnique({
      where: { id },
    });

    if (!image) {
      return res.status(404).send("Not found");
    }

    // Delete from Cloudinary
    const publicId = image.url.split("/").pop()?.split(".")[0];

    await cloudinary.uploader.destroy(`picscale_uploads/${publicId}`);

    // Delete from DB
    await prisma.image.delete({
      where: { id },
    });

    res.send("Deleted successfully");
  } catch (err) {
    res.status(500).send("Delete failed");
  }
});

// ===============================
// Fetch Images
// ===============================
app.get("/images", async (req, res) => {
  try {
    const images = await prisma.image.findMany({
      where: { status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
    });

    res.json(images);
  } catch (error) {
    console.error("Fetch Error:", error);

    res.status(500).json({
      error: "Failed to fetch images",
    });
  }
});

// ===============================
// LIKE / UNLIKE LOGIC
// ===============================
app.post("/like", async (req, res) => {
  const { userId, imageId } = req.body;

  try {
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_imageId: {
          userId,
          imageId,
        },
      },
    });

    // Unlike
    if (existingLike) {
      await prisma.like.delete({
        where: {
          id: existingLike.id,
        },
      });

      return res.json({
        message: "Unliked",
        liked: false,
      });
    }

    // Like
    await prisma.like.create({
      data: {
        userId,
        imageId,
      },
    });

    res.json({
      message: "Liked",
      liked: true,
    });
  } catch (err) {
    res.status(500).json({
      error: "Like failed",
    });
  }
});

// ===============================
// SAVE / UNSAVE LOGIC
// ===============================
app.post("/save", async (req, res) => {
  const { userId, imageId } = req.body;

  try {
    const existingSave = await prisma.save.findUnique({
      where: {
        userId_imageId: {
          userId,
          imageId,
        },
      },
    });

    // Unsave
    if (existingSave) {
      await prisma.save.delete({
        where: {
          id: existingSave.id,
        },
      });

      return res.json({
        message: "Removed from board",
        saved: false,
      });
    }

    // Save
    await prisma.save.create({
      data: {
        userId,
        imageId,
      },
    });

    res.json({
      message: "Saved to board",
      saved: true,
    });
  } catch (err) {
    res.status(500).json({
      error: "Save failed",
    });
  }
});

// ===============================
// FOLLOW / UNFOLLOW ROUTE
// ===============================
app.post("/follow", async (req, res) => {
  const { followerId, followingId } = req.body;

  // Prevent self follow
  if (followerId === followingId) {
    return res.status(400).json({
      error: "You cannot follow yourself!",
    });
  }

  try {
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    // Unfollow
    if (existingFollow) {
      await prisma.follow.delete({
        where: {
          id: existingFollow.id,
        },
      });

      return res.json({
        message: "Unfollowed",
        isFollowing: false,
      });
    }

    // Follow
    await prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });

    res.json({
      message: "Followed",
      isFollowing: true,
    });
  } catch (err) {
    res.status(500).json({
      error: "Follow operation failed",
    });
  }
});

// Start Server

app.listen(5000, () => {
  console.log("🚀 API running on http://localhost:5000");
});
