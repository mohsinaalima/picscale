import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className='min-h-screen bg-black flex items-center justify-center p-4'>
      {/* Clerk ka SignUp component automatic form handle karega */}
      <SignUp
        appearance={{
          variables: {
            colorPrimary: "#dc2626", // PicScale ki theme ke hisab se red color
          },
        }}
      />
    </div>
  );
}
