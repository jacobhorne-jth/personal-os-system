import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { PwaRegister } from "@/components/pwa-register";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Jacob OS",
  description: "Calendar-first personal life operating system",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Jacob OS",
    statusBarStyle: "black-translucent"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("jacob-os-theme")||"light";document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){}`
          }}
        />
      </head>
      <body>
        <Providers>
          <PwaRegister />
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
