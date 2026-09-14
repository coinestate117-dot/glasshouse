import type { Metadata, Viewport } from "next";
import "./globals.css";
import WalletProvider from "@/components/WalletProvider";
import TabBar from "@/components/TabBar";
import DesktopNav from "@/components/DesktopNav";

export const metadata: Metadata = {
  title: "Glasshouse",
  description:
    "Every stock portfolio on Solana is public. Glasshouse ranks them.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "Glasshouse",
    description:
      "Every stock portfolio on Solana is public. Glasshouse ranks them.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Glasshouse",
    description:
      "Every stock portfolio on Solana is public. Glasshouse ranks them.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          <DesktopNav />
          <main
            style={{
              maxWidth: "var(--max-width)",
              margin: "0 auto",
            }}
          >
            {children}
          </main>
          <TabBar />
        </WalletProvider>
      </body>
    </html>
  );
}
