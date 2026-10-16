# 04. Next.js Data Fetching, Caching & Revalidation

This document defines modern App Router standards for data fetching, caching strategies, and on-demand cache invalidation.

---

## 1. The Modern App Router Mental Model

* **Server-First Data Fetching**: Fetch data directly in Server Components using sync/await or database queries. Credentials never touch the client, and network waterfalls are minimized.
* **Dynamic by Default**: Modern Next.js treats data fetching as dynamic by default. Caching is an explicit architectural choice.
* **Automatic Request Memoization**: Identical etch calls or functions wrapped in React's cache() within the same render tree are deduplicated automatically. You can fetch data directly inside the component that needs it without prop-drilling.

---

## 2. Server Caching Strategies

### Function & Data-Level Caching (use cache / unstable_cache)
For expensive database computations or third-party API reads:

`	ypescript
// src/lib/data/products.ts
import { db } from '@/lib/db';
import { cache } from 'react';

// Request memoization for ORM calls in the same render pass
export const getProductById = cache(async (id: string) => {
  return await db.product.findUnique({ where: { id } });
});

// Explicit cache with tags for on-demand invalidation
export async function getFeaturedProducts() {
  'use cache';
  return await db.product.findMany({
    where: { isFeatured: true },
    orderBy: { createdAt: 'desc' },
  });
}
`

---

## 3. On-Demand Revalidation via Server Actions

Never rely on blind time-to-live (TTL) expiration when data changes. Mutate data inside Server Actions and trigger tag-based or path-based invalidation:

`	ypescript
// src/app/products/actions.ts
'use server';

import { db } from '@/lib/db';
import { revalidateTag, revalidatePath } from 'next/cache';

export async function updateProductStockAction(productId: string, newStock: number) {
  await db.product.update({
    where: { id: productId },
    data: { stock: newStock },
  });

  // Precise on-demand revalidation
  revalidateTag(product-);
  revalidatePath('/dashboard/inventory');

  return { success: true };
}
`

---

## 4. Passing Promises to Client Components (use())

If a Client Component only needs server data on load, avoid adding heavy data-fetching libraries. Pass the Promise directly from the Server Component and unwrap it using React's native use() hook:

`	sx
// Server Component (src/app/dashboard/page.tsx)
import { Suspense } from 'react';
import { UserProfileClient } from './user-profile-client';

export default function DashboardPage() {
  const profilePromise = fetchProfileData(); // Start fetch without await

  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <UserProfileClient profilePromise={profilePromise} />
    </Suspense>
  );
}

// Client Component (src/app/dashboard/user-profile-client.tsx)
'use client';
import { use } from 'react';

export function UserProfileClient({ profilePromise }: { profilePromise: Promise<Profile> }) {
  const profile = use(profilePromise);
  return <div>Welcome, {profile.name}!</div>;
}
`
