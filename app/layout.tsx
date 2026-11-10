import type { Metadata } from "next";
import PWARegister from "@/components/pwa/PWARegister";
import "./globals.css";
import "./finance/finance.css";
import "./workspace/finance/finance.css";

export const metadata: Metadata = {
  title: {
    default: "Johden Business Consultancy Services | Strategy. Growth. Technology.",
    template: "%s | Johden Business Consultancy Services",
  },
  description:
    "Johden helps businesses grow through business consultancy, marketing and branding, software development, research, analytics and creative services.",
  applicationName: "JBCS Finance",
  manifest: "/manifest.webmanifest",
  themeColor: "#b91c1c",
  appleWebApp: {
    capable: true,
    title: "JBCS Finance",
    statusBarStyle: "default",
  },
  keywords: [
    "business consultancy Uganda",
    "marketing consultancy",
    "software development",
    "business plans",
    "branding",
    "Johden Business Consultancy Services",
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
