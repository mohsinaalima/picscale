"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [images, setImages] = useState([]);

  // 1. Images fetch karne ka function
  const fetchImages = async () => {
    try {
      const res = await fetch("http://localhost:5000/images");
      const data = await res.json();
      setImages(data);
    } catch (err) {
      console.log("Gallery load error:", err);
    }
  };

  useEffect(() => {
    fetchImages();
    const interval = setInterval(fetchImages, 3000); // Har 3 second mein update
    return () => clearInterval(interval);
  }, []);

  // 2. Upload karne ka function
  const handleUpload = async () => {
    if (!file) return alert("Please choose a file first!");
    setStatus("Uploading...");

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setStatus(`Success! Worker will resize it soon.`);
    } catch (err) {
      setStatus("Upload failed!");
    }
  };

  return (
    <div className='max-w-4xl mx-auto p-10 font-sans text-white bg-slate-900 min-h-screen'>
      <h1 className='text-4xl font-bold text-center mb-10'>PicScale AI</h1>

      {/* --- UPLOAD SECTION --- */}
      <div className='bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700 mb-10'>
        <h2 className='text-xl mb-4'>Step 1: Upload Image</h2>
        <input
          type='file'
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className='block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100'
        />
        <button
          onClick={handleUpload}
          className='mt-6 w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 px-6 rounded-xl transition-all'
        >
          Upload & Resize
        </button>
        {status && <p className='mt-4 text-center text-violet-400'>{status}</p>}
      </div>

      {/* --- GALLERY SECTION --- */}
      <div className='border-t border-slate-700 pt-10'>
        <h2 className='text-2xl font-bold mb-6'>Step 2: Processed Gallery</h2>
        {images.length === 0 ? (
          <p className='text-slate-500 italic'>
            No images processed yet. Upload one above!
          </p>
        ) : (
          // Replace your grid-cols-3 with this:
          <div className='columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4'>
            {images.map((img: any) => (
              <div
                key={img.id}
                className='break-inside-avoid bg-slate-800 rounded-xl overflow-hidden group relative'
              >
                <img
                  src={img.url}
                  className='w-full h-auto object-cover hover:opacity-90 transition-opacity'
                />

                {/* Pinterest-style Hover Overlay */}
                <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-3'>
                  <button className='bg-red-600 text-white px-4 py-2 rounded-full font-bold text-sm'>
                    Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
