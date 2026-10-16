# 01. Next.js Modular Architecture: Pages, Components & Boundaries

This document defines architecture and clean-code standards for building scalable, maintainable Next.js (App Router & Pages Router) applications.

---

## 1. Page Files Are Coordinators, Not Monoliths

Never write bloated page.tsx files that contain hundreds of lines of JSX, form logic, and state. 

* **Rule**: A page file must strictly act as a **route coordinator** that:
  1. Fetches server-side data (in React Server Components).
  2. Sets up high-level page layouts, metadata, and breadcrumbs.
  3. Delegates rendering to domain-specific components.
* **Size Target**: Keep page.tsx under **100–150 lines**.

`	ext
src/app/(dashboard)/miniapps/[id]/
├── page.tsx                           # Lightweight route coordinator (RSC)
├── loading.tsx                        # Suspense fallback skeleton
├── error.tsx                          # Route error boundary
└── components/                        # Local feature components
    ├── miniapp-header.tsx
    ├── miniapp-tab-navigation.tsx
    ├── tabs/
    │   ├── basic-info-tab.tsx
    │   ├── team-access-tab.tsx
    │   ├── permissions-tab.tsx
    │   └── version-history-tab.tsx
    └── modals/
        ├── deploy-modal.tsx
        └── delete-confirm-modal.tsx
`

---

## 2. Server vs. Client Component Boundaries

Maximize the use of React Server Components (RSC) to keep bundle sizes minimal and leverage direct backend/database access.

| Component Type | Directive | When to Use |
| :--- | :--- | :--- |
| **Server Component** | Default (no directive) | Data fetching, database access, static layouts, SEO metadata, reading server cookies/headers. |
| **Client Component** | 'use client' | Interactive state (useState, useReducer), browser APIs (window, localStorage), event listeners (onClick, onChange), custom hooks. |

### Golden Rule: Push 'use client' Down to the Leaves
Do NOT mark an entire page or layout as 'use client' just because a single button or modal needs state. Wrap only the interactive leaf in 'use client':

`	sx
// ❌ BAD: Entire page becomes a heavyweight client bundle
'use client';
export default function Page({ data }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div>
      <ServerRenderedHeader />
      <LargeDataTable items={data} />
      <button onClick={() => setIsOpen(true)}>Open</button>
      <Modal isOpen={isOpen} />
    </div>
  );
}

// ✅ GOOD: Keep page as Server Component, extract interactive modal button
// src/app/miniapps/components/create-app-button.tsx
'use client';
export function CreateAppButton() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button onClick={() => setIsOpen(true)}>Create App</button>
      {isOpen && <CreateAppModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
`

---

## 3. Section & Tab Decomposition

When a page contains multiple tabs, accordion steps, or distinct visual sections, extract each into its own component:

1. **Tab & Section Separation**:
   * <BasicInfoForm />, <TeamForm />, <IntegrationForm />, <PermissionsForm />, <ValidationReportTab />.
2. **Stateful Modals & Overlays**:
   * Any modal or dialog that maintains its own multi-step input state, async submission, or diff inspector must be an isolated component.
   * *Why:* Prevents parent page re-renders when typing into modal inputs.
