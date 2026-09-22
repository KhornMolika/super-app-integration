import InsuranceAppClient from '@/components/InsuranceAppClient';
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
    <InsuranceAppClient
      userName={userName}
      initial={initial}
      isAuthenticated={isAuthenticated}
    />
  );
}
