import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className='min-h-screen bg-black flex items-center justify-center p-4'>
      <SignIn
        routing='path'
        path='/sign-in'
        appearance={{ variables: { colorPrimary: "#dc2626" } }}
      />
    </div>
  );
}
