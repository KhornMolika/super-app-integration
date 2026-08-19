"use client";

import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function RegisterMiniAppLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute permission="miniapp:create">{children}</ProtectedRoute>;
}
