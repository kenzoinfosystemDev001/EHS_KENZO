import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../lib/auth-context';
import { ApiTokenSync } from '../lib/api-token-sync';

export const metadata: Metadata = {
  title: 'Kenzo EHS Platform',
  description: 'Enterprise Environment, Health & Safety Management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ApiTokenSync />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
