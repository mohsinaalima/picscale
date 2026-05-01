"use client";

import { useRef, useState, useEffect } from "react";

export default function UploadForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("Please select an image");
  const [preview, setPreview] = useState<string | null>(null);

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    if (!preview) return;
    return () => {
      URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFileChange = () => {
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      setMsg(`File "${file.name}" selected.`);
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];

    if (!file) return;

    setMsg("Uploading to PicScale API...");

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      // ✅ FIX: Check for both 201 (Created) and 202 (Accepted)
      if (response.ok || response.status === 201 || response.status === 202) {
        setMsg(`Success! ID: ${data.id}. Worker will resize it soon.`);
        // Optional: Clear preview after success
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        // If server returns 500, show the error from the server
        setMsg(`Upload failed: ${data.error || "Check API logs"}`);
      }
    } catch (error) {
      console.error("Connection error:", error);
      setMsg(
        "Could not connect to the API server. Is it running on port 5000?",
      );
    }
  };

  return (
    <div className='p-10 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md'>
      <form onSubmit={handleSubmit} className='flex flex-col gap-6'>
        <h2 className='text-xl font-bold text-center'>PicScale Upload</h2>

        {/* Preview Window */}
        {preview ? (
          <div className='relative w-full h-48 rounded-lg overflow-hidden border-2 border-violet-500 shadow-lg'>
            <img
              src={preview}
              alt='Preview'
              className='w-full h-full object-cover'
            />
          </div>
        ) : (
          <div className='w-full h-48 bg-slate-800 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-600 text-slate-500'>
            No Preview Available
          </div>
        )}

        <input
          type='file'
          ref={fileInputRef}
          onChange={handleFileChange}
          accept='image/*'
          className='block w-full text-sm text-slate-400
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-violet-50 file:text-violet-700
            hover:file:bg-violet-100 cursor-pointer'
        />

        <button
          type='submit'
          disabled={!preview}
          className='bg-violet-600 p-3 rounded-lg font-bold hover:bg-violet-500 transition disabled:opacity-50'
        >
          Upload Image
        </button>
      </form>

      <p className='mt-6 text-violet-400 italic text-sm text-center'>{msg}</p>
    </div>
  );
}
