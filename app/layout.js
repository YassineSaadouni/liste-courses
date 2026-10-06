import "./globals.css";

export const metadata = { title: "Liste de courses" };

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
