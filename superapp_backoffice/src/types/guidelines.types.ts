import React from 'react';

export type SectionCategory =
  | 'GENERAL'       // 1. Getting Started & Fundamentals
  | 'METHODS'       // 2. Choose Your Tech Stack
  | 'CONTRACT'      // 3. SDK Installation & Bridge Contract
  | 'DESIGN'        // 4. UI/UX & Mobile Safe Areas
  | 'CAPABILITIES'  // 5. SuperApp Features & APIs
  | 'SECURITY'      // 6. Security & Compliance Gates
  | 'LIFECYCLE'     // 7. Testing, Review & Launch
  | 'SUPPORT';      // 8. Help & Troubleshooting

export interface Section {
  id: string;
  number: string;
  title: string;
  shortTitle?: string;
  category: SectionCategory;
  summary: string;
  badge?: string;
  content: React.ReactNode;
}

export type IntegrationMethodTab = 'webview' | 'flutter' | 'native' | 'deeplink';
