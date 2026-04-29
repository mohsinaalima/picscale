import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';

const app = express();
app.use(cors()); // Allows your Next.js app to talk to this API

// 1. Configure where to save uploaded files temporarily
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '../../uploads/'); // Putting it in that folder your script used!
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// 2. The Upload Route
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  console.log(`Received file: ${req.file.filename}`);

  // 3. RETURN 202 ACCEPTED
  // We tell the user "We got it!" even if the worker hasn't processed it yet.
  res.status(202).json({
    message: "Image accepted and queued for processing",
    id: req.file.filename
  });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on http://localhost:${PORT}`);
});