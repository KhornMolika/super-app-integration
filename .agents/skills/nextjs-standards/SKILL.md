---
name: nextjs-standards
description: >-
  Provides architectural guidelines for Next.js and React applications, including Server vs Client Component
  boundaries, Security BFF (Backend for Frontend) patterns, Server Actions, caching strategies, Zod form validation, custom hooks, and Core Web Vitals optimization.
---

# Next.js & React Architecture Standards

Use this skill when developing, refactoring, or reviewing web applications built with Next.js (App Router or Pages Router) and React.

---

## 1. Core Component & State Rules

1. **Page Files are Route Coordinators**:
   * Keep page.tsx under **100–150 lines**. A page sets up layouts and metadata, but delegates rendering to domain components.
2. **Push 'use client' Down to the Leaves**:
   * Keep pages and layouts as React Server Components (RSC). Only mark interactive leaf components (modals, dropdowns, inputs) with 'use client'.
3. **Form Schema Separation**:
   * All form schemas and field regexes live in src/lib/validators/<domain>.validator.ts using Zod. Never inline validation rules in JSX.
4. **Stateful Modal Isolation**:
   * Modals with multi-step inputs or async submissions must maintain their own state in a separate component to prevent unnecessary parent re-renders. Use Intercepting/Parallel routes (@modal) for shareable modal URLs.
5. **Cross-Cutting Custom Hooks**:
   * Extract RBAC checks, stream listeners, and workflow sequences into src/hooks/ (e.g., useAuth(), useConfirm()).

---

## 2. Security BFF (Backend for Frontend) Architecture

1. **Token-Mediating BFF**:
   * ❌ **NEVER** store JWT access tokens or refresh tokens in localStorage or JavaScript-readable cookies (vulnerable to XSS theft).
   * ✅ Store tokens in **HttpOnly, Secure, SameSite=Strict** cookies via Next.js Server Actions or Route Handlers.
2. **Private Network Forwarding**:
   * The browser client only communicates with Next.js. Next.js extracts the cookie and forwards Authorization: Bearer <token> to the downstream NestJS backend over a private network.
3. **Third-Party Secret Concealment**:
   * Private keys (Stripe, OpenAI, AWS) stay strictly on the Next.js server runtime—never exposed with NEXT_PUBLIC_.
4. **Payload Sanitization**:
   * Next.js strips sensitive database metadata and PII before returning data to the client.

---

## 3. Data Fetching & Performance Rules

1. **Server-First Fetching**: Fetch data in Server Components; use React cache() for request memoization within the render tree.
2. **Explicit Caching & Revalidation**:
   * Use use cache or unstable_cache for expensive DB/API queries.
   * Trigger on-demand revalidation via evalidateTag() or evalidatePath() inside Server Actions after mutations.
3. **Client-Side Promise Unwrapping**:
   * Pass promises from Server Components to Client Components and unwrap them using React's native use() hook without heavy client fetch libraries.
4. **Zero-CLS Assets**:
   * Always load fonts via 
ext/font/google (self-hosted at build time).
   * Optimize hero images using <Image priority sizes=... fill />.

---

## 4. In-Depth Reference Guides

For code samples and comprehensive guidelines:
* [01. Modular Components & Boundaries](./references/01-modular-components-and-pages.md)
* [02. Forms, Zod Validation & Server Actions](./references/02-forms-and-validation.md)
* [03. Custom Hooks & State Organization](./references/03-hooks-and-state.md)
* [04. Data Fetching, Caching & Revalidation](./references/04-caching-and-data-fetching.md)
* [05. Routing, SEO & Core Web Vitals](./references/05-routing-seo-and-performance.md)
* [06. Security BFF (Backend for Frontend) Pattern](./references/06-security-bff-architecture.md)
