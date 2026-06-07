"use client";

import { useState, useEffect, type ReactNode } from "react";
import { ClerkProvider, useAuth, useUser } from "@clerk/nextjs";
import { useAppStore } from "@/store/useAppStore";

function ClerkTokenSync() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const setAuthToken = useAppStore((s) => s.setAuthToken);
  const setUser = useAppStore((s) => s.setUser);

  useEffect(() => {
    if (user) {
      setUser(user.id);
    }
  }, [user, setUser]);

  useEffect(() => {
    let cancelled = false;
    async function sync() {
      const token = await getToken();
      if (!cancelled) setAuthToken(token || null);
    }
    sync();
    const interval = setInterval(sync, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [getToken, setAuthToken]);

  return null;
}

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function Providers({ children }: { children: ReactNode }) {
  const inner = children;

  if (!clerkKey) {
    return inner;
  }

  return (
    <ClerkProvider publishableKey={clerkKey}>
      <ClerkTokenSync />
      {inner}
    </ClerkProvider>
  );
}