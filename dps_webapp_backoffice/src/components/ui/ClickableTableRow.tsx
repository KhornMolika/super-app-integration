"use client";

import { useRouter } from 'next/navigation';
import React from 'react';

interface ClickableTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  href: string;
}

export default function ClickableTableRow({ href, children, className, ...props }: ClickableTableRowProps) {
  const router = useRouter();
  
  return (
    <tr 
      onClick={() => router.push(href)} 
      className={`cursor-pointer ${className || ''}`}
      {...props}
    >
      {children}
    </tr>
  );
}
