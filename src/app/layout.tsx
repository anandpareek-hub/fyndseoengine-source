import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthSessionProvider from "@/components/SessionProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Webflow SEO Engine - AI-Powered SEO Content Engine",
  description:
    "Autonomous AI agent that plans, writes, and publishes SEO content to Webflow. From goal to published article — fully automated.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${geistMono.variable} font-sans antialiased bg-white text-gray-900 min-h-screen`}>
        <AuthSessionProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster richColors position="top-right" />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
