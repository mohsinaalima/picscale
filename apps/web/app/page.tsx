"use client";
import { useEffect, useState } from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/nextjs";

// ✅ Type defined properly
type ImageType = {
  id: string;
  url: string;
  category?: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("Abstract");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [images, setImages] = useState<ImageType[]>([]);

  const BASE_URL = "http://localhost:5000";

  const fetchImages = async () => {
    try {
      const res = await fetch(`${BASE_URL}/images`);
      const data = await res.json();
      setImages(data);
    } catch (err) {
      console.error("Gallery load error:", err);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleUpload = async () => {
    if (!file) return alert("Please choose a file first!");
    setStatus("Uploading...");

    const formData = new FormData();
    formData.append("image", file);
    formData.append("category", category);

    try {
      const res = await fetch(`${BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setStatus("Success!");

        // ✅ Refresh images immediately
        await fetchImages();

        setTimeout(() => {
          setIsUploadOpen(false);
          setStatus("");
          setFile(null);
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setStatus("Upload failed!");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* NAVBAR */}
      <nav className="flex justify-between items-center p-6 sticky top-0 bg-black/80 backdrop-blur-md z-40 border-b border-zinc-800">
        <h1 className="text-3xl font-bold text-red-600">PicScale</h1>

        <div className="flex gap-6 items-center">
          <SignedOut>
            <div className="bg-zinc-800 hover:bg-zinc-700 px-6 py-2 rounded-full font-bold cursor-pointer">
              <SignInButton mode="modal" />
            </div>
          </SignedOut>

          <SignedIn>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-full font-bold"
            >
              Create
            </button>

            {/* ✅ FIXED UserButton (no TS error) */}
            <UserButton/>
          </SignedIn>
        </div>
      </nav>

      {/* GALLERY */}
      <main className="max-w-7xl mx-auto p-6">
        {images.length === 0 ? (
          <div className="flex justify-center h-64 text-zinc-500 items-center">
            No pins yet.
          </div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-5 gap-4 space-y-4">
            {images.map((img) => (
              <div key={img.id} className="break-inside-avoid">
                <img
                  src={img.url}
                  className="rounded-2xl w-full"
                  alt={img.category}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-black/90 flex justify-center items-center">
          <div className="bg-zinc-900 p-8 rounded-3xl w-full max-w-lg">
            <h2 className="text-2xl mb-6">Create Pin</h2>

            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mb-4"
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full mb-4 p-2 bg-zinc-800"
            >
              <option>Abstract</option>
              <option>Nature</option>
              <option>Tech</option>
              <option>Portrait</option>
            </select>

            <button
              onClick={handleUpload}
              className="bg-red-600 w-full py-3 rounded-xl"
            >
              {status || "Upload"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}