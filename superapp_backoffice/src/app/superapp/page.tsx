import { redirect } from 'next/navigation';

export default function SuperAppRedirectPage() {
  redirect('/releases');
}
