import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gachapon Machine',
  description: '3D Gachapon Machine - Win Activity Credits',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
