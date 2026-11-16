import React from 'react';
import {
  Shield,
  ShieldCheck,
  Package,
  CheckCircle2,
  Check,
  AlertTriangle,
  XCircle,
  X,
  Zap,
  Tag,
  Globe,
  Lock,
  Key,
  Settings,
  Rocket,
  Smartphone,
  Eye,
  Sparkles,
  Lightbulb,
  ArrowRight,
  ArrowUpRight,
  Search,
  Clock,
  Film,
  Hammer,
  CircleDot,
  ClipboardCheck,
  FileText,
  Bug,
  Camera,
  MapPin,
  Bell,
  Users,
  Mic,
  Fingerprint,
  Star,
  Building2,
  User,
  MinusCircle,
  PlusCircle,
  Folder,
  Link,
  Play,
  QrCode,
  Copy,
  Download,
  RefreshCw,
  ExternalLink,
  Wrench,
  Code,
  Clipboard,
  Ban,
  Target,
  Hash,
  LucideProps,
} from 'lucide-react';

export type IconProps = LucideProps;

// Aliases preserving 100% backward-compatibility across all existing Back-Office components
export const ShieldIcon = Shield;
export const ShieldCheckIcon = ShieldCheck;
export const PackageIcon = Package;
export const CheckCircleIcon = CheckCircle2;
export const CheckIcon = Check;
export const AlertTriangleIcon = AlertTriangle;
export const XCircleIcon = XCircle;
export const XIcon = X;
export const ZapIcon = Zap;
export const TagIcon = Tag;
export const GlobeIcon = Globe;
export const LockIcon = Lock;
export const KeyIcon = Key;
export const SettingsIcon = Settings;
export const RocketIcon = Rocket;
export const DevicePhoneIcon = Smartphone;
export const EyeIcon = Eye;
export const SparklesIcon = Sparkles;
export const LightbulbIcon = Lightbulb;
export const ArrowRightIcon = ArrowRight;
export const ArrowUpRightIcon = ArrowUpRight;
export const SearchIcon = Search;
export const ClockIcon = Clock;
export const FilmIcon = Film;
export const HammerIcon = Hammer;
export const RadioButtonIcon = CircleDot;
export const ClipboardCheckIcon = ClipboardCheck;
export const DocumentTextIcon = FileText;
export const BugIcon = Bug;
export const CameraIcon = Camera;
export const LocationIcon = MapPin;
export const BellIcon = Bell;
export const UserGroupIcon = Users;
export const MicrophoneIcon = Mic;
export const FingerprintIcon = Fingerprint;
export const CheckCircleSolidIcon = CheckCircle2;
export const StarIcon = Star;
export const BuildingIcon = Building2;
export const UserIcon = User;
export const MinusCircleIcon = MinusCircle;
export const PlusCircleIcon = PlusCircle;
export const VirusIcon = Bug;
export const FolderIcon = Folder;
export const LinkIcon = Link;
export const PlayIcon = Play;
export const QrCodeIcon = QrCode;
export const CopyIcon = Copy;
export const DownloadIcon = Download;
export const RefreshIcon = RefreshCw;
export const ExternalLinkIcon = ExternalLink;
export const WrenchIcon = Wrench;
export const CodeIcon = Code;
export const ClipboardIcon = Clipboard;
export const BanIcon = Ban;
export const TargetIcon = Target;
export const HashIcon = Hash;

// Custom UI Badges / Indicators
/** Bare colour names some callers pass; full class names so Tailwind keeps them. */
const DOT_COLORS: Record<string, string> = {
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  red: 'bg-rose-500',
  slate: 'bg-slate-400',
  blue: 'bg-brand-500',
  brand: 'bg-brand-500',
  accent: 'bg-brand-500',
  cyan: 'bg-cyan-500',
};

export function DotBadge({
  color = 'bg-emerald-500',
  className = 'w-2 h-2',
  pulse = false,
}: {
  color?: string;
  className?: string;
  pulse?: boolean;
}) {
  const bg = color.startsWith('bg-') ? color : DOT_COLORS[color] ?? 'bg-slate-400';
  return <span className={`inline-block rounded-full ${bg} ${className} ${pulse ? 'animate-pulse' : ''}`} />;
}

// Brand Vector Icons (Custom SVGs conforming to Lucide/Tailwind conventions)
export function AndroidIcon({ className = 'w-4 h-4', ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M16.61 15.15c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1m-9.22 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1m9.51-6.17l1.67-2.89a.5.5 0 00-.18-.68.5.5 0 00-.68.18l-1.7 2.94c-1.25-.56-2.65-.88-4.14-.88-1.49 0-2.89.32-4.14.88L6.03 5.59a.5.5 0 00-.68-.18.5.5 0 00-.18.68l1.67 2.89C4.34 10.37 2.5 12.87 2 15.8h20c-.5-2.93-2.34-5.43-5.1-6.82z" />
    </svg>
  );
}

export function AppleIcon({ className = 'w-4 h-4', ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.64 1.35-.58.67-.99 1.74-.88 2.78 1.01.08 2.04-.53 2.6-1.28" />
    </svg>
  );
}

// Re-export all Lucide React icons for direct convenient usage
export * from 'lucide-react';
