export default function AuthLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          src="https://www.google.com/recaptcha/api.js"
          async
          defer
        ></script>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
