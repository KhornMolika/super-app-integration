# 03. Next.js Custom Hooks & State Organization

This document details guidelines for encapsulating cross-cutting client logic, custom hooks, and shared constants.

---

## 1. Reusable Custom Hooks (src/hooks/)

Extract stateful logic, browser listeners, and WebSocket/SSE handlers into custom hooks instead of inlining them inside UI components.

* **Encapsulate RBAC checks**: useAuth(), usePermissions(['MINIAPP_PUBLISH']).
* **Encapsulate action workflows**: useMiniappActions(), useConfirm().
* **Encapsulate streaming & real-time events**: useLogStream(buildId).

### Example: Modal Confirmation Hook (useConfirm.ts)
`	ypescript
// src/hooks/use-confirm.ts
'use client';

import { useState } from 'react';

export function useConfirm() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const confirm = (title: string, message: string, onConfirm: () => void) => {
    setConfig({ title, message, onConfirm });
    setIsOpen(true);
  };

  const handleConfirm = () => {
    config?.onConfirm();
    setIsOpen(false);
  };

  return { isOpen, config, confirm, handleConfirm, cancel: () => setIsOpen(false) };
}
`

---

## 2. Constants & Utilities: Single Source of Truth

Never hardcode category lists, status badge color mappings, or API URLs inside JSX.

* **Shared Constants**: src/lib/constants/<domain>.constant.ts
  * Example: sa-organizations.ts, pp-categories.ts, ole-definitions.ts.
* **Pure Utilities**: src/lib/utils/<domain>.util.ts
  * Example: date-formatter.util.ts, currency.util.ts, url-builder.util.ts.
