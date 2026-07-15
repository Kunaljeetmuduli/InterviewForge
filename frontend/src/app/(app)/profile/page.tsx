import type { Metadata } from "next";

import { ProfileForm } from "@/components/profile-form";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <>
      <p className="text-sm font-semibold text-primary">Account</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Profile</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
        Keep the role context used to shape your interview preparation current.
      </p>
      <ProfileForm />
    </>
  );
}
