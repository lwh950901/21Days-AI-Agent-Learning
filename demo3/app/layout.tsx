import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProductCraft Tool Calling Demo",
  description: "ProductCraft Tool Calling、工具日志与工具错误展示 Demo",
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
