import './globals.css';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';

config.autoAddCss = false;

export const metadata = {
  title: 'Sequoia Social',
  description: 'Socials Made Spicy',
};

export default function RootLayout({ children }) {
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