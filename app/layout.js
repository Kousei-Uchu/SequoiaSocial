import './globals.css';
import Head from 'next/head';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

export const metadata = {
  title: 'Sequoia Social',
  description: 'Socials Made Spicy',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <Head>
        {/* Font Awesome CDN */}
        <link rel="stylesheet" href="https://use.fontawesome.com/releases/v6.4.0/css/all.css"></link>
      </Head>
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