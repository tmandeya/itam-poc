import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Magaya Mining — IT Asset Management',
  description: 'Multi-Site IT Asset Management System — Magaya Mining',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
