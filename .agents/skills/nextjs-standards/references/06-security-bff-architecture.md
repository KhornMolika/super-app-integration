# 06. Next.js Security BFF (Backend for Frontend) Pattern

This document establishes architectural standards for implementing the **Security BFF (Backend for Frontend)** pattern in Next.js applications communicating with downstream backends (e.g. NestJS, microservices, or databases).

---

## 1. The Core Problem: Insecure Direct-to-Backend Calls

Storing JWT access tokens or refresh tokens in browser localStorage, sessionStorage, or JavaScript-accessible memory exposes the entire application to **token theft via Cross-Site Scripting (XSS)**. Any malicious npm package or injected script can extract the token and impersonate the user.

`
❌ INSECURE DIRECT CALLS:
Browser (localStorage: JWT) ──[Direct API Call + Bearer Token]──► Backend (Public Internet)
* Token vulnerable to XSS theft
* Backend must be exposed to public internet
* Secret keys cannot be safely stored
`

---

## 2. The Solution: The Next.js Security BFF Pattern

In the **Token-Mediating BFF Pattern**, the browser client **never sees or handles raw JWT access tokens**. Next.js acts as a secure, authenticated gateway.

`
✅ NEXT.JS SECURITY BFF:
┌─────────────────┐    Encrypted HttpOnly Cookie    ┌──────────────────┐    Authorization: Bearer <token>    ┌──────────────────┐
│ Browser Client  │ ◄─────────────────────────────► │ Next.js Server   │ ◄─────────────────────────────────► │ NestJS Backend   │
│ (Zero Secrets)  │         (XSS-proof)             │ (BFF / Node.js)  │           (Private VPC)             │ (Private Subnet) │
└─────────────────┘                                 └──────────────────┘                                     └──────────────────┘
`

### Key Security Advantages:
1. **XSS Immunity for Tokens**: Tokens live exclusively in encrypted, HttpOnly, Secure, SameSite=Strict cookies that browser JavaScript cannot read.
2. **Third-Party Secret Concealment**: Private API keys (Stripe, OpenAI, AWS) remain strictly on the server runtime.
3. **Private Network Isolation**: Downstream NestJS and database services remain enclosed in a private VPC/subnet and do not require public IP exposure.
4. **Data Sanitization & PII Protection**: Next.js strips sensitive database metadata (e.g., password hashes, internal tenant IDs) before sending data to the client.
5. **Native CSRF Protection**: Next.js Server Actions automatically enforce Origin and Host header verification.

---

## 3. Implementation Blueprint

### A. Login & Token Encapsulation (Server Action)
`	ypescript
// src/app/login/actions.ts
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData) {
  const email = formData.get('email');
  const password = formData.get('password');

  // Call internal NestJS backend over private network
  const response = await fetch(${process.env.INTERNAL_BACKEND_URL}/api/v1/auth/login, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    return { success: false, error: 'Invalid credentials' };
  }

  const { accessToken } = await response.json();

  // Store in encrypted HttpOnly cookie
  const cookieStore = await cookies();
  cookieStore.set('session_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 1 day
  });

  redirect('/dashboard');
}
`

---

### B. Authenticated Data Fetching in Server Components
`	sx
// src/app/dashboard/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

async function fetchUserProfile() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  if (!token) {
    redirect('/login');
  }

  // Next.js server securely forwards the Bearer token
  const res = await fetch(${process.env.INTERNAL_BACKEND_URL}/api/v1/user/profile, {
    headers: {
      Authorization: Bearer ,
    },
    // Optional: Next.js cache settings
    next: { tags: ['user-profile'] },
  });

  if (!res.ok) {
    redirect('/login');
  }

  return await res.json();
}

export default async function DashboardPage() {
  const profile = await fetchUserProfile();

  return (
    <main>
      <h1>Welcome back, {profile.name}</h1>
    </main>
  );
}
`

---

### C. Client Proxy Route Handler (For Interactive Client Queries)
When interactive client components (e.g. TanStack Query or SWR) need to make authenticated requests, route through a Next.js Route Handler rather than calling the backend directly:

`	ypescript
// src/app/api/proxy/[...path]/route.ts
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { path } = await params;
  const backendUrl = ${process.env.INTERNAL_BACKEND_URL}/api/v1/;

  const res = await fetch(backendUrl, {
    headers: {
      Authorization: Bearer ,
    },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
`

---

## 4. Architectural Rules for Security BFF

1. **NEVER export NEXT_PUBLIC_ for sensitive backend URLs or secrets**: Only public endpoints belong in NEXT_PUBLIC_.
2. **Always set httpOnly: true and secure: true**: Never allow client scripts to read session cookies.
3. **Always use sameSite: 'strict' or 'lax'**: Prevents cookie injection via cross-site requests.
4. **Log Out via Server Action**: Clear the session cookie server-side via cookieStore.delete('session_token').
