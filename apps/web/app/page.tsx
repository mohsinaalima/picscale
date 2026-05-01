"use client";
import { useEffect, useState } from "react";

export default function Gallery() {
  const [images, setImages] = useState([]);

  const fetchImages = async () => {
    const res = await fetch("http://localhost:5000/images");
    const data = await res.json();
    setImages(data);
  };

  useEffect(() => {
    fetchImages();
    const interval = setInterval(fetchImages, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className='mt-10'>
      <h2 className='text-2xl font-bold mb-4'>Processed Gallery</h2>

      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        {images.map((img: any) => (
          <div key={img.id} className='border p-2 rounded shadow-sm'>
            <img
              src={`http://localhost:5000/uploads/thumb_${img.filename}`}
              alt='Thumbnail'
              className='w-full h-auto rounded'
            />
            <p className='text-xs mt-2 text-gray-500'>{img.filename}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
