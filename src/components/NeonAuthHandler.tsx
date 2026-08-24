"use client";
import { useEffect } from "react";

export default function NeonAuthHandler() {
  useEffect(() => {
    // If Neon Auth sets a token in localStorage or cookie via its JS SDK, sync it
    // For now we just log that Neon Auth JWKS is available
    const authUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL;
    if (authUrl) {
      console.log("[Neon Auth] configured:", authUrl);
    }
  }, []);
  return null;
}
