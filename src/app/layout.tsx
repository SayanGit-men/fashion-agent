import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fashion Agent | Private Virtual Try-On",
  description:
    "Privacy-first virtual try-on frontend with local mock generation workflow for customer, top, and bottom image inputs.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
