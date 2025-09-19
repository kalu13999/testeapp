
import {
  Archive,
  ArrowDownToLine,
  BookUp,
  Briefcase,
  CheckCheck,
  ClipboardList,
  FileCheck,
  FileCheck2,
  FileClock,
  FileCog,
  FileSearch2,
  FileText,
  Files,
  Home,
  History,
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
  ChevronRight,
  MonitorCheck,
  Split,
  ServerCog,
  TrendingUp,
  Workflow,
  Wrench,
  Building,
  Truck,
  ClipboardSignature
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
    icon: LucideIcon;
    collapsible?: boolean;
    colorVariant?: 'neutral' | 'client';
}

export const allMenuItems: MenuSection[] = [
  {
    id: "account",
    title: "Conta",
    icon: User,
    collapsible: true,
    colorVariant: 'neutral',
    items: [
      { href: "/profile", label: "O Meu Perfil", icon: User },
      { href: "/settings", label: "Configurações", icon: Settings },
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard",
    icon: Home,
    collapsible: true,
    colorVariant: 'neutral',
    items: [
        { href: "/dashboard", label: "Painel do Projeto", icon: SlidersHorizontal },
    ],
  },
  {
    id: "global-dashboards",
    title: "Painéis Globais",
    icon: Globe,
    collapsible: true,
    colorVariant: 'neutral',
    items: [
      { href: "/admin/overview", label: "Visão Global", icon: Globe, roles: ['Admin'] },
      { href: "/admin/daily-production", label: "Produção Diária", icon: TrendingUp },
    ]
  },
  {
    id: "management",
    title: "Gestão",
    icon: Briefcase,
    collapsible: true,
    colorVariant: 'neutral',
    items: [
      { href: "/projects", label: "Projetos", icon: Briefcase },
      { href: "/clients", label: "Clientes", icon: Building },
      { href: "/users", label: "Utilizadores", icon: Users },
      { href: "/role-management", label: "Gestão de Perfis", icon: GanttChartSquare },
    ],
  },
  {
    id: "admin",
    title: "Ferramentas de Admin",
    icon: Wrench,
    collapsible: true,
    colorVariant: 'neutral',
    items: [
      { href: "/admin/status-override", label: "Substituição de Estado", icon: Sliders },
      { href: "/book-management", label: "Gestão de Livros", icon: BookUp },
      { href: "/admin/general-configs", label: "Configurações Gerais", icon: ServerCog },
    ]
  },
  {
    id: "workflow-tools",
    title: "Ferramentas de Workflow",
    icon: Workflow,
    collapsible: true,
    colorVariant: 'neutral',
    items: [
      { href: "/documents", label: "Todos os Livros", icon: Files },
      { href: "/admin/reassign-user", label: "Reatribuir Utilizador", icon: UserCog },
      { href: "/admin/default-projects", label: "Projeto Padrão do Utilizador", icon: Star },
      { href: "/admin/distribution-hub", label: "Centro de Distribuição", icon: SlidersHorizontal },
      { href: "/admin/observation-history", label: "Histórico de Observações", icon: History },
    ]
  },
  {
    id: "workflow-intake",
    title: "Receção",
    icon: ArrowDownToLine,
    collapsible: true,
    items: [
      { href: "/workflow/pending-shipment", label: "Envio Pendente", icon: FileClock },
      { href: "/workflow/confirm-reception", label: "Confirmar Receção", icon: ArrowDownToLine },
      { href: "/workflow/already-received", label: "Recebidos", icon: CheckCheck },
    ]
  },
  {
    id: "workflow-scanning",
    title: "Digitalização",
    icon: ScanLine,
    collapsible: true,
    items: [
      { href: "/workflow/to-scan", label: "Digitalização Pendente", icon: ScanLine },
      { href: "/workflow/scanning-started", label: "Digitalização Iniciada", icon: PlayCircle },
    ]
  },
  {
    id: "storage",
    title: "Armazenamento",
    icon: Warehouse,
    collapsible: true,
    items: [
      { href: "/workflow/storage", label: "Armazenamento", icon: Warehouse },
    ]
  },
  {
    id: "workflow-indexing",
    title: "Indexação",
    icon: FileText,
    collapsible: true,
    items: [
      { href: "/workflow/to-indexing", label: "Indexação Pendente", icon: FileText },
      { href: "/workflow/indexing-started", label: "Indexação Iniciada", icon: PencilRuler },
    ]
  },
  {
    id: "workflow-qc",
    title: "Controlo de Qualidade",
    icon: FileSearch2,
    collapsible: true,
    items: [
      { href: "/workflow/to-checking", label: "PageChecker Pendente", icon: FileSearch2 },
      { href: "/workflow/checking-started", label: "PageChecker Iniciada", icon: ClipboardCheck },
    ]
  },
  {
    id: "workflow-processing",
    title: "Processamento Automático",
    icon: FileCog,
    collapsible: true,
    items: [
      { href: "/workflow/ready-for-processing", label: "Processamento Pendente", icon: FileCog },
      { href: "/workflow/in-processing", label: "Em Processamento", icon: Loader2 },
      { href: "/workflow/processed", label: "Lotes Processados", icon: FileCheck2 },
    ]
  },
  {
    id: "workflow-delivery",
    title: "Entrega & Correção",
    icon: Send,
    collapsible: true,
    items: [
      { href: "/workflow/final-quality-control", label: "QC Final", icon: FileCheck2 },
      { href: "/workflow/delivery", label: "Entrega", icon: Send },
      { href: "/workflow/client-rejections", label: "Rejeições do Cliente", icon: ThumbsDown },
      { href: "/workflow/corrected", label: "Corrigidos", icon: Undo2 },
    ]
  },
  {
    id: "finalization",
    title: "Finalização",
    icon: CheckCheck,
    collapsible: true,
    items: [
      { href: "/finalized", label: "Finalizados", icon: CheckCheck },
      { href: "/archive", label: "Arquivados", icon: Archive },
    ],
  },
  {
    id: "client",
    title: "Cliente",
    icon: Briefcase,
    collapsible: true,
    colorVariant: 'client',
    items: [
      { href: "/shipments", label: "Preparar Envio", icon: Truck },
      { href: "/manage-deliveries", label: "Gerir Entregas", icon: Split },
      { href: "/validation-monitoring", label: "Acompanhar Validações", icon: MonitorCheck },
    ],
  },
  {
    id: "client-workflow",
    title: "Cliente Workflow",
    icon: Workflow,
    collapsible: true,
    colorVariant: 'client',
    items: [
      { href: "/my-tasks", label: "As Minhas Tarefas", icon: ClipboardList },
      { href: "/my-validations", label: "As Minhas Validações", icon: ClipboardSignature },
    ],
  },
  {
    id: "client-tools",
    title: "Ferramentas Cliente",
    icon: Wrench,
    collapsible: true,
    colorVariant: 'client',
    items: [
      { href: "/validated-history", label: "Histórico de Validações", icon: History },
      { href: "/reasons", label: "Motivos de Rejeição", icon: Tags },
    ],
  }
];
