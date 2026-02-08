import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistemaxi",
  description: "ERP/CRM para gerenciamento de projetos",
  icons: {
    icon: "https://i.imgur.com/PrOd6nf.png",
    shortcut: "https://i.imgur.com/PrOd6nf.png",
    apple: "https://i.imgur.com/PrOd6nf.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
