import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "BuildVision 3D · Không gian từ mặt bằng",
  description: "Workspace local để dựng và kiểm tra mô hình 3D từ mặt bằng.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
