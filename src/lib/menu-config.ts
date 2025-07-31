
import {
  Archive,
  ArrowDownToLine,
  BookUp,
  Briefcase,
  CheckCheck,
  FileCheck,
  FileCheck2,
  FileClock,
  FileCog,
  FileSearch2,
  FileText,
  Files,
  Home,
  Loader2,
  ScanLine,
  Send,
  Sliders,
  SlidersHorizontal,
  ThumbsDown,
  Undo2,
  Warehouse,
  PlayCircle,
  PencilRuler,
  ClipboardCheck,
  GanttChartSquare,
  Settings,
  Tags,
  User,
  Users,
  UserCog,
  Star,
  Globe,
  LucideIcon,
  ServerCog
} from "lucide-react";

interface MenuItem {
    href: string;
    label: string;
    icon: LucideIcon;
    roles?: string[];
}

interface MenuSection {
    id: string;
    title: string;
    items: MenuItem[];
}

export const allMenuItems: MenuSection[] = [
  {
    id: "account",
    title: "Account",
    items: [
      { href: "/profile", label: "My Profile", icon: User },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    id: "dashboards",
    title: "Dashboards",
    items: [
        { href: "/dashboard", label: "Project Dashboard", icon: SlidersHorizontal },
    ],
  },
  {
    id: "management",
    title: "Management",
    items: [
      { href: "/admin/overview", label: "Global Overview", icon: Globe, roles: ['Admin'] },
      { href: "/projects", label: "Projects", icon: Briefcase },
      { href: "/clients", label: "Clients", icon: Users },
      { href: "/users", label: "Users", icon: User },
      { href: "/role-management", label: "Role Management", icon: GanttChartSquare },
    ],
  },
  {
    id: "admin",
    title: "Admin Tools",
    items: [
      { href: "/admin/status-override", label: "Status Override", icon: Sliders },
      { href: "/book-management", label: "Book Management", icon: BookUp },
      { href: "/admin/general-configs", label: "General Configs", icon: ServerCog },
    ]
  },
  {
    id: "workflow-tools",
    title: "Workflow Tools",
    items: [
      { href: "/documents", label: "All Books", icon: Files },
      { href: "/admin/reassign-user", label: "Reassign User", icon: UserCog },
      { href: "/admin/default-projects", label: "Default Projects", icon: Star },
    ]
  },
  {
    id: "workflow-intake",
    title: "Intake & Reception",
    items: [
      { href: "/workflow/pending-shipment", label: "Pending Shipment", icon: FileClock },
      { href: "/workflow/confirm-reception", label: "Confirm Reception", icon: ArrowDownToLine },
      { href: "/workflow/already-received", label: "Already Received", icon: CheckCheck },
    ]
  },
  {
    id: "workflow-scanning",
    title: "Scanning",
    items: [
      { href: "/workflow/to-scan", label: "To Scan Queue", icon: ScanLine },
      { href: "/workflow/scanning-started", label: "Scanning Started", icon: PlayCircle },
    ]
  },
  {
    id: "workflow-digitization",
    title: "Digitization",
    items: [
      { href: "/workflow/storage", label: "Storage", icon: Warehouse },
    ]
  },
  {
    id: "workflow-indexing",
    title: "Indexing",
    items: [
      { href: "/workflow/to-indexing", label: "To Indexing Queue", icon: FileText },
      { href: "/workflow/indexing-started", label: "Indexing Started", icon: PencilRuler },
    ]
  },
  {
    id: "workflow-qc",
    title: "Quality Control",
    items: [
      { href: "/workflow/to-checking", label: "To Checking Queue", icon: FileSearch2 },
      { href: "/workflow/checking-started", label: "Checking Started", icon: ClipboardCheck },
    ]
  },
  {
    id: "workflow-processing",
    title: "Processing",
    items: [
      { href: "/workflow/ready-for-processing", label: "Ready for Processing", icon: FileCog },
      { href: "/workflow/in-processing", label: "In Processing", icon: Loader2 },
      { href: "/workflow/processed", label: "Processed", icon: FileCheck2 },
    ]
  },
  {
    id: "workflow-delivery",
    title: "Delivery & Correction",
    items: [
      { href: "/workflow/final-quality-control", label: "Final Quality Control", icon: FileCheck2 },
      { href: "/workflow/delivery", label: "Delivery", icon: Send },
      { href: "/workflow/client-rejections", label: "Client Rejections", icon: ThumbsDown },
      { href: "/workflow/corrected", label: "Corrected", icon: Undo2 },
    ]
  },
  {
    id: "finalization",
    title: "Finalization",
    items: [
      { href: "/finalized", label: "Finalized", icon: CheckCheck },
      { href: "/archive", label: "Archive", icon: Archive },
    ],
  },
  {
    id: "client",
    title: "Client Portal",
    items: [
      { href: "/dashboard", label: "Project Dashboard", icon: Home, roles: ['Client'] },
      { href: "/shipments", label: "Prepare Shipment", icon: Send },
      { href: "/pending-deliveries", label: "Pending Deliveries", icon: FileClock },
      { href: "/validated-history", label: "Validated History", icon: History },
      { href: "/reasons", label: "Rejection Reasons", icon: Tags },
    ],
  },
];
