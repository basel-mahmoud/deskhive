import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-jb",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "DeskHive — the calm support desk",
    template: "%s · DeskHive",
  },
  description:
    "DeskHive is a multi-tenant help desk with AI triage, SLA tracking, and role-based teams. Turn inbound chaos into a calm, measurable queue.",
  openGraph: {
    title: "DeskHive — the calm support desk",
    description:
      "Multi-tenant help desk with AI triage, SLA tracking and role-based teams.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0c100f",
  width: "device-width",
  initialScale: 1,
};

// Apply persisted theme before paint to avoid a flash.
const themeScript = `(function(){try{var t=localStorage.getItem('deskhive-theme')||'dark';document.documentElement.classList.add(t);document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang="en" suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        </head>
        <body
          className={`${bricolage.variable} ${inter.variable} ${jetbrains.variable} grain antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
