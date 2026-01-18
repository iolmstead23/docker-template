import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '3E Data Toolkit',
  description: 'Microservices Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#f5f5f5',
        minHeight: '100vh'
      }}>
        {children}
      </body>
    </html>
  );
}
