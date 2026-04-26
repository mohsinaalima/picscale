

import UploadForm from "./components/UploadForm";

export default function Home() {
  return (
    <main className='min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4'>
      <h1>PicScale</h1>
      <UploadForm />
    </main>
  );
}
