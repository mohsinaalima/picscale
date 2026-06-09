import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

const prisma = new PrismaClient();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Debug env check
console.log("ENV CHECK:", {
  key: process.env.CLOUDINARY_API_KEY ? "OK" : "MISSING",
});

// ==========================================
// INLINE CLOUDINARY & MULTER CONFIGURATION
// ==========================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key: process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: "picscale_user_uploads", // Cloudinary par folder ka naam
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [{ width: 1000, crop: "limit" }], // Image optimization
    };
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max file size: 5MB
});

// ===============================
// Upload Route
// ===============================
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const { category, userId } = req.body;

    if (!req.file) {
      return res.status(400).json({
        error: "No image file uploaded or invalid format",
      });
    }

    const imageUrl = (req.file as any).path;

    const newImage = await prisma.image.create({
      data: {
        url: imageUrl,
        category: category || "Abstract",
        status: "COMPLETED",
        userId,
      },
    });

    console.log("🔥 Cloudinary Asset Created & Neon DB Synced:", newImage.id);
    return res.status(201).json(newImage);
  } catch (error) {
    console.error("Cloud Upload Core Engine Failure:", error);
    return res.status(500).json({
      error: "Internal Server Error during asset syncing",
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

    const publicId = image.url.split("/").pop()?.split(".")[0];

    await cloudinary.uploader.destroy(`picscale_user_uploads/${publicId}`);

    await prisma.image.delete({
      where: { id },
    });

    res.send("Deleted successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Delete failed");
  }
});

// ===============================
// Fetch Images (With Search Support)
// ===============================
app.get("/images", async (req, res) => {
  const { userId, filter, search } = req.query;

  try {
    let whereClause: any = { status: "COMPLETED" };

    // Search filter logic
    if (search) {
      whereClause.category = {
        contains: String(search), // Keyword match karega (e.g., "nat" matches "Nature")
        mode: "insensitive", // Capital/Small letter ka farq mita dega (Case-insensitive)
      };
    }

    if (filter === "saved" && userId) {
      const savedRecords = await prisma.save.findMany({
        where: { userId: String(userId) },
        select: { imageId: true },
      });
      const savedIds = savedRecords.map((r) => r.imageId);
      whereClause.id = { in: savedIds };
    } else if (filter === "following" && userId) {
      const following = await prisma.follow.findMany({
        where: { followerId: String(userId) },
        select: { followingId: true },
      });
      const followingIds = following.map((f) => f.followingId);
      whereClause.userId = { in: followingIds };
    }

    const images = await prisma.image.findMany({
      where: whereClause,
      include: {
        likes: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedImages = images.map((img) => {
      return {
        id: img.id,
        url: img.url,
        category: img.category,
        userId: img.userId,
        createdAt: img.createdAt,
        likeCount: img.likes.length,
        isLikedByMe: userId
          ? img.likes.some((like) => like.userId === userId)
          : false,
      };
    });

    res.json(formattedImages);
  } catch (error) {
    console.error("Fetch images error:", error);
    res.status(500).json({ error: "Failed to fetch images" });
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
// GET USER SAVED IMAGES
// ===============================
app.get("/users/:userId/saved", async (req, res) => {
  const { userId } = req.params;

  try {
    const savedRecords = await prisma.save.findMany({
      where: {
        userId,
      },
      include: {
        image: true,
      },
    });

    const savedImages = savedRecords.map((record) => record.image);

    res.json(savedImages);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to fetch saved images",
    });
  }
});

// ===============================
// FOLLOW / UNFOLLOW ROUTE
// ===============================
app.post("/follow", async (req, res) => {
  const { followerId, followingId } = req.body;

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

// ===============================
// CHECK IF FOLLOWING (ADDED NEW)
// ===============================
app.get("/follow/check", async (req, res) => {
  const { followerId, followingId } = req.query;

  try {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: String(followerId),
          followingId: String(followingId),
        },
      },
    });
    res.json({ isFollowing: !!follow });
  } catch (error) {
    res.status(500).json({ isFollowing: false });
  }
});

// ===============================
// GET PROFILE ROUTE
// ===============================
app.get("/profile/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const creatorImages = await prisma.image.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
    });

    const followersCount = await prisma.follow.count({
      where: { followingId: id },
    });

    const followingCount = await prisma.follow.count({
      where: { followerId: id },
    });

    res.json({
      images: creatorImages,
      followers: followersCount,
      following: followingCount,
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({
      error: "Failed to fetch profile details",
    });
  }
});

// ==========================================
// 💬 CHAT ENGINE ENDPOINTS
// ==========================================

// 1. Create or Fetch Existing Chat Room
app.post("/chats", async (req, res) => {
  const { senderId, receiverId } = req.body;

  if (!senderId || !receiverId) {
    return res.status(400).json({ error: "Missing sender or receiver IDs" });
  }

  // Ensure userOneId is always alphabetically smaller than userTwoId to maintain uniqueness
  const userOneId = senderId < receiverId ? senderId : receiverId;
  const userTwoId = senderId < receiverId ? receiverId : senderId;

  try {
    const chat = await prisma.chat.upsert({
      where: {
        userOneId_userTwoId: { userOneId, userTwoId },
      },
      update: {},
      create: { userOneId, userTwoId },
    });

    res.json(chat);
  } catch (error) {
    console.error("Failed to create/fetch chat room:", error);
    res.status(500).json({ error: "Chat initialization failed" });
  }
});

// 2. Send Message inside a Room
app.post("/messages", async (req, res) => {
  const { chatId, senderId, text } = req.body;

  if (!chatId || !senderId || !text) {
    return res
      .status(400)
      .json({ error: "Missing required message parameters" });
  }

  try {
    const message = await prisma.message.create({
      data: {
        chatId,
        senderId,
        text,
      },
    });
    res.status(201).json(message);
  } catch (error) {
    console.error("Message send failure:", error);
    res.status(500).json({ error: "Could not deliver message" });
  }
});

// 3. Fetch all messages for a specific Chat Room
app.get("/chats/:chatId/messages", async (req, res) => {
  const { chatId } = req.params;

  try {
    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" }, // Oldest first, newest bottom
    });
    res.json(messages);
  } catch (error) {
    console.error("Fetch messages failure:", error);
    res.status(500).json({ error: "Failed to retrieve conversation history" });
  }
});

// 4. Fetch User's Active Inbox (All active chat rooms)
app.get("/users/:userId/chats", async (req, res) => {
  const { userId } = req.params;

  try {
    const activeChats = await prisma.chat.findMany({
      where: {
        OR: [{ userOneId: userId }, { userTwoId: userId }],
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1, // Preview for the latest message text
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(activeChats);
  } catch (error) {
    console.error("Inbox query failure:", error);
    res.status(500).json({ error: "Could not load user conversations" });
  }
});

// Start Server
app.listen(5000, () => {
  console.log("🚀 API running on http://localhost:5000");
});
