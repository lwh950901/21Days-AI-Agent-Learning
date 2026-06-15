import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProductCraft Module 2 Demo",
  description: "Structured Output 与 Tool Calling 学习 Demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
