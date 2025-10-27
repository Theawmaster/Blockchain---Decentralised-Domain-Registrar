import {Web3Provider} from "@/lib/web3/Web3Provider";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
            <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
