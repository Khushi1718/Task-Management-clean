import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/index.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Workflow Pro",
  description: "Experience My India workflow tracking",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.className}>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

