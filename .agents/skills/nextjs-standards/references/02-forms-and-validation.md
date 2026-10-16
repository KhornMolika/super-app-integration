# 02. Next.js Forms, Zod Validation & Server Actions

This document establishes standards for form architecture, input validation, and server action handling in Next.js applications.

---

## 1. Schema & Validation Separation (lib/validators/)

Form schemas, field regex rules, cross-field dependencies, and URL security formatters must live in pure TypeScript validator files—never mixed into React JSX components.

* **File Location**: src/lib/validators/<domain>.validator.ts
* **Rule**: Export both the Zod schema and its inferred TypeScript type.

`	ypescript
// src/lib/validators/miniapp-form.validator.ts
import { z } from 'zod';

export const miniappFormSchema = z.object({
  name: z
    .string()
    .min(3, 'App name must be at least 3 characters')
    .max(50, 'App name cannot exceed 50 characters'),
  bundleId: z
    .string()
    .regex(/^[a-z0-9]+(\.[a-z0-9]+)+$/, 'Must be a valid reverse-DNS bundle ID (e.g., com.acleda.app)'),
  entryUrl: z
    .string()
    .url('Must be a valid HTTPS URL')
    .startsWith('https://', 'Secure HTTPS protocol is mandatory'),
  category: z.enum(['FINANCE', 'LIFESTYLE', 'UTILITIES', 'SERVICES']),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, 'Version must follow SemVer format (e.g., 1.0.0)'),
});

export type MiniappFormValues = z.infer<typeof miniappFormSchema>;
`

---

## 2. Form Integration with React Hook Form

Always use @hookform/resolvers/zod to connect forms directly to your isolated validator:

`	sx
// src/app/miniapps/components/forms/basic-info-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { miniappFormSchema, MiniappFormValues } from '@/lib/validators/miniapp-form.validator';

interface BasicInfoFormProps {
  initialValues?: Partial<MiniappFormValues>;
  onSubmit: (data: MiniappFormValues) => Promise<void>;
}

export function BasicInfoForm({ initialValues, onSubmit }: BasicInfoFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MiniappFormValues>({
    resolver: zodResolver(miniappFormSchema),
    defaultValues: initialValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className=space-y-4>
      <div>
        <label className=block text-sm font-medium>App Name</label>
        <input {...register('name')} className=input />
        {errors.name && <p className=text-red-500 text-xs>{errors.name.message}</p>}
      </div>

      <button type=submit disabled={isSubmitting} className=btn-primary>
        {isSubmitting ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}
`

---

## 3. Server Action Validation

Never trust client-side validation alone. Always re-parse input using safeParse() inside Server Actions:

`	ypescript
// src/app/miniapps/actions.ts
'use server';

import { miniappFormSchema } from '@/lib/validators/miniapp-form.validator';
import { revalidatePath } from 'next/cache';

export async function createMiniappAction(rawInput: unknown) {
  const parsed = miniappFormSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  // Safe mutation with parsed.data
  await db.miniapp.create({ data: parsed.data });

  revalidatePath('/miniapps');
  return { success: true };
}
`
