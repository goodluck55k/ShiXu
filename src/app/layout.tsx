import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppFrame } from "@/components/AppFrame";

export const metadata: Metadata = {
  title: "拾绪 ShiXu · 情绪陪伴日记",
  description:
    "记录日常心情，和陪伴企鹅一起慢慢生活。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="antialiased"><AppFrame>{children}</AppFrame></body>
    </html>
  );
}
