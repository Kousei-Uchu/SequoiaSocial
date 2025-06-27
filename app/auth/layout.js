import Script from 'next/script';

export default function AuthLayout({ children }) {
  return (
    <>
      <Script
        src="https://www.google.com/recaptcha/api.js"
        strategy="afterInteractive"
      />
      {children}
    </>
  );
}
