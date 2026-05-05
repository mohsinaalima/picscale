"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("Abstract"); // Default category
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [images, setImages] = useState([]);

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
    const interval = setInterval(fetchImages, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUpload = async () => {
    if (!file) return alert("Please choose a file first!");
    setStatus("Uploading...");

    const formData = new FormData();
    formData.append("image", file);
    formData.append("category", category); // Sending category to backend

    try {
      const res = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setStatus(`Success! Processed soon.`);
        setTimeout(() => {
          setIsUploadOpen(false); // Close modal on success
          setStatus("");
          setFile(null);
        }, 2000);
      }
    } catch (err) {
      setStatus("Upload failed!");
    }
  };

  return (
    <div className='min-h-screen bg-black text-white font-sans'>
      {/* --- NAVIGATION BAR --- */}
      <nav className='flex justify-between items-center p-6 sticky top-0 bg-black/80 backdrop-blur-md z-40'>
        <h1 className='text-2xl font-bold tracking-tighter'>PicScale</h1>
        <div className='flex gap-4'>
          <button
            onClick={() => setIsUploadOpen(true)}
            className='bg-red-600 hover:bg-red-700 px-6 py-2 rounded-full font-bold transition-all'
          >
            Create
          </button>
        </div>
      </nav>

      <main className='max-w-7xl mx-auto p-6'>
        {/* --- MASONRY GALLERY --- */}
        {images.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-64 text-zinc-500'>
            <p className='italic'>No pins yet. Click "Create" to start!</p>
          </div>
        ) : (
          <div className='columns-2 md:columns-3 lg:columns-5 gap-4 space-y-4'>
            {images.map((img: any) => (
              <div
                key={img.id}
                className='break-inside-avoid group relative rounded-2xl overflow-hidden cursor-zoom-in'
              >
                <img
                  src={img.url}
                  className='w-full h-auto object-cover rounded-2xl'
                  alt={img.category}
                />

                {/* Hover Overlay */}
                <div className='absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4'>
                  <div className='flex justify-between items-start'>
                    <span className='bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium'>
                      {img.category || "General"}
                    </span>
                    <button className='bg-red-600 text-white px-5 py-2 rounded-full font-bold text-sm shadow-lg'>
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* --- UPLOAD MODAL --- */}
      {isUploadOpen && (
        <div className='fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
          <div className='bg-zinc-900 border border-zinc-800 w-full max-w-lg p-8 rounded-3xl relative shadow-2xl'>
            <button
              onClick={() => setIsUploadOpen(false)}
              className='absolute top-6 right-6 text-zinc-400 hover:text-white text-xl'
            >
              ✕
            </button>

            <h2 className='text-3xl font-bold mb-8'>Create Pin</h2>

            <div className='space-y-6'>
              <div>
                <label className='block text-sm font-medium text-zinc-400 mb-2'>
                  Select Image
                </label>
                <input
                  type='file'
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className='block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-zinc-400 mb-2'>
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className='w-full bg-zinc-800 border border-zinc-700 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600'
                >
                  <option value='Abstract'>Abstract</option>
                  <option value='Nature'>Nature</option>
                  <option value='Tech'>Tech</option>
                  <option value='Portrait'>Portrait</option>
                </select>
              </div>

              <button
                onClick={handleUpload}
                disabled={!file || status === "Uploading..."}
                className='w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg'
              >
                {status || "Publish Pin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
