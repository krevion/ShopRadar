import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ShopRadar',
  description: 'Find it. Compare it. Get it.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
