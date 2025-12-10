import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirige permanentemente a la página de login
  redirect('/login');
}
