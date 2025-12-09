
import { FirebaseClientProvider } from "@/firebase";

export default function ActivateAccountLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <FirebaseClientProvider>{children}</FirebaseClientProvider>;
}
