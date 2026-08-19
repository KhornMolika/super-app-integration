"use client";

import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function MiniAppsLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute permission="miniapp:read">{children}</ProtectedRoute>;
}
