"use client";

import { useEffect, useState } from "react";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useAuth,
  useUser,
} from "@clerk/nextjs";

// ===============================
// Types
// ===============================
type ImageType = {
  id: string;
  url: string;
  category?: string;
};

// ===============================
// Home Component
// ===============================
export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("Abstract");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [images, setImages] = useState<ImageType[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "saved">("all");

  const BASE_URL = "http://localhost:5000";

  // Clerk
  const { userId } = useAuth();
  const { user } = useUser();

  // ===============================
  // Fetch Images
  // ===============================
  const fetchImages = async () => {
    try {
      const endpoint =
        activeTab === "saved" && userId
          ? `${BASE_URL}/users/${userId}/saved`
          : `${BASE_URL}/images`;

      const res = await fetch(endpoint);

      const data = await res.json();

      if (Array.isArray(data)) {
        setImages(data);
      } else {
        console.error("Images is not array:", data);
        setImages([]);
      }
    } catch (err) {
      console.error("Gallery load error:", err);
      setImages([]);
    }
  };

  

  // ===============================
  // Upload Image
  // ===============================
  const handleUpload = async () => {
    if (!file) {
      return alert("Please choose a file first!");
    }

    if (!userId) {
      return alert("Please login first!");
    }

    setStatus("Uploading...");

    const formData = new FormData();

    formData.append("image", file);
    formData.append("category", category);

    // Send Clerk User Data
    formData.append("userId", userId);

    formData.append("userEmail", user?.primaryEmailAddress?.emailAddress || "");

    try {
      const res = await fetch(`${BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      console.log("UPLOAD RESPONSE:", data);

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setStatus("Success!");

      await fetchImages();

      setTimeout(() => {
        setIsUploadOpen(false);
        setStatus("");
        setFile(null);
      }, 1500);
    } catch (err) {
      console.error("Upload error:", err);
      setStatus("Upload failed!");
    }
  };

  // ===============================
  // Like Image
  // ===============================
  const handleLike = async (imgId: string) => {
    if (!userId) return alert("Login to like!");

    try {
      const res = await fetch("http://localhost:5000/like", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          imageId: imgId,
        }),
      });

      const data = await res.json();

      console.log(data.message);

      // Refresh feed
      fetchImages();
    } catch (err) {
      console.error("Like failed:", err);
    }
  };

  // ===============================
  // Save Image
  // ===============================
  const handleSave = async (imgId: string) => {
    if (!userId) {
      alert("Please sign in to save pins!");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          imageId: imgId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
      }
    } catch (err) {
      console.error("Error saving image:", err);
    }
  };

  return (
    <div className='min-h-screen bg-black text-white font-sans'>
      {/* NAVBAR */}
      <nav className='flex justify-between items-center p-6 sticky top-0 bg-black/80 backdrop-blur-md z-40 border-b border-zinc-800'>
        <h1 className='text-3xl font-bold text-red-600'>PicScale</h1>

        <div className='flex gap-6 items-center'>
          <SignedOut>
            <div className='bg-zinc-800 hover:bg-zinc-700 px-6 py-2 rounded-full font-bold cursor-pointer'>
              <SignInButton mode='modal' />
            </div>
          </SignedOut>

          <SignedIn>
            <button
              onClick={() => setIsUploadOpen(true)}
              className='bg-red-600 hover:bg-red-700 px-6 py-2 rounded-full font-bold'
            >
              Create
            </button>

            <UserButton />
          </SignedIn>
        </div>
      </nav>

      {/* TABS CONTROLLER */}
      <div className='flex justify-center gap-6 mt-6 text-sm font-bold'>
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-full transition-all ${
            activeTab === "all"
              ? "bg-white text-black"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Explore All
        </button>

        <button
          onClick={() => setActiveTab("saved")}
          className={`px-4 py-2 rounded-full transition-all ${
            activeTab === "saved"
              ? "bg-white text-black"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Saved Pins
        </button>
      </div>

      {/* GALLERY */}
      <main className='max-w-7xl mx-auto p-6'>
        {images.length === 0 ? (
          <div className='flex justify-center h-64 text-zinc-500 items-center'>
            No pins yet.
          </div>
        ) : (
          <div className='columns-2 md:columns-3 lg:columns-5 gap-4 space-y-4'>
            {images.map((img) => (
              <div key={img.id} className='break-inside-avoid group relative'>
                <img
                  src={img.url}
                  className='rounded-2xl w-full'
                  alt={img.category}
                />

                {/* OVERLAY */}
                <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all p-4 flex flex-col justify-between rounded-2xl'>
                  {/* TOP BUTTONS */}
                  <div className='flex justify-end gap-2'>
                    {/* LIKE BUTTON */}
                    <button
                      onClick={() => handleLike(img.id)}
                      className='bg-zinc-100/20 backdrop-blur-md p-2 rounded-full hover:bg-white/40'
                    >
                      ❤️
                    </button>

                    {/* SAVE BUTTON */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSave(img.id);
                      }}
                      className='bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full font-bold text-sm transition-all shadow-md'
                    >
                      Save
                    </button>
                  </div>

                  {/* BOTTOM INFO */}
                  <div className='flex justify-between items-center'>
                    <span className='text-xs font-medium'>
                      @{img.id.slice(0, 8)}
                    </span>

                    <button className='text-[10px] bg-white text-black px-3 py-1 rounded-full font-bold'>
                      Follow
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL */}
      {isUploadOpen && (
        <div className='fixed inset-0 bg-black/90 flex justify-center items-center z-50'>
          <div className='bg-zinc-900 p-8 rounded-3xl w-full max-w-lg'>
            <h2 className='text-2xl mb-6 font-bold'>Create Pin</h2>

            {/* Upload Box */}
            <label className='flex items-center justify-center w-full h-52 border-2 border-dashed border-zinc-600 rounded-2xl cursor-pointer hover:border-red-500 transition overflow-hidden mb-5'>
              {file ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt='Preview'
                  className='w-full h-full object-cover'
                />
              ) : (
                <div className='text-center'>
                  <p className='text-zinc-300 text-lg font-semibold'>
                    Click to Upload Image
                  </p>

                  <p className='text-zinc-500 text-sm mt-2'>PNG, JPG, JPEG</p>
                </div>
              )}

              <input
                type='file'
                accept='image/*'
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className='hidden'
              />
            </label>

            {/* Category */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className='w-full mb-4 p-3 bg-zinc-800 rounded-xl'
            >
              <option>Abstract</option>
              <option>Nature</option>
              <option>Tech</option>
              <option>Portrait</option>
            </select>

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              className='bg-red-600 hover:bg-red-700 w-full py-3 rounded-xl font-bold'
            >
              {status || "Upload"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
