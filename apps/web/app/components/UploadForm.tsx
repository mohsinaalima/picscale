"use client";

import { useRef, useState } from "react";

export default function UploadForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<string>("Waiting for file...");

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    const file = fileInputRef.current?.files?.[0];

    if (!file) {
      setStatus("No file selected!");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setStatus("Only image files allowed!");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setStatus("File too large! Max 5MB allowed.");
      return;
    }

    setStatus(`Selected: ${file.name}. Ready to upload!`);
  };

  return (
    <div className='p-6 bg-white rounded-xl shadow-md space-y-4 border border-gray-200'>
      <form onSubmit={handleUpload} className='flex flex-col space-y-4'>
        <label className='text-lg font-semibold text-gray-700'>
          Upload High-Res Image
        </label>

        <input
          type='file'
          ref={fileInputRef}
          className='file:bg-blue-50 file:text-blue-700 file:border-0 file:rounded-md file:px-4 file:py-2 hover:file:bg-blue-100 cursor-pointer'
        />

        <button
          type='submit'
          className='bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200'
        >
          Process Image
        </button>
      </form>

      <p className='text-sm text-gray-500 italic'>Status: {status}</p>
    </div>
  );
}
