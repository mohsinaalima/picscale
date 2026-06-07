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
  userId: string;
  likeCount: number;     
  isLikedByMe: boolean;  
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
  const [activeTab, setActiveTab] = useState<"all" | "saved" | "following">(
    "all",
  );

  // Creator Profile View Management
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(
    null,
  );
  const [creatorProfile, setCreatorProfile] = useState<{
    images: ImageType[];
    followers: number;
    following: number;
  } | null>(null);
  const [isFollowingCreator, setIsFollowingCreator] = useState(false);

  const BASE_URL = "http://localhost:5000";

  // Clerk Authentication
  const { userId } = useAuth();
  const { user } = useUser();

  // ===============================
  // Fetch Images Logic
  // ===============================
  const fetchImages = async () => {
    try {
      let endpoint = `${BASE_URL}/images`;

      if (activeTab === "saved" && userId) {
        endpoint = `${BASE_URL}/users/${userId}/saved`;
      } else if (activeTab === "following" && userId) {
        endpoint = `${BASE_URL}/images?filter=following&userId=${userId}`;
      }

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

  // Run image fetch every time the tab or login status changes
  useEffect(() => {
    fetchImages();
  }, [activeTab, userId]);

  // ===============================
  // Upload Image Handler
  // ===============================
  const handleUpload = async () => {
    if (!file) return alert("Please choose a file first!");
    if (!userId) return alert("Please login first!");

    setStatus("Uploading...");
    const formData = new FormData();
    formData.append("image", file);
    formData.append("category", category);
    formData.append("userId", userId);
    formData.append("userEmail", user?.primaryEmailAddress?.emailAddress || "");

    try {
      const res = await fetch(`${BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log("UPLOAD RESPONSE:", data);

      if (!res.ok) throw new Error(data.error || "Upload failed");

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
  // Like Image Interaction
  // ===============================
  const handleLike = async (imgId: string) => {
    if (!userId) return alert("Login to like!");

    try {
      const res = await fetch(`${BASE_URL}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, imageId: imgId }),
      });

      const data = await res.json();
      console.log(data.message);
      fetchImages();
    } catch (err) {
      console.error("Like failed:", err);
    }
  };

  // ===============================
  // Save/Unsave Toggle Logic
  // ===============================
  const handleSave = async (imgId: string) => {
    if (!userId) return alert("Please sign in to save pins!");

    try {
      const res = await fetch(`${BASE_URL}/images/${imgId}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, imageId: imgId }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        if (activeTab === "saved") fetchImages(); // Quick UI clean refresh
      }
    } catch (err) {
      console.error("Error saving image:", err);
    }
  };

  // ===============================
  // Fetch Creator Profile Analytics
  // ===============================
  const fetchCreatorProfile = async (creatorId: string) => {
    try {
      const profileRes = await fetch(`${BASE_URL}/profile/${creatorId}`);
      const profileData = await profileRes.json();
      setCreatorProfile(profileData);

      if (userId) {
        const checkRes = await fetch(
          `${BASE_URL}/follow/check?followerId=${userId}&followingId=${creatorId}`,
        );
        const checkData = await checkRes.json();
        setIsFollowingCreator(checkData.isFollowing);
      }
    } catch (err) {
      console.error("Failed to load creator profile data:", err);
    }
  };

  // ===============================
  // Trigger Follow / Unfollow Toggle
  // ===============================
  const handleFollowToggle = async (creatorId: string) => {
    if (!userId) return alert("Please sign in to follow creators!");
    if (userId === creatorId) return alert("You cannot follow yourself!");

    try {
      const res = await fetch(`${BASE_URL}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followerId: userId, followingId: creatorId }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        fetchCreatorProfile(creatorId);
      }
    } catch (err) {
      console.error("Follow operational exception caught:", err);
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
              <SignInButton mode='modal' fallbackRedirectUrl='/' />
            </div>
          </SignedOut>

          <SignedIn>
            <button
              onClick={() => setIsUploadOpen(true)}
              className='bg-red-600 hover:bg-red-700 px-6 py-2 rounded-full font-bold transition'
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
          onClick={() => setActiveTab("following")}
          className={`px-4 py-2 rounded-full transition-all ${
            activeTab === "following"
              ? "bg-white text-black"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Following Feed
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
          <div className='flex justify-center h-64 text-zinc-500 items-center animate-pulse'>
            No pins found in this tab.
          </div>
        ) : (
          <div className='columns-2 md:columns-3 lg:columns-5 gap-4 space-y-4'>
            {images.map((img) => (
              <div
                key={img.id}
                className='break-inside-avoid group relative transition duration-300'
              >
                <img
                  src={img.url}
                  className='rounded-2xl w-full object-cover'
                  alt={img.category || "Post image"}
                />

                {/* INTERACTIVE HOVER OVERLAY */}
                <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-200 p-4 flex flex-col justify-between rounded-2xl'>
                  {/* TOP ACTIONS */}
                  <div className='flex justify-end gap-2'>
                    <button
                      onClick={() => handleLike(img.id)}
                      className='bg-zinc-100/20 backdrop-blur-md p-2 rounded-full hover:bg-white/40 text-lg transition'
                    >
                      ❤️
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSave(img.id);
                      }}
                      className='bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full font-bold text-sm transition shadow-md'
                    >
                      Save
                    </button>
                  </div>

                  {/* BOTTOM ACTIONS */}
                  <div className='flex justify-between items-center mt-auto w-full'>
                    <span
                      onClick={() => {
                        setSelectedCreatorId(img.userId);
                        fetchCreatorProfile(img.userId);
                      }}
                      className='text-xs font-medium text-white/90 hover:underline cursor-pointer truncate max-w-[100px]'
                    >
                      @{img.userId ? img.userId.slice(0, 8) : "creator"}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFollowToggle(img.userId);
                      }}
                      className='text-[10px] bg-white text-black px-3 py-1 rounded-full font-bold hover:bg-zinc-200 transition'
                    >
                      Follow
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* UPLOAD PIN MODAL */}
      {isUploadOpen && (
        <div className='fixed inset-0 bg-black/90 flex justify-center items-center z-50 p-4 backdrop-blur-sm'>
          <div className='bg-zinc-900 p-8 rounded-3xl w-full max-w-lg relative border border-zinc-800 shadow-2xl'>
            <button
              onClick={() => setIsUploadOpen(false)}
              className='absolute top-4 right-4 text-zinc-400 hover:text-white font-bold text-lg p-2 transition'
            >
              ✕
            </button>
            <h2 className='text-2xl mb-6 font-bold text-white'>Create Pin</h2>

            {/* File Drop Box */}
            <label className='flex items-center justify-center w-full h-52 border-2 border-dashed border-zinc-700 rounded-2xl cursor-pointer hover:border-red-500 transition overflow-hidden mb-5 bg-black/30'>
              {file ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt='Preview'
                  className='w-full h-full object-cover'
                />
              ) : (
                <div className='text-center p-4'>
                  <p className='text-zinc-300 text-lg font-semibold'>
                    Click to Upload Image
                  </p>
                  <p className='text-zinc-500 text-sm mt-2'>
                    Supports PNG, JPG, JPEG
                  </p>
                </div>
              )}
              <input
                type='file'
                accept='image/*'
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className='hidden'
              />
            </label>

            {/* Category selection drop */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className='w-full mb-6 p-3 bg-zinc-800 rounded-xl text-white outline-none border border-zinc-700 focus:border-red-500 transition'
            >
              <option>Abstract</option>
              <option>Nature</option>
              <option>Tech</option>
              <option>Portrait</option>
            </select>

            <button
              onClick={handleUpload}
              className='bg-red-600 hover:bg-red-700 w-full py-3 rounded-xl font-bold text-white shadow-lg transition duration-200'
            >
              {status || "Upload"}
            </button>
          </div>
        </div>
      )}

      {/* CREATOR PROFILE FLOATING MODAL OVERLAY */}
      {selectedCreatorId && creatorProfile && (
        <div className='fixed inset-0 bg-black/95 overflow-y-auto z-50 p-6 flex flex-col items-center'>
          <div className='w-full max-w-5xl flex justify-start mb-8'>
            <button
              onClick={() => {
                setSelectedCreatorId(null);
                setCreatorProfile(null);
                fetchImages();
              }}
              className='bg-zinc-800 text-white font-bold px-6 py-2 rounded-full hover:bg-zinc-700 transition'
            >
              ← Back to Explore
            </button>
          </div>

          <div className='flex flex-col items-center mb-12 border-b border-zinc-800 pb-8 w-full max-w-xl'>
            <div className='w-24 h-24 rounded-full bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-3xl font-extrabold mb-4 uppercase text-white shadow-md'>
              {selectedCreatorId.slice(5, 7)}
            </div>

            <h2 className='text-2xl font-bold mb-2 text-white'>
              @{selectedCreatorId.slice(0, 12)}...
            </h2>

            <div className='flex gap-6 text-sm text-zinc-400 mb-5 font-semibold'>
              <span>{creatorProfile.followers} Followers</span>
              <span>•</span>
              <span>{creatorProfile.following} Following</span>
            </div>

            {userId !== selectedCreatorId && (
              <button
                onClick={() => handleFollowToggle(selectedCreatorId)}
                className={`px-8 py-3 rounded-full font-bold text-sm transition-all shadow-md ${
                  isFollowingCreator
                    ? "bg-zinc-700 text-white"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                {isFollowingCreator ? "Following" : "Follow"}
              </button>
            )}
          </div>

          <div className='w-full max-w-6xl'>
            <h3 className='text-xl font-bold mb-6 text-zinc-300'>
              Created Pins
            </h3>

            {creatorProfile.images.length === 0 ? (
              <p className='text-zinc-500 text-center py-12'>
                This creator hasn't published any pins yet.
              </p>
            ) : (
              <div className='columns-2 md:columns-3 lg:columns-5 gap-4 space-y-4'>
                {creatorProfile.images.map((item) => (
                  <div
                    key={item.id}
                    className='break-inside-avoid relative rounded-2xl overflow-hidden shadow-lg'
                  >
                    <img
                      src={item.url}
                      className='w-full h-auto object-cover rounded-2xl'
                      alt='Creator post'
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
