import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';

const app = express();

// ✅ CORS (frontend connect karega)
app.use(cors({ origin: 'http://localhost:3000' }));

// ✅ STATIC FILE SERVING (VERY IMPORTANT)
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// 1. Upload storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads')); // safer path
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// 2. Upload Route
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  console.log(`Received file: ${req.file.filename}`);

  res.status(202).json({
    message: "Image accepted and queued for processing",
    id: req.file.filename
  });
});


// ❗ TEMP VERSION (agar Prisma use nahi kar rahi ho abhi)
import fs from 'fs';

app.get('/images', (req, res) => {
  const dir = path.join(__dirname, '../../uploads');

  fs.readdir(dir, (err, files) => {
    if (err) return res.status(500).json({ error: "Cannot read uploads" });

    // sirf thumb images filter kar rahe hain
    const images = files
      .filter(file => file.startsWith('thumb_'))
      .map(file => ({
        id: file,
        filename: file.replace('thumb_', '')
      }));

    res.json(images);
  });
});


const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on http://localhost:${PORT}`);
});