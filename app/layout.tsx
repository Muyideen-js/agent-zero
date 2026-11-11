import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/jetbrains-mono";
import { Curtain } from "@/components/transition";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Zero · The autonomous company on NEAR",
  description:
    "Give AI a company, a workforce and a treasury. Agent Zero runs an AI-operated business under financial rules enforced by NEAR smart contracts.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Curtain />
      </body>
    </html>
  );
}
