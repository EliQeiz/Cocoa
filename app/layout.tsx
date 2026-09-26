import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'AuraFlow CocoaTrace', description: 'Traceability intelligence for Ghana cocoa supply chains' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
