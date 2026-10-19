import React from 'react';
import {
  Radio,
  Bluetooth,
  Camera,
  MapPin,
  Fingerprint,
  Mic,
  HardDrive,
  Globe,
  CreditCard,
  Bell,
  Users,
  Activity,
  BatteryCharging,
  Wifi,
  Share2,
  Phone,
  HeartPulse,
  Cpu,
  Sparkles,
  LucideIcon,
} from 'lucide-react';

export interface CapabilityVisualConfig {
  id: string;
  category: string;
  Icon: LucideIcon;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  badgeTextColor: string;
  pillBgColor: string;
  bg: string;
  border: string;
}

const CAPABILITY_CONFIGS: Array<{
  id: string;
  category: string;
  keywords: string[];
  Icon: LucideIcon;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  badgeTextColor: string;
  pillBgColor: string;
}> = [
  // 1. NFC, Smart Cards, RFID, Contactless
  {
    id: 'nfc',
    category: 'NFC & Smart Cards',
    keywords: [
      'nfc',
      'rfid',
      'contactless',
      'smart_card',
      'smartcard',
      'card_reader',
      'iso7816',
      'mifare',
      'felica',
      'echip',
      'e_chip',
      'passport',
      'id_card',
      'smart card',
    ],
    Icon: Radio,
    iconColor: 'text-amber-500 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/60',
    borderColor: 'border-amber-200/80 dark:border-amber-800/60',
    badgeTextColor: 'text-amber-700 dark:text-amber-300',
    pillBgColor: 'bg-amber-100/70 dark:bg-amber-900/40',
  },

  // 2. Bluetooth & Proximity Beacons
  {
    id: 'bluetooth',
    category: 'Bluetooth & Wireless',
    keywords: [
      'bluetooth',
      'ble',
      'beacon',
      'peripheral',
      'nearby',
      'ibeacon',
      'eddystone',
      'bt',
    ],
    Icon: Bluetooth,
    iconColor: 'text-sky-500 dark:text-sky-400',
    bgColor: 'bg-sky-50 dark:bg-sky-950/60',
    borderColor: 'border-sky-200/80 dark:border-sky-800/60',
    badgeTextColor: 'text-sky-700 dark:text-sky-300',
    pillBgColor: 'bg-sky-100/70 dark:bg-sky-900/40',
  },

  // 3. Camera, Photo & QR Scanning
  {
    id: 'camera',
    category: 'Camera & Imaging',
    keywords: [
      'camera',
      'photo',
      'video',
      'qr',
      'barcode',
      'scan',
      'snapshot',
      'lens',
      'image_picker',
      'document_capture',
      'take_photo',
    ],
    Icon: Camera,
    iconColor: 'text-orange-500 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/60',
    borderColor: 'border-orange-200/80 dark:border-orange-800/60',
    badgeTextColor: 'text-orange-700 dark:text-orange-300',
    pillBgColor: 'bg-orange-100/70 dark:bg-orange-900/40',
  },

  // 4. Location & Geolocation
  {
    id: 'location',
    category: 'Location & GPS',
    keywords: [
      'location',
      'gps',
      'geo',
      'coordinates',
      'map',
      'position',
      'geofence',
      'places',
      'get_location',
    ],
    Icon: MapPin,
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/60',
    borderColor: 'border-emerald-200/80 dark:border-emerald-800/60',
    badgeTextColor: 'text-emerald-700 dark:text-emerald-300',
    pillBgColor: 'bg-emerald-100/70 dark:bg-emerald-900/40',
  },

  // 5. Biometrics & Authentication
  {
    id: 'biometrics',
    category: 'Biometrics & Security',
    keywords: [
      'biometric',
      'face',
      'faceid',
      'finger',
      'fingerprint',
      'touchid',
      'iris',
      'passkey',
      'auth',
      'biometrics',
      'secure_enclave',
    ],
    Icon: Fingerprint,
    iconColor: 'text-cyan-500 dark:text-cyan-400',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/60',
    borderColor: 'border-cyan-200/80 dark:border-cyan-800/60',
    badgeTextColor: 'text-cyan-700 dark:text-cyan-300',
    pillBgColor: 'bg-cyan-100/70 dark:bg-cyan-900/40',
  },

  // 6. Microphone & Audio Recording
  {
    id: 'microphone',
    category: 'Audio & Voice',
    keywords: [
      'mic',
      'microphone',
      'audio',
      'sound',
      'voice',
      'record',
      'speech',
      'listen',
    ],
    Icon: Mic,
    iconColor: 'text-rose-500 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-950/60',
    borderColor: 'border-rose-200/80 dark:border-rose-800/60',
    badgeTextColor: 'text-rose-700 dark:text-rose-300',
    pillBgColor: 'bg-rose-100/70 dark:bg-rose-900/40',
  },

  // 7. Storage, Files & Vault
  {
    id: 'storage',
    category: 'Storage & Vault',
    keywords: [
      'storage',
      'vault',
      'file',
      'document',
      'disk',
      'directory',
      'download',
      'fs',
      'filesystem',
      'secure_storage',
    ],
    Icon: HardDrive,
    iconColor: 'text-purple-500 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/60',
    borderColor: 'border-purple-200/80 dark:border-purple-800/60',
    badgeTextColor: 'text-purple-700 dark:text-purple-300',
    pillBgColor: 'bg-purple-100/70 dark:bg-purple-900/40',
  },

  // 8. Webview & Runtime Container
  {
    id: 'webview',
    category: 'Webview & Runtime',
    keywords: [
      'webview',
      'browser',
      'html',
      'runtime',
      'sandbox',
      'bridge',
      'container',
      'js_bridge',
      'window',
      'webview_runtime',
    ],
    Icon: Globe,
    iconColor: 'text-teal-500 dark:text-teal-400',
    bgColor: 'bg-teal-50 dark:bg-teal-950/60',
    borderColor: 'border-teal-200/80 dark:border-teal-800/60',
    badgeTextColor: 'text-teal-700 dark:text-teal-300',
    pillBgColor: 'bg-teal-100/70 dark:bg-teal-900/40',
  },

  // 9. Payment, Wallets & FinTech
  {
    id: 'payment',
    category: 'Payments & FinTech',
    keywords: [
      'pay',
      'payment',
      'wallet',
      'bakong',
      'khqr',
      'invoice',
      'checkout',
      'money',
      'transaction',
      'banking',
    ],
    Icon: CreditCard,
    iconColor: 'text-violet-500 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-950/60',
    borderColor: 'border-violet-200/80 dark:border-violet-800/60',
    badgeTextColor: 'text-violet-700 dark:text-violet-300',
    pillBgColor: 'bg-violet-100/70 dark:bg-violet-900/40',
  },

  // 10. Notifications & Push Alerts
  {
    id: 'notification',
    category: 'Notifications & Alerts',
    keywords: [
      'notification',
      'push',
      'alert',
      'bell',
      'badge',
      'fcm',
      'apns',
      'reminder',
      'message',
    ],
    Icon: Bell,
    iconColor: 'text-amber-500 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/60',
    borderColor: 'border-amber-200/80 dark:border-amber-800/60',
    badgeTextColor: 'text-amber-700 dark:text-amber-300',
    pillBgColor: 'bg-amber-100/70 dark:bg-amber-900/40',
  },

  // 11. Contacts & Address Book
  {
    id: 'contacts',
    category: 'Contacts & People',
    keywords: [
      'contact',
      'contacts',
      'address_book',
      'address',
      'phonebook',
      'people',
      'directory',
    ],
    Icon: Users,
    iconColor: 'text-indigo-500 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/60',
    borderColor: 'border-indigo-200/80 dark:border-indigo-800/60',
    badgeTextColor: 'text-indigo-700 dark:text-indigo-300',
    pillBgColor: 'bg-indigo-100/70 dark:bg-indigo-900/40',
  },

  // 12. Sensors & Motion
  {
    id: 'sensor',
    category: 'Sensors & Motion',
    keywords: [
      'sensor',
      'motion',
      'gyro',
      'accelerometer',
      'orientation',
      'step',
      'pedometer',
      'shake',
      'compass',
    ],
    Icon: Activity,
    iconColor: 'text-lime-600 dark:text-lime-400',
    bgColor: 'bg-lime-50 dark:bg-lime-950/60',
    borderColor: 'border-lime-200/80 dark:border-lime-800/60',
    badgeTextColor: 'text-lime-700 dark:text-lime-300',
    pillBgColor: 'bg-lime-100/70 dark:bg-lime-900/40',
  },

  // 13. Battery & Power Management
  {
    id: 'battery',
    category: 'Battery & Power',
    keywords: ['battery', 'power', 'charging', 'energy', 'thermal'],
    Icon: BatteryCharging,
    iconColor: 'text-green-500 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/60',
    borderColor: 'border-green-200/80 dark:border-green-800/60',
    badgeTextColor: 'text-green-700 dark:text-green-300',
    pillBgColor: 'bg-green-100/70 dark:bg-green-900/40',
  },

  // 14. Network & Connectivity
  {
    id: 'network',
    category: 'Network & Connectivity',
    keywords: [
      'network',
      'wifi',
      'internet',
      'cellular',
      'offline',
      'connectivity',
      'socket',
      'http',
    ],
    Icon: Wifi,
    iconColor: 'text-blue-500 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/60',
    borderColor: 'border-blue-200/80 dark:border-blue-800/60',
    badgeTextColor: 'text-blue-700 dark:text-blue-300',
    pillBgColor: 'bg-blue-100/70 dark:bg-blue-900/40',
  },

  // 15. Clipboard & System Sharing
  {
    id: 'sharing',
    category: 'Sharing & Clipboard',
    keywords: ['clipboard', 'paste', 'copy', 'share', 'social', 'intent'],
    Icon: Share2,
    iconColor: 'text-fuchsia-500 dark:text-fuchsia-400',
    bgColor: 'bg-fuchsia-50 dark:bg-fuchsia-950/60',
    borderColor: 'border-fuchsia-200/80 dark:border-fuchsia-800/60',
    badgeTextColor: 'text-fuchsia-700 dark:text-fuchsia-300',
    pillBgColor: 'bg-fuchsia-100/70 dark:bg-fuchsia-900/40',
  },

  // 16. Telephony & Calling
  {
    id: 'telephony',
    category: 'Telephony & Cellular',
    keywords: ['phone', 'call', 'telephony', 'sms', 'carrier', 'dialer', 'sim'],
    Icon: Phone,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/60',
    borderColor: 'border-emerald-200/80 dark:border-emerald-800/60',
    badgeTextColor: 'text-emerald-700 dark:text-emerald-300',
    pillBgColor: 'bg-emerald-100/70 dark:bg-emerald-900/40',
  },

  // 17. Health & Fitness
  {
    id: 'health',
    category: 'Health & Fitness',
    keywords: ['health', 'healthkit', 'fitness', 'heart', 'pulse', 'steps', 'vitals'],
    Icon: HeartPulse,
    iconColor: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-950/60',
    borderColor: 'border-rose-200/80 dark:border-rose-800/60',
    badgeTextColor: 'text-rose-700 dark:text-rose-300',
    pillBgColor: 'bg-rose-100/70 dark:bg-rose-900/40',
  },
];

// Fallback configuration for unclassified native hardware capabilities
const DEFAULT_CAPABILITY_CONFIG: CapabilityVisualConfig = {
  id: 'hardware',
  category: 'Platform Feature',
  Icon: Cpu,
  iconColor: 'text-slate-600 dark:text-slate-300',
  bgColor: 'bg-slate-100 dark:bg-slate-800',
  borderColor: 'border-slate-200 dark:border-slate-700',
  badgeTextColor: 'text-slate-700 dark:text-slate-300',
  pillBgColor: 'bg-slate-200/70 dark:bg-slate-800/80',
  bg: 'bg-slate-100 dark:bg-slate-800',
  border: 'border-slate-200 dark:border-slate-700',
};

/**
 * Automated Smart Keyword Matching
 * Resolves the visual icon and styling automatically from capability key, name, or description.
 * Zero user effort required.
 */
export function getCapabilityVisual(
  key?: string,
  name?: string,
  description?: string
): CapabilityVisualConfig {
  const haystack = `${key || ''} ${name || ''} ${description || ''}`
    .toLowerCase()
    .replace(/[^a-z0-9_ ]/g, ' ');

  for (const item of CAPABILITY_CONFIGS) {
    for (const kw of item.keywords) {
      // Check word boundary or substring match
      if (
        haystack.includes(kw) ||
        (key && key.toLowerCase() === kw) ||
        (name && name.toLowerCase().includes(kw))
      ) {
        return {
          id: item.id,
          category: item.category,
          Icon: item.Icon,
          iconColor: item.iconColor,
          bgColor: item.bgColor,
          borderColor: item.borderColor,
          badgeTextColor: item.badgeTextColor,
          pillBgColor: item.pillBgColor,
          bg: item.bgColor,
          border: item.borderColor,
        };
      }
    }
  }

  return DEFAULT_CAPABILITY_CONFIG;
}

/**
 * Returns a styled Lucide React element with smart colors matching the capability.
 */
export function renderCapabilityIcon(
  key?: string,
  name?: string,
  className?: string
): React.ReactNode {
  const visual = getCapabilityVisual(key, name);
  const IconComponent = visual.Icon;
  const combinedClass = className || `w-4 h-4 ${visual.iconColor}`;
  return <IconComponent className={combinedClass} />;
}

/**
 * Returns a complete styled badge previewing the automatically assigned visual icon,
 * category, and styling.
 */
export function CapabilityVisualBadge({
  capabilityKey,
  capabilityName,
  className = '',
}: {
  capabilityKey?: string;
  capabilityName?: string;
  className?: string;
}) {
  const visual = getCapabilityVisual(capabilityKey, capabilityName);
  const IconComponent = visual.Icon;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${visual.bgColor} ${visual.borderColor} transition-all ${className}`}
    >
      <div className={`p-1 rounded-lg ${visual.pillBgColor} shrink-0`}>
        <IconComponent className={`w-4 h-4 ${visual.iconColor}`} />
      </div>
      <div className="flex flex-col text-left">
        <span className={`text-[11px] font-bold leading-tight ${visual.badgeTextColor}`}>
          {visual.category}
        </span>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
          Auto-matched
        </span>
      </div>
    </div>
  );
}
