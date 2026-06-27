"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

export default function ClerkAuthSync() {
  const { getToken, userId, isSignedIn } = useAuth();
  const setAuthToken = useAppStore((s) => s.setAuthToken);
  const setUser = useAppStore((s) => s.setUser);

  useEffect(() => {
    if (!isSignedIn || !userId) {
      setAuthToken(null);
      return;
    }

    setUser(userId);
    getToken().then(setAuthToken);
  }, [isSignedIn, userId, getToken, setAuthToken, setUser]);

  return null;
}
