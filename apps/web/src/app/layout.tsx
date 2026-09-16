import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kenzo EHS — Enterprise EHS Platform',
  description: 'Enterprise Environment, Health & Safety Management Platform by Kenzo Infosystems',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
