import React from 'react';

export type SectionCategory =
  | 'GENERAL'
  | 'CONTRACT'
  | 'METHODS'
  | 'CAPABILITIES'
  | 'SECURITY'
  | 'LIFECYCLE'
  | 'SUPPORT';

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
