// ============================================
// Root Layout - SF Pro + Shadows Into Light Fonts
// ============================================

import type { Metadata } from "next";
import { Shadows_Into_Light } from "next/font/google";
import "@/styles/globals.css";
import { APP_NAME, APP_DESCRIPTION } from "@/constants";
import { ToastProvider } from "@/context/ToastContext";
import QueryProvider from "@/components/providers/QueryProvider";
import { GlobalLoader } from "@/components/common/GlobalLoader";
import { Toaster } from "react-hot-toast";

const shadowsIntoLight = Shadows_Into_Light({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-shadows",
  fallback: ["cursive"],
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={shadowsIntoLight.variable}
      suppressHydrationWarning
    >
      <body>
        <GlobalLoader />
        <QueryProvider>
          <ToastProvider>{children}</ToastProvider>
        </QueryProvider>
        <Toaster
          position="bottom-right"
          reverseOrder={false}
          containerStyle={{ zIndex: 999999 }}
        />
      </body>
    </html>
  );
}
