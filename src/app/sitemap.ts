import type { MetadataRoute } from "next";
import { mockStore } from "@/lib/mock-store";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://pixelbids.lol";
  const staticPages = ["", "/today", "/leaderboard", "/stats", "/rules", "/about", "/terms", "/privacy", "/refund"].map(p => ({
    url: `${base}${p}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: p === "" || p === "/today" ? 1 : 0.6,
  }));
  const blocks = mockStore.blocks.filter(b=>b.status==="active").map(b=> ({
    url: `${base}/block/${b.id}`,
    lastModified: new Date(b.rentedAt || new Date()),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
  return [...staticPages, ...blocks];
}
