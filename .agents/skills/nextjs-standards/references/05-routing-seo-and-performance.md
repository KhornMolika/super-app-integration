# 05. Next.js Routing, SEO & Core Web Vitals

This document covers architectural standards for App Router navigation patterns, search engine optimization (SEO), and layout stability.

---

## 1. Advanced Routing Architecture

### Route Groups
Use parenthesis (group) to organize files without affecting the URL structure:
* src/app/(auth)/login/page.tsx $\to$ /login
* src/app/(dashboard)/analytics/page.tsx $\to$ /analytics
* Enables separate root layouts for authenticated versus public experiences.

### Parallel & Intercepting Routes for Modals
Avoid storing modal visibility state in global store or query parameters. Use Next.js Parallel (@modal) and Intercepting ((..)) routes:
* Preserves deep linking (shareable URLs for modals).
* Preserves back/forward browser history naturally.
* Enables background page persistence while the modal overlay is active.

---

## 2. SEO & Dynamic Metadata

Always export declarative metadata or generateMetadata in Server Components:

`	ypescript
// src/app/products/[slug]/page.tsx
import { Metadata } from 'next';
import { getProductBySlug } from '@/lib/data/products';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: 'Product Not Found' };
  }

  return {
    title: ${product.name} | MyStore,
    description: product.summary,
    openGraph: {
      title: product.name,
      description: product.summary,
      images: [{ url: product.thumbnailUrl, width: 1200, height: 630 }],
    },
  };
}
`

---

## 3. Core Web Vitals Optimization

### Zero-CLS Fonts with 
ext/font
* Never load fonts via <link rel=stylesheet> or @import in CSS.
* Use 
ext/font/google or 
ext/font/local. Next.js downloads and self-hosts fonts at build time, eliminating layout shifts and external DNS lookups:

`	ypescript
// src/app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang=en className={inter.variable}>
      <body className=font-sans>{children}</body>
    </html>
  );
}
`

### High-Performance Images with 
ext/image
* **LCP Priority**: Always add priority to the largest above-the-fold image (e.g. hero banner).
* **Responsive Sizing**: When using ill, always define sizes so the browser downloads appropriately scaled images:
  `	sx
  <Image
    src=/hero.webp
    alt=Hero Banner
    fill
    priority
    sizes=(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw
    className=object-cover
  />
  `
