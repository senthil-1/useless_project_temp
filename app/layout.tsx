import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata = {
  title: 'Ministry of Useless Affairs',
  description: "The Republic's most unnecessarily official digital portal.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="paper-noise min-h-screen bg-[#f4efe4] text-[#172235]">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
