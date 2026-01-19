import type { Metadata } from "next";
import "./globals.css";
import { StateProvider } from "./components/StateProvider";

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
      <body className="h-full m-0 bg-gray-100 min-h-screen">
        <StateProvider>
          {children}
        </StateProvider>
      </body>
    </html>
  );
}
