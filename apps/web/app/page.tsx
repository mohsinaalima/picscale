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

type ChatType = {
  id: string;
  userOneId: string;
  userTwoId: string;
  messages?: MessageType[];
};

type MessageType = {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
};

// ===============================
// Home Component
// ===============================
export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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

  // 💬 CHAT STATES
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [activeChat, setActiveChat] = useState<ChatType | null>(null);
  const [chatMessages, setChatMessages] = useState<MessageType[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [userChats, setUserChats] = useState<ChatType[]>([]);

  const BASE_URL = "http://localhost:5000";

  // Clerk Authentication
  const { userId } = useAuth();
  const { user } = useUser();

  // ===============================
  // Fetch Images Logic
  // ===============================
  const fetchImages = async () => {
    try {
      let endpoint = `${BASE_URL}/images?`;
      if (searchQuery) endpoint += `search=${searchQuery}&`;
      if (activeTab === "saved" && userId)
        endpoint += `filter=saved&userId=${userId}`;
      else if (activeTab === "following" && userId)
        endpoint += `filter=following&userId=${userId}`;

      const res = await fetch(endpoint);
      const data = await res.json();
      if (Array.isArray(data)) setImages(data);
    } catch (err) {
      console.error("Gallery load error:", err);
    }
  };

  // ===============================
  // 💬 CHAT LOGIC FUNCTIONS (Polling and Posting)
  // ===============================
  const fetchUserInbox = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${BASE_URL}/users/${userId}/chats`);
      const data = await res.json();
      if (Array.isArray(data)) setUserChats(data);
    } catch (err) {
      console.error("Inbox load failure:", err);
    }
  };

  const fetchRoomMessages = async (chatId: string) => {
    try {
      const res = await fetch(`${BASE_URL}/chats/${chatId}/messages`);
      const data = await res.json();
      if (Array.isArray(data)) setChatMessages(data);
    } catch (err) {
      console.error("Messages sync failure:", err);
    }
  };

  const startConversationWithCreator = async (creatorId: string) => {
    if (!userId) return alert("Please log in to send messages!");
    try {
      const res = await fetch(`${BASE_URL}/chats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: userId, receiverId: creatorId }),
      });
      const chatRoom = await res.json();
      setActiveChat(chatRoom);
      setSelectedCreatorId(null); // Close profile modal smoothly
      setIsInboxOpen(true); // Open message workspace drawer
    } catch (err) {
      console.error("Conversation setup crashed:", err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessageText.trim() || !activeChat || !userId) return;
    try {
      const res = await fetch(`${BASE_URL}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: activeChat.id,
          senderId: userId,
          text: newMessageText,
        }),
      });
      if (res.ok) {
        setNewMessageText("");
        fetchRoomMessages(activeChat.id);
      }
    } catch (err) {
      console.error("Message dispatch failure:", err);
    }
  };

  // React Effect Handlers
  useEffect(() => {
    fetchImages();
  }, [activeTab, userId, searchQuery]);
  useEffect(() => {
    if (userId) fetchUserInbox();
  }, [userId, isInboxOpen]);

  // 🔄 Message Polling Loop interval (Syncs chats every 3 seconds instantly)
  useEffect(() => {
    if (!activeChat) return;
    fetchRoomMessages(activeChat.id);
    const interval = setInterval(() => fetchRoomMessages(activeChat.id), 3000);
    return () => clearInterval(interval);
  }, [activeChat]);

  // ===============================
  // Core Feature Interactions
  // ===============================
  const handleUpload = async () => {
    if (!file || !userId) return alert("File & Authentication required!");
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
      if (!res.ok) throw new Error("Upload failed");
      setStatus("Success!");
      await fetchImages();
      setTimeout(() => {
        setIsUploadOpen(false);
        setStatus("");
        setFile(null);
      }, 1500);
    } catch (err) {
      setStatus("Upload failed!");
    }
  };

  const handleLike = async (imgId: string) => {
    if (!userId) return alert("Login to like!");
    try {
      await fetch(`${BASE_URL}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, imageId: imgId }),
      });
      fetchImages();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (imgId: string) => {
    if (!userId) return alert("Please sign in to save pins!");
    try {
      const res = await fetch(`${BASE_URL}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, imageId: imgId }),
      });
      if (res.ok) {
        fetchImages();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFollowToggle = async (creatorId: string) => {
    if (!userId) return alert("Please sign in to follow!");
    try {
      const res = await fetch(`${BASE_URL}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followerId: userId, followingId: creatorId }),
      });
      if (res.ok) {
        const profileRes = await fetch(`${BASE_URL}/profile/${creatorId}`);
        const profileData = await profileRes.json();
        setCreatorProfile(profileData);
        setIsFollowingCreator(!isFollowingCreator);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className='min-h-screen bg-black text-white font-sans overflow-x-hidden'>
      {/* NAVBAR */}
      <nav className='flex justify-between items-center p-6 sticky top-0 bg-black/80 backdrop-blur-md z-40 border-b border-zinc-800 gap-4'>
        <h1
          className='text-3xl font-bold text-red-600 cursor-pointer'
          onClick={() => {
            setSearchQuery("");
            setActiveTab("all");
          }}
        >
          PicScale
        </h1>

        {/* SEARCH BAR */}
        <div className='flex-1 max-w-xl mx-4 relative hidden sm:block'>
          <span className='absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold'>
            🔍
          </span>
          <input
            type='text'
            placeholder='Search categories (Nature, Tech, Abstract)...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full bg-zinc-800 text-white pl-12 pr-4 py-2.5 rounded-full outline-none focus:bg-zinc-700 text-sm transition-all'
          />
        </div>

        <div className='flex gap-4 items-center'>
          <SignedIn>
            {/* 💬 INBOX DRAWER TRIGGER BUTTON */}
            <button
              onClick={() => setIsInboxOpen(true)}
              className='relative p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-full transition text-lg'
              title='Open Messages'
            >
              💬
            </button>

            <button
              onClick={() => setIsUploadOpen(true)}
              className='bg-red-600 hover:bg-red-700 px-6 py-2 rounded-full font-bold transition'
            >
              Create
            </button>
            <UserButton />
          </SignedIn>

          <SignedOut>
            <div className='bg-zinc-800 hover:bg-zinc-700 px-6 py-2 rounded-full font-bold cursor-pointer'>
              <SignInButton mode='modal' fallbackRedirectUrl='/' />
            </div>
          </SignedOut>
        </div>
      </nav>

      {/* TABS CONTROLLER */}
      <div className='flex justify-center gap-6 mt-6 text-sm font-bold'>
        {["all", "following", "saved"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 rounded-full transition-all capitalize ${
              activeTab === tab
                ? "bg-white text-black"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {tab === "all"
              ? "Explore All"
              : tab === "following"
                ? "Following Feed"
                : "Saved Pins"}
          </button>
        ))}
      </div>

      {/* GALLERY GRID */}
      <main className='max-w-7xl mx-auto p-6'>
        {images.length === 0 ? (
          <div className='flex justify-center h-64 text-zinc-500 items-center animate-pulse'>
            No pins found.
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
                  alt='Post feed image'
                />
                <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all p-4 flex flex-col justify-between rounded-2xl'>
                  <div className='flex justify-end gap-2 items-start'>
                    <div className='flex flex-col items-center gap-1'>
                      <button
                        onClick={() => handleLike(img.id)}
                        className={`backdrop-blur-md p-2 rounded-full transition text-lg ${img.isLikedByMe ? "bg-red-600/80 text-white" : "bg-zinc-100/20 text-white"}`}
                      >
                        ❤️
                      </button>
                      <span className='text-[11px] font-bold text-white bg-black/50 px-2 py-0.5 rounded-full'>
                        {img.likeCount || 0} likes
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSave(img.id);
                      }}
                      className='bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full font-bold text-sm shadow-md'
                    >
                      Save
                    </button>
                  </div>
                  <div className='flex justify-between items-center mt-auto w-full'>
                    <span
                      onClick={() => {
                        setSelectedCreatorId(img.userId);
                        setCreatorProfile(null);
                        const pRes = fetch(`${BASE_URL}/profile/${img.userId}`)
                          .then((r) => r.json())
                          .then((d) => setCreatorProfile(d));
                        if (userId) {
                          fetch(
                            `${BASE_URL}/follow/check?followerId=${userId}&followingId=${img.userId}`,
                          )
                            .then((r) => r.json())
                            .then((c) => setIsFollowingCreator(c.isFollowing));
                        }
                      }}
                      className='text-xs font-medium text-white/90 hover:underline cursor-pointer truncate max-w-[100px]'
                    >
                      @{img.userId ? img.userId.slice(0, 8) : "creator"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* UPLOAD PIN MODAL */}
      {isUploadOpen && (
        <div className='fixed inset-0 bg-black/90 flex justify-center items-center z-50 p-4'>
          <div className='bg-zinc-900 p-8 rounded-3xl w-full max-w-lg relative border border-zinc-800 shadow-2xl'>
            <button
              onClick={() => setIsUploadOpen(false)}
              className='absolute top-4 right-4 text-zinc-400 hover:text-white font-bold text-lg p-2'
            >
              ✕
            </button>
            <h2 className='text-2xl mb-6 font-bold'>Create Pin</h2>
            <label className='flex items-center justify-center w-full h-52 border-2 border-dashed border-zinc-700 rounded-2xl cursor-pointer hover:border-red-500 transition overflow-hidden mb-5 bg-black/30'>
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
                </div>
              )}
              <input
                type='file'
                accept='image/*'
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className='hidden'
              />
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className='w-full mb-6 p-3 bg-zinc-800 rounded-xl text-white outline-none border border-zinc-700'
            >
              <option>Abstract</option>
              <option>Nature</option>
              <option>Tech</option>
              <option>Portrait</option>
            </select>
            <button
              onClick={handleUpload}
              className='bg-red-600 hover:bg-red-700 w-full py-3 rounded-xl font-bold'
            >
              {status || "Upload"}
            </button>
          </div>
        </div>
      )}

      {/* CREATOR PROFILE MODAL */}
      {selectedCreatorId && creatorProfile && (
        <div className='fixed inset-0 bg-black/95 overflow-y-auto z-50 p-6 flex flex-col items-center'>
          <div className='w-full max-w-5xl flex justify-start mb-8'>
            <button
              onClick={() => {
                setSelectedCreatorId(null);
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
            <h2 className='text-2xl font-bold mb-2'>
              @{selectedCreatorId.slice(0, 12)}...
            </h2>
            <div className='flex gap-6 text-sm text-zinc-400 mb-5 font-semibold'>
              <span>{creatorProfile.followers} Followers</span>
              <span>•</span>
              <span>{creatorProfile.following} Following</span>
            </div>

            {/* INTERACTION HUB ROW */}
            <div className='flex gap-4 items-center'>
              {userId !== selectedCreatorId && (
                <>
                  <button
                    onClick={() => handleFollowToggle(selectedCreatorId)}
                    className={`px-8 py-3 rounded-full font-bold text-sm transition ${isFollowingCreator ? "bg-zinc-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}`}
                  >
                    {isFollowingCreator ? "Following" : "Follow"}
                  </button>
                  {/* 💬 INLINE CONVERSATION TRIGGER BUTTON */}
                  <button
                    onClick={() =>
                      startConversationWithCreator(selectedCreatorId)
                    }
                    className='bg-zinc-800 hover:bg-zinc-700 px-6 py-3 rounded-full font-bold text-sm transition flex items-center gap-2'
                  >
                    💬 Message
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 💬 FLOATING SLIDING CHAT INBOX DRAWER SIDEBAR */}
      {isInboxOpen && (
        <div className='fixed inset-y-0 right-0 w-full max-w-md bg-zinc-950 border-l border-zinc-800 shadow-2xl z-50 flex flex-col animate-slide-in'>
          {/* Header */}
          <div className='p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900'>
            <h2 className='text-xl font-bold flex items-center gap-2'>
              💬 Messages Hub
            </h2>
            <button
              onClick={() => {
                setIsInboxOpen(false);
                setActiveChat(null);
              }}
              className='text-zinc-400 hover:text-white font-bold p-1'
            >
              ✕
            </button>
          </div>

          <div className='flex-1 flex overflow-hidden'>
            {/* Rooms List View */}
            {!activeChat ? (
              <div className='w-full overflow-y-auto p-4 space-y-2'>
                <p className='text-xs text-zinc-500 uppercase font-bold tracking-wider mb-3'>
                  Your Conversations
                </p>
                {userChats.length === 0 ? (
                  <p className='text-zinc-500 text-sm text-center py-8'>
                    No active chats. Message a creator to start!
                  </p>
                ) : (
                  userChats.map((chat) => {
                    const peerId =
                      chat.userOneId === userId
                        ? chat.userTwoId
                        : chat.userOneId;
                    return (
                      <div
                        key={chat.id}
                        onClick={() => setActiveChat(chat)}
                        className='p-4 bg-zinc-900 hover:bg-zinc-800 rounded-2xl cursor-pointer border border-zinc-800/60 transition'
                      >
                        <p className='font-bold text-sm text-white'>
                          @{peerId.slice(0, 12)}...
                        </p>
                        <p className='text-xs text-zinc-400 truncate mt-1'>
                          Click to open chat window
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* Active Chat Message Pane View */
              <div className='w-full flex flex-col h-full bg-zinc-950'>
                <div className='p-3 bg-zinc-900/60 border-b border-zinc-800 text-xs flex items-center gap-2'>
                  <button
                    onClick={() => setActiveChat(null)}
                    className='text-red-500 font-bold hover:underline'
                  >
                    ← Back to List
                  </button>
                  <span className='text-zinc-400'>| Chatting with Creator</span>
                </div>

                {/* Message display screen list */}
                <div className='flex-1 overflow-y-auto p-4 space-y-3 flex flex-col'>
                  {chatMessages.map((msg) => {
                    const isMe = msg.senderId === userId;
                    return (
                      <div
                        key={msg.id}
                        className={`max-w-[75%] p-3.5 rounded-2xl text-sm ${
                          isMe
                            ? "bg-red-600 text-white self-end rounded-tr-none"
                            : "bg-zinc-800 text-zinc-100 self-start rounded-tl-none"
                        }`}
                      >
                        <p className='break-words leading-relaxed'>
                          {msg.text}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Message input dynamic console dispatch */}
                <div className='p-4 bg-zinc-900 border-t border-zinc-800 flex gap-2 items-center'>
                  <input
                    type='text'
                    placeholder='Type a message...'
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendMessage();
                    }}
                    className='flex-1 bg-zinc-800 px-4 py-2.5 rounded-full text-sm text-white outline-none focus:bg-zinc-700 border border-transparent focus:border-zinc-600 transition'
                  />
                  <button
                    onClick={handleSendMessage}
                    className='bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-full text-xs uppercase tracking-wider transition shadow-md'
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
