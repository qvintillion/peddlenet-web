import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Disable tab visibility tracking for cross-room notifications
import '@/utils/tab-visibility-override';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ⭐ THE LANDING PAGE'S FACE, and only the landing page's. It is exposed as its own variable and
// applied via `font-[family-name:var(--font-jetbrains-mono)]` on that page rather than by
// repointing Tailwind's `--font-mono` token — that token is Geist Mono for the whole app
// (the chat included), and swapping it globally to restyle one marketing page would be a very
// large blast radius for a very small gain.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://peddlenet.app'),
  title: "PeddleNet — the festival mesh that works with no signal",
  description: "PeddleNet carries messages phone-to-phone over Bluetooth. No signal, no wifi, no accounts, no servers — your crew stays reachable when the network does not.",
  icons: {
    icon: '/favicon.svg',
    apple: '/peddlenet-logo.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'PeddleNet — the festival mesh that works with no signal',
    description: 'PeddleNet carries messages phone-to-phone over Bluetooth. No signal, no wifi, no accounts, no servers — your crew stays reachable when the network does not.',
    images: ['/peddlenet-logo.svg'],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'PeddleNet — the festival mesh that works with no signal',
    description: 'PeddleNet carries messages phone-to-phone over Bluetooth. No signal, no wifi, no accounts, no servers — your crew stays reachable when the network does not.',
    images: ['/peddlenet-logo.svg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        {/* Load PeerJS from CDN - same version that works in diagnostic */}
        <script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}
