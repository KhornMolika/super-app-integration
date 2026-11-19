'use client';

import { useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

function RedirectToSecurityContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const id = params?.id as string;
    if (id) {
      const ver = searchParams?.get('version');
      const target = ver ? `/miniapps/${id}/security?version=${encodeURIComponent(ver)}` : `/miniapps/${id}/security`;
      router.replace(target);
    }
  }, [params, searchParams, router]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
    </div>
  );
}

export default function RedirectToSecurityPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <RedirectToSecurityContent />
    </Suspense>
  );
}
