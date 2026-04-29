"use client";

import { useRef, useState, useEffect } from "react";

export default function UploadForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [msg, setMsg] = useState("Please select an image");
  const [preview, setPreview] = useState<string | null>(null);

  // Correct cleanup logic
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (preview) {
      setMsg("Sending to server... (Coming soon in Day 6!)");
    } else {
      setMsg("Please select an image first");
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

        {/* File Input */}
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

        {/* Upload Button */}
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
