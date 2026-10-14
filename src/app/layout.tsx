
import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { FloatingActions } from "@/components/shared/FloatingActions";
import { AIChatWidget } from "@/components/AIChatWidget";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["200", "300", "400", "500", "700", "800", "900"],
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://lamsa-events.com"),
  title: {
    default: "لمسة إيفنس | لتنظيم وتجهيز المناسبات الفاخرة",
    template: "%s | لمسة إيفنس",
  },
  description:
    "المنصة الأولى لتنظيم المناسبات في السعودية. نجمع بين الفخامة والذكاء الاصطناعي لتصميم وتجهيز حفلات الزفاف والمناسبات الخاصة بدقة متناهية تعكس ذوقك الرفيع.",
  keywords: [
    "تنظيم مناسبات",
    "تنسيق حفلات",
    "حفلات زفاف",
    "قاعات أفراح",
    "لمسة إيفنس",
    "الرياض",
    "السعودية",
    "تصميم مناسبات بالذكاء الاصطناعي",
    "Lamsa Events",
  ],
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "لمسة إيفنس | لتنظيم وتجهيز المناسبات الفاخرة",
    description:
      "المنصة الأولى لتنظيم المناسبات في السعودية. نجمع بين الفخامة والذكاء الاصطناعي لتصميم وتجهيز حفلات الزفاف والمناسبات الخاصة بدقة متناهية تعكس ذوقك الرفيع.",
    url: "https://lamsa-events.com",
    siteName: "لمسة إيفنس",
    images: [
      {
        url: "/hero-bg.jpg",
        width: 1200,
        height: 630,
      },
    ],
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "لمسة إيفنس | لتنظيم وتجهيز المناسبات الفاخرة",
    description:
      "المنصة الأولى لتنظيم المناسبات في السعودية. نجمع بين الفخامة والذكاء الاصطناعي لتصميم وتجهيز حفلات الزفاف والمناسبات الخاصة بدقة متناهية تعكس ذوقك الرفيع.",
    images: ["/hero-bg.jpg"],
  },
  verification: {
    google: "_NigTpcshiczHxe3scwob2ic-0t9unOh62VGNwzTdQA",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "EventPlanner"],
  "name": "لمسة إيفنس للمناسبات الفاخرة (LAMSA EVENTS)",
  "image": "https://lams-event.com/images/1.jpeg",
  "description": "منصة رائدة لتنظيم وتجهيز المناسبات وحفلات الزفاف الفاخرة في الرياض.",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "شارع العليا",
    "addressLocality": "الرياض",
    "addressRegion": "الرياض",
    "postalCode": "12211",
    "addressCountry": "SA"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 24.7136,
    "longitude": 46.6753
  },
  "telephone": "+966500000000",
  "priceRange": "$$$$"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${tajawal.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground transition-colors duration-300">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <Navbar />
            <main className="flex-1 flex flex-col">{children}</main>
            <Footer />
            <FloatingActions />
            <AIChatWidget />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
