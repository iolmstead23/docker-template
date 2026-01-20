import type { Metadata } from "next";
import "./globals.css";
import { StateProvider } from "./components/StateProvider";
import { ThemeProvider } from "./components/ThemeProvider";
import Shell from "./components/shell";

export const metadata: Metadata = {
  title: "3E Data Toolkit",
  description: "Microservices Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full m-0 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <StateProvider>
          <ThemeProvider>
            <Shell>
              {children}
            </Shell>
          </ThemeProvider>
        </StateProvider>
      </body>
    </html>
  );
}
