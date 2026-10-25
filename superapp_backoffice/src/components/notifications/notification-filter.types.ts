import { NotificationItem } from '@/api';

export type NotificationCategory = 'SECURITY' | 'TESTING' | 'REVIEW' | 'SYSTEM';
export type NotificationReadStatus = 'ALL' | 'UNREAD' | 'READ';
export type NotificationSeverity = 'ALL' | 'ALERT' | 'SUCCESS' | 'INFO';
export type NotificationTimeframe = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH';

export interface NotificationFiltersState {
  readStatus: NotificationReadStatus;
  categories: NotificationCategory[]; // Empty or containing all 4 means all categories
  severity: NotificationSeverity;
  timeframe: NotificationTimeframe;
  searchQuery: string;
}

export const DEFAULT_FILTERS: NotificationFiltersState = {
  readStatus: 'ALL',
  categories: [],
  severity: 'ALL',
  timeframe: 'ALL',
  searchQuery: '',
};

export const CATEGORY_DEFINITIONS: {
  id: NotificationCategory;
  label: string;
  description: string;
  iconName: string;
  colorClass: string;
}[] = [
  {
    id: 'SECURITY',
    label: 'Security & Audits',
    description: 'Security vulnerability scans, integrity audits & issue alerts',
    iconName: 'Shield',
    colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  },
  {
    id: 'TESTING',
    label: 'Testing & Builds',
    description: 'Automated test suite executions, APK artifacts & build pipelines',
    iconName: 'Flask',
    colorClass: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
  },
  {
    id: 'REVIEW',
    label: 'Review & Proposals',
    description: 'Capability proposals, governance sign-offs & approvals',
    iconName: 'ClipboardCheck',
    colorClass: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  },
  {
    id: 'SYSTEM',
    label: 'System & Platform',
    description: 'General system status, platform maintenance & operational events',
    iconName: 'Bell',
    colorClass: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  },
];

/**
 * Classifies any NotificationItem into one of the 4 standard categories.
 */
export function getNotificationCategory(n: NotificationItem): NotificationCategory {
  const type = (n.type || '').toUpperCase();
  const title = (n.title || '').toLowerCase();
  const message = (n.message || '').toLowerCase();

  // 1. Security
  if (
    type === 'SCAN_STARTED' ||
    type === 'ISSUE_CREATED' ||
    type.includes('SECURITY') ||
    type.includes('VULNERABILITY') ||
    title.includes('validation') ||
    title.includes('security') ||
    title.includes('vulnerability') ||
    title.includes('scan') ||
    message.includes('security issue')
  ) {
    return 'SECURITY';
  }

  // 2. Testing & Builds
  if (
    type === 'TESTING_STARTED' ||
    type === 'BUILD_COMPLETED' ||
    type === 'BUILD_FAILED' ||
    type === 'TEST_BUILD_READY' ||
    type.includes('BUILD') ||
    type.includes('TEST') ||
    title.includes('test') ||
    title.includes('apk') ||
    title.includes('build') ||
    message.includes('test') ||
    message.includes('build') ||
    message.includes('apk')
  ) {
    return 'TESTING';
  }

  // 3. Review & Proposals
  if (
    type === 'REVIEW_STARTED' ||
    type === 'PROPOSAL_CREATED' ||
    type.includes('REVIEW') ||
    type.includes('PROPOSAL') ||
    type.includes('CAPABILITY') ||
    title.includes('review') ||
    title.includes('proposal') ||
    title.includes('approved') ||
    title.includes('rejected') ||
    message.includes('review') ||
    message.includes('proposal')
  ) {
    return 'REVIEW';
  }

  // 4. Fallback to System
  return 'SYSTEM';
}

/**
 * Determines alert severity / outcome
 */
export function getNotificationSeverity(n: NotificationItem): 'ALERT' | 'SUCCESS' | 'INFO' {
  const text = `${n.type || ''} ${n.title || ''} ${n.message || ''}`.toLowerCase();

  if (
    text.includes('fail') ||
    text.includes('error') ||
    text.includes('rejected') ||
    text.includes('issue') ||
    text.includes('critical') ||
    text.includes('unreachable')
  ) {
    return 'ALERT';
  }

  if (
    text.includes('success') ||
    text.includes('passed') ||
    text.includes('approved') ||
    text.includes('ready') ||
    text.includes('completed')
  ) {
    return 'SUCCESS';
  }

  return 'INFO';
}

/**
 * Evaluates whether a notification matches given filters
 */
export function matchNotification(
  item: NotificationItem,
  filters: NotificationFiltersState
): boolean {
  // Read Status
  if (filters.readStatus === 'UNREAD' && item.isRead) return false;
  if (filters.readStatus === 'READ' && !item.isRead) return false;

  // Categories (if any selected)
  if (filters.categories && filters.categories.length > 0) {
    const itemCat = getNotificationCategory(item);
    if (!filters.categories.includes(itemCat)) return false;
  }

  // Severity
  if (filters.severity && filters.severity !== 'ALL') {
    const itemSev = getNotificationSeverity(item);
    if (itemSev !== filters.severity) return false;
  }

  // Timeframe
  if (filters.timeframe && filters.timeframe !== 'ALL' && item.createdAt) {
    const itemDate = new Date(item.createdAt).getTime();
    const now = Date.now();
    const diffHours = (now - itemDate) / (1000 * 60 * 60);

    if (filters.timeframe === 'TODAY' && diffHours > 24) return false;
    if (filters.timeframe === 'WEEK' && diffHours > 24 * 7) return false;
    if (filters.timeframe === 'MONTH' && diffHours > 24 * 30) return false;
  }

  // Search Query
  if (filters.searchQuery && filters.searchQuery.trim()) {
    const q = filters.searchQuery.toLowerCase();
    const title = (item.title || '').toLowerCase();
    const message = (item.message || '').toLowerCase();
    const appName = (item.miniApp?.name || '').toLowerCase();

    if (!title.includes(q) && !message.includes(q) && !appName.includes(q)) {
      return false;
    }
  }

  return true;
}

/**
 * Counts non-default active filters for badge display
 */
export function countActiveFilters(filters: NotificationFiltersState): number {
  let count = 0;
  if (filters.readStatus !== 'ALL') count++;
  if (filters.categories.length > 0 && filters.categories.length < 4) count += filters.categories.length;
  if (filters.severity !== 'ALL') count++;
  if (filters.timeframe !== 'ALL') count++;
  return count;
}
