import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Glasshouse",
  description: "Every stock portfolio on Solana is public. Glasshouse ranks them.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
