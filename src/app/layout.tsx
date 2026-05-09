import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "wetrip — 친구들과 함께 짜는 여행 플래너",
  description: "여행 코드 하나로 친구들과 같이 일정을 블록으로 짜고, 사진을 모으고, 자동 스토리로 추억을 남기세요.",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0ea5e9"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
