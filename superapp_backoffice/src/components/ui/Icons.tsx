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
export function DotBadge({
  color = 'bg-emerald-500',
  className = 'w-2 h-2',
  pulse = false,
}: {
  color?: string;
  className?: string;
  pulse?: boolean;
}) {
  return <span className={`inline-block rounded-full ${color} ${className} ${pulse ? 'animate-pulse' : ''}`} />;
}

// Re-export all Lucide React icons for direct convenient usage
export * from 'lucide-react';
