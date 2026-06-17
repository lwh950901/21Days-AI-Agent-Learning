import "./globals.css";

export const metadata = {
  title: "ProductCraft Checkpoint Demo",
  description: "Module 4 State, Checkpoint, Resume, and HITL demo",
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
