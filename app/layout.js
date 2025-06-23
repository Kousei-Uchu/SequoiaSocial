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
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" 
          integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" 
          crossOrigin="anonymous" 
          referrerPolicy="no-referrer" 
        />
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