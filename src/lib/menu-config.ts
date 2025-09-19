
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
  TrendingUp
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
    collapsible?: boolean;
}

export const allMenuItems: MenuSection[] = [
  {
    id: "account",
    title: "Conta",
    collapsible: true,
    items: [
      { href: "/profile", label: "O Meu Perfil", icon: User },
      { href: "/settings", label: "Configurações", icon: Settings },
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard",
    collapsible: true,
    items: [
        { href: "/dashboard", label: "Painel do Projeto", icon: SlidersHorizontal },
    ],
  },
  {
    id: "global-dashboards",
    title: "Painéis Globais",
    collapsible: true,
    items: [
      { href: "/admin/overview", label: "Visão Global", icon: Globe, roles: ['Admin'] },
      { href: "/admin/daily-production", label: "Produção Diária", icon: TrendingUp },
    ]
  },
  {
    id: "management",
    title: "Gestão",
    collapsible: true,
    items: [
      { href: "/projects", label: "Projetos", icon: Briefcase },
      { href: "/clients", label: "Clientes", icon: Users },
      { href: "/users", label: "Utilizadores", icon: User },
      { href: "/role-management", label: "Gestão de Perfis", icon: GanttChartSquare },
    ],
  },
  {
    id: "admin",
    title: "Ferramentas de Admin",
    collapsible: true,
    items: [
      { href: "/admin/status-override", label: "Substituição de Estado", icon: Sliders },
      { href: "/book-management", label: "Gestão de Livros", icon: BookUp },
      { href: "/admin/general-configs", label: "Configurações Gerais", icon: ServerCog },
    ]
  },
  {
    id: "workflow-tools",
    title: "Ferramentas de Workflow",
    collapsible: true,
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
    collapsible: true,
    items: [
      { href: "/workflow/to-scan", label: "Digitalização Pendente", icon: ScanLine },
      { href: "/workflow/scanning-started", label: "Digitalização Iniciada", icon: PlayCircle },
    ]
  },
  {
    id: "workflow-digitization",
    title: "Digitalização",
    collapsible: true,
    items: [
      { href: "/workflow/storage", label: "Armazenamento", icon: Warehouse },
    ]
  },
  {
    id: "workflow-indexing",
    title: "Indexação",
    collapsible: true,
    items: [
      { href: "/workflow/to-indexing", label: "Indexação Pendente", icon: FileText },
      { href: "/workflow/indexing-started", label: "Indexação Iniciada", icon: PencilRuler },
    ]
  },
  {
    id: "workflow-qc",
    title: "Controlo de Qualidade",
    collapsible: true,
    items: [
      { href: "/workflow/to-checking", label: "PageChecker Pendente", icon: FileSearch2 },
      { href: "/workflow/checking-started", label: "PageChecker Iniciada", icon: ClipboardCheck },
    ]
  },
  {
    id: "workflow-processing",
    title: "Processamento",
    collapsible: true,
    items: [
      { href: "/workflow/ready-for-processing", label: "Processamento Pendente", icon: FileCog },
      { href: "/workflow/in-processing", label: "Em Processamento", icon: Loader2 },
      { href: "/workflow/processed", label: "Lotes Processados", icon: FileCheck2 },
    ]
  },
  {
    id: "workflow-delivery",
    title: "Entrega e Correção",
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
    collapsible: true,
    items: [
      { href: "/finalized", label: "Finalizados", icon: CheckCheck },
      { href: "/archive", label: "Arquivados", icon: Archive },
    ],
  },
  {
    id: "client",
    title: "Portal do Cliente",
    collapsible: true,
    items: [
      { href: "/dashboard", label: "Painel do Projeto", icon: Home, roles: ['Client', 'Client Manager', 'Client Operator'] },
      { href: "/shipments", label: "Preparar Envio", icon: Send },
      { href: "/my-validations", label: "As Minhas Validações", icon: ClipboardList },
      { href: "/manage-deliveries", label: "Gerir Entregas", icon: Split },
      { href: "/my-tasks", label: "As Minhas Tarefas", icon: ClipboardList },
      { href: "/validation-monitoring", label: "Acompanhar Validações", icon: MonitorCheck },
      { href: "/validated-history", label: "Histórico de Validações", icon: History },
      { href: "/reasons", label: "Motivos de Rejeição", icon: Tags },
    ],
  },
];
