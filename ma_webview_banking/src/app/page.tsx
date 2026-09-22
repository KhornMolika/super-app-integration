import BankingAppClient from '@/components/BankingAppClient';
import { verifySsoToken } from '@/lib/auth';

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const token = params?.token;

  const { userName, initial, isAuthenticated } = await verifySsoToken(token);

  return (
    <BankingAppClient
      userName={userName}
      initial={initial}
      isAuthenticated={isAuthenticated}
    />
  );
}
