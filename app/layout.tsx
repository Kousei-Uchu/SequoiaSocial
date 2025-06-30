// app/layout.tsx
import './globals.css';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

config.autoAddCss = false;

export const metadata = {
  title: 'Sequoia Social',
  description: 'Socials Made Spicy',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // Patch setImmediate in browser only
  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.setImmediate === "undefined") {
      (window as any).setImmediate = (fn: (...args: any[]) => void, ...args: any[]) =>
        setTimeout(fn, 0, ...args);
    }
  }, []);

  return (
    <html lang="en">
      <body>
        <Header />
        <div className="main-layout">
          <Sidebar />
          <main className="page-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}