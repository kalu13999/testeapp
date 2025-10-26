

"use client"

import * as React from "react"
import * as XLSX from 'xlsx';
import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FolderSync, MessageSquareWarning, Trash2, Replace, FilePlus2, Info, BookOpen, X, Tag, ShieldAlert, AlertTriangle, Check, ScanLine, FileText, FileJson, PlayCircle, Send, UserPlus, CheckCheck, Archive, ThumbsUp, ThumbsDown, Undo2, MoreHorizontal, Loader2, Upload, FileWarning, Download, ArrowUp, ArrowDown, ChevronsUpDown, XCircle, UserPlus2, RotateCcw, MessageSquarePlus, Book, Files, BarChart } from "lucide-react";
import { useAppContext } from "@/context/workflow-context";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppDocument, EnrichedBook, RejectionTag } from "@/context/workflow-context";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STAGE_CONFIG, findStageKeyFromStatus, getNextEnabledStage, StageConfigItem } from "@/lib/workflow-config";
import type { LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { format } from "date-fns";

//const ITEMS_PER_PAGE = 50;

const SIMPLE_BULK_ACTION_STAGES = [
  'confirm-reception', 'to-scan', 'to-indexing', 'to-checking',
  'indexing-started', 'checking-started', 'ready-for-processing',
  'processed', 'final-quality-control', 'delivery', 'finalized',
];

const iconMap: { [key: string]: LucideIcon } = {
    Check,
    ScanLine,
    FileText,
    FileJson,
    Play: PlayCircle,
    Send,
    FolderSync,
    PlayCircle,
    UserPlus,
    CheckCheck,
    Archive,
    ThumbsUp,
    ThumbsDown,
    Undo2,
    MoreHorizontal,
    MessageSquarePlus,
};

interface WorkflowClientProps {
  stage: string;
  config: StageConfigItem; 
}

type BadgeVariant = "default" | "destructive" | "secondary" | "outline";
type AssignmentRole = 'scanner' | 'indexer' | 'qc';
/*
const assignmentConfig: { [key in AssignmentRole]: { title: string, description: string, permission: string } } = {
    scanner: { title: "Assign Scanner", description: "Select a scanner operator to process this book.", permission: '/workflow/to-scan' },
    indexer: { title: "Assign Indexer", description: "Select an indexer to process this book.", permission: '/workflow/to-indexing' },
    qc: { title: "Assign for QC", description: "Select a QC specialist to review this book.", permission: '/workflow/to-checking' }
};*/

const assignmentConfig: { [key in AssignmentRole]: { title: string, description: string, permission: string } } = {
    scanner: { 
        title: "Atribuir Scanner", 
        description: "Selecione um operador de scanner para processar este livro.", 
        permission: '/workflow/to-scan' 
    },
    indexer: { 
        title: "Atribuir Indexador", 
        description: "Selecione um indexador para processar este livro.", 
        permission: '/workflow/to-indexing' 
    },
    qc: { 
        title: "Atribuir para QC", 
        description: "Selecione um especialista de Controlo de Qualidade para rever este livro.", 
        permission: '/workflow/to-checking' 
    }
};

const getBadgeVariant = (status: string): BadgeVariant => {
    switch (status) {
        case "Delivery":
        case "Finalized":
        case "Processed":
        case "Archived":
            return "default";
        case "Client Rejected":
            return "destructive";
        case "Scanning Started":
        case "Indexing Started":
        case "Checking Started":
        case "In Processing":
        case "Final Quality Control":
            return "secondary"
        default:
            return "outline";
    }
}

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="grid grid-cols-3 items-center gap-x-4">
    <p className="text-muted-foreground">{label}</p>
    <p className="col-span-2 font-medium">{value}</p>
  </div>
);

type GroupedDocuments = {
  [bookId: string]: {
    book: EnrichedBook;
    pages: AppDocument[];
    hasError: boolean;
    hasWarning: boolean;
    batchInfo?: { id: string, timestampStr: string };
  };
};
const KpiCard = ({ title, value, icon: Icon, description }: { title: string; value: string | number; icon: React.ElementType; description: string; }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);
export default function WorkflowClient({ config, stage }: WorkflowClientProps) {
  const { 
    books, documents, handleMoveBookToNextStage, 
    currentUser, users, permissions,
    handleStartTask, handleAssignUser,handleCancelTask,
    openAppValidateScan, handleClientAction,
    selectedProjectId, projectWorkflows, handleConfirmReception, getNextEnabledStage,
    handleSendToStorage, processingBookIds,
    handleFinalize, handleMarkAsCorrected, handleResubmit,
    handleResubmitCopyTifs, handleResubmitMoveTifs,
    addPageToBook, deletePageFromBook, updateDocumentFlag, rejectionTags, tagPageForRejection,
    handleCompleteTask,handleCancelCompleteTask, handlePullNextTask, addBookObservation, booksAvaiableInStorageLocalIp,
  } = useAppContext();

  const { toast } = useToast();
  const { title, description, dataType, actionButtonLabel, actionButtonIcon, emptyStateText, dataStatus} = config;
  const ActionIcon = actionButtonIcon ? iconMap[actionButtonIcon] : FolderSync;

  const [scanState, setScanState] = React.useState<{ open: boolean; book: EnrichedBook | null; folderName: string | null; fileCount: number | null; }>({ open: false, book: null, folderName: null, fileCount: null });
  const [selection, setSelection] = React.useState<string[]>([]);
  const [confirmationState, setConfirmationState] = React.useState({ open: false, title: '', description: '', onConfirm: () => {} });
  const [assignState, setAssignState] = React.useState<{ open: boolean; book: EnrichedBook | null; role: AssignmentRole | null }>({ open: false, book: null, role: null });
  const [bulkAssignState, setBulkAssignState] = React.useState<{ open: boolean; role: 'indexer' | 'qc' | 'scanner' | null, selectedUserId: string }>({ open: false, role: null, selectedUserId: '' });
  const [pullTaskState, setPullTaskState] = React.useState<{ open: boolean; stage: string; role: AssignmentRole | null }>({ open: false, stage: '', role: null });
  const [pendingTasksState, setPendingTasksState] = React.useState<{ open: boolean; tasks: EnrichedBook[], bookToStart: EnrichedBook, role: AssignmentRole }>({ open: false, tasks: [], bookToStart: {} as EnrichedBook, role: 'scanner' });

  const [selectedUserId, setSelectedUserId] = React.useState<string>("");
  //const [selectedBulkUserId, setSelectedBulkUserId] = React.useState<string>("");
  const [detailsState, setDetailsState] = React.useState<{ open: boolean; book?: EnrichedBook }>({ open: false });
  const [currentPage, setCurrentPage] = React.useState(1);
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({});
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([
    { id: 'name', desc: false }
  ]);
  const [rejectionComment, setRejectionComment] = React.useState("");
  const [currentBook, setCurrentBook] = React.useState<{id: string, name: string} | null>(null);

  const [availableBooks, setAvailableBooks] = React.useState<EnrichedBook[]>([]);

  const [isMutating, setIsMutating] = React.useState(false);
  const withMutation = async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    setIsMutating(true);
    try {
        const result = await action();
        return result;
    } catch (error: any) {
        console.error("A mutation failed:", error);
        toast({ title: "Operação Falhou", description: error.message, variant: "destructive" });
    } finally {
        setIsMutating(false);
    }
  };

  const [flagDialogState, setFlagDialogState] = React.useState<{
    open: boolean;
    docId: string | null;
    docName: string | null;
    flag: AppDocument['flag'];
    comment: string;
  }>({ open: false, docId: null, docName: null, flag: null, comment: '' });
  
  const [taggingState, setTaggingState] = React.useState<{
    open: boolean;
    docId: string | null;
    docName: string | null;
    selectedTags: string[];
    availableTags: RejectionTag[];
  }>({ open: false, docId: null, docName: null, selectedTags: [], availableTags: [] });
  
  const [columnStates, setColumnStates] = React.useState<{ [key: string]: { cols: number } }>({});

  const [itemsPerPage, setItemsPerPage] = React.useState(100);

  const [newObservation, setNewObservation] = React.useState('');
  const [observationTarget, setObservationTarget] = React.useState<EnrichedBook | null>(null);

  const [openAccordions, setOpenAccordions] = React.useState<string[]>([]);
  
  const { storages } = useAppContext();
 
  const storageKey = React.useMemo(() => `accordion_state_${stage}`, [stage]);

  React.useEffect(() => {
    try {
      const savedState = localStorage.getItem(storageKey);
      if (savedState) {
        setOpenAccordions(JSON.parse(savedState));
      }
    } catch (error) {
      console.error(`Failed to parse accordion state for ${stage} from localStorage`, error);
    }
  }, [storageKey]);
  
  
  React.useEffect(() => {
    (async () => {
      if (booksAvaiableInStorageLocalIp) {
        const result = await booksAvaiableInStorageLocalIp(stage);
        setAvailableBooks(result ?? []);
      }
    })();
  }, [stage, booksAvaiableInStorageLocalIp]);

  const totalLivros = availableBooks.length;
  const totalPaginas = availableBooks.reduce((soma, b) => soma + b.documentCount, 0);


  const handleAccordionChange = (value: string[]) => {
    setOpenAccordions(value);
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to save accordion state for ${stage} to localStorage`, error);
    }
  };

  const userPermissions = currentUser ? permissions[currentUser.role] || [] : [];
  const canViewAll = userPermissions.includes('/workflow/view-all') || userPermissions.includes('*');

  const groupedByBook = React.useMemo(() => {
    if (!config.dataStatus) return {};
    let booksInStage = books.filter(book => book.status === config.dataStatus);

    if (selectedProjectId) {
      booksInStage = booksInStage.filter(book => book.projectId === selectedProjectId);
    }

    if (currentUser?.role === 'Client' && currentUser.clientId) {
      booksInStage = booksInStage.filter(b => b.clientId === currentUser.clientId);
    }
    
    return booksInStage.reduce<GroupedDocuments>((acc, book) => {
        const pages = documents.filter(doc => doc.bookId === book.id);
        acc[book.id] = {
            book,
            pages,
            hasError: pages.some(p => p.flag === 'error'),
            hasWarning: pages.some(p => p.flag === 'warning')
        };
        return acc;
    }, {});
  }, [books, documents, config.dataStatus, selectedProjectId, currentUser]);

 
  const getAssigneeIdForBook = (book: EnrichedBook, role: AssignmentRole): string | undefined => {
    switch (role) {
        case 'scanner': return book.scannerUserId;
        case 'indexer': return book.indexerUserId;
        case 'qc': return book.qcUserId;
        default: return undefined;
    }
  };
  
  const allDisplayItems = React.useMemo(() => {
    let items: (EnrichedBook | AppDocument)[];
    
    if (dataType === 'book') {
        items = books;
    } else if (dataType === 'document' && dataStatus) {
      items = documents.filter(doc => doc.status === dataStatus);
    } else {
      items = [];
    }

    if (dataType === 'book' && dataStatus) {
      items = (items as EnrichedBook[]).filter(book => book.status === dataStatus);
    }

    if(selectedProjectId) {
      items = (items as EnrichedBook[]).filter(book => book.projectId === selectedProjectId);
    }

    const isSharedQueue = dataStatus === 'Received';

    if (currentUser && config.assigneeRole && dataType === 'book' && !canViewAll) {
        if (isSharedQueue) {
            items = (items as EnrichedBook[]).filter(book => {
                const assigneeId = getAssigneeIdForBook(book, config.assigneeRole as AssignmentRole);
                return assigneeId === currentUser.id || !assigneeId;
            });
        } else {
             const statusesForRole = {
                scanner: ['To Scan', 'Scanning Started'],
                indexer: ['To Indexing', 'Indexing Started'],
                qc: ['To Checking', 'Checking Started'],
            }[config.assigneeRole] || [];

            items = (items as EnrichedBook[]).filter(book =>
                getAssigneeIdForBook(book, config.assigneeRole as AssignmentRole) === currentUser.id && statusesForRole.includes(book.status)
            );
        }
    }

    if (dataType === 'book') {
        return (items as EnrichedBook[]).map(book => {
            let assigneeName = '—';
            if(config.assigneeRole) {
                const assigneeId = getAssigneeIdForBook(book, config.assigneeRole);

                if (assigneeId) {
                    const user = users.find(u => u.id === assigneeId);
                    assigneeName = user?.name || 'Unknown';
                } else if (isSharedQueue) {
                    assigneeName = 'Unassigned';
                }
            }
            return { ...book, assigneeName };
        });
    }

    return items;
  }, [books, documents, dataType, dataStatus, currentUser, permissions, config.assigneeRole, users, canViewAll, selectedProjectId]);
  
  const sortedAndFilteredItems = React.useMemo(() => {
    let filtered = allDisplayItems;

    Object.entries(columnFilters).forEach(([columnId, value]) => {
      if (value) {
        filtered = filtered.filter(item => {
          const itemValue = (item as any)[columnId];
          return String(itemValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    if (sorting.length > 0) {
        filtered.sort((a, b) => {
            for (const s of sorting) {
                const key = s.id;
                const valA = (a as any)[key];
                const valB = (b as any)[key];
                let result = 0;
                if (valA === null || valA === undefined) result = -1;
                else if (valB === null || valB === undefined) result = 1;
                else if (typeof valA === 'number' && typeof valB === 'number') { result = valA - valB; }
                else { result = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' }); }
                if (result !== 0) return s.desc ? -result : result;
            }
            return 0;
        });
    }

    return filtered;
  }, [allDisplayItems, columnFilters, sorting]);
  
  const stageStats = React.useMemo(() => {
    const totalBooks = sortedAndFilteredItems.length;
    const totalPages = sortedAndFilteredItems.reduce((sum, book) => sum + (book as EnrichedBook).expectedDocuments, 0);
  
    if (['scanning-started', 'indexing-started', 'checking-started'].includes(stage)) {
      const endTimeField: 'scanEndTime' | 'indexingEndTime' | 'qcEndTime' = {
        'scanning-started': 'scanEndTime',
        'indexing-started': 'indexingEndTime',
        'checking-started': 'qcEndTime',
      }[stage] as 'scanEndTime' | 'indexingEndTime' | 'qcEndTime';
  
      const today = format(new Date(), "yyyy-MM-dd");
      const completedBooks = sortedAndFilteredItems.filter(book => !!(book as any)[endTimeField]);
      const tasksToday = completedBooks.filter(book => ((book as any)[endTimeField] as string).startsWith(today)).length;
      const completedCount = completedBooks.length;
      const notCompletedCount = totalBooks - completedCount;
      const totalPagesCompleted = completedBooks.reduce(
        (sum, book) => sum + (book as EnrichedBook).expectedDocuments,
        0
      );
      const totalPagesToday = completedBooks
      .filter(book => ((book as any)[endTimeField] as string).startsWith(today))
      .reduce((sum, book) => sum + (book as EnrichedBook).expectedDocuments, 0);


      const totalPagesNotCompleted = notCompletedCount > 0 
        ? sortedAndFilteredItems
            .filter(book => !(book as any)[endTimeField])
            .reduce((sum, book) => sum + (book as EnrichedBook).expectedDocuments, 0)
        : 0;
  
      return {
        total: totalBooks,
        completed: completedCount,
        notCompleted: notCompletedCount,
        totalPages: totalPages,
        totalPagesCompleted,
        totalPagesNotCompleted,
        tasksToday,
        totalPagesToday,
      };
    }
    
    return { 
      total: totalBooks, 
      completed: 0, 
      notCompleted: 0, 
      totalPages,
      totalPagesCompleted: 0,
      totalPagesNotCompleted: 0,
      tasksToday: 0,
      totalPagesToday: 0 
    };
  }, [sortedAndFilteredItems, stage]);

  
  const handleColumnFilterChange = (columnId: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [columnId]: value }));
    setCurrentPage(1);
  };
  
  const handleSort = (columnId: string, isShift: boolean) => {
    setSorting(currentSorting => {
        const existingSortIndex = currentSorting.findIndex(s => s.id === columnId);

        if (isShift) {
            let newSorting = [...currentSorting];
            if (existingSortIndex > -1) {
                if (newSorting[existingSortIndex].desc) {
                    newSorting.splice(existingSortIndex, 1);
                } else {
                    newSorting[existingSortIndex].desc = true;
                }
            } else {
                newSorting.push({ id: columnId, desc: false });
            }
            return newSorting;
        } else {
            if (currentSorting.length === 1 && currentSorting[0].id === columnId) {
                if (currentSorting[0].desc) {
                    return [];
                }
                return [{ id: columnId, desc: true }];
            }
            return [{ id: columnId, desc: false }];
        }
    });
  };

  const getSortIndicator = (columnId: string) => {
    const sortIndex = sorting.findIndex(s => s.id === columnId);
    if (sortIndex === -1) return <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-0 group-hover:opacity-50" />;
    
    const sort = sorting[sortIndex];
    const icon = sort.desc ? <ArrowDown className="h-4 w-4 shrink-0" /> : <ArrowUp className="h-4 w-4 shrink-0" />;
    
    return (
        <div className="flex items-center gap-1">
            {icon}
            {sorting.length > 1 && (
                <span className="text-xs font-bold text-muted-foreground">{sortIndex + 1}</span>
            )}
        </div>
    );
  }
  
  const handleClearFilters = () => {
    setColumnFilters({});
  };


  const totalPages = Math.ceil(sortedAndFilteredItems.length / itemsPerPage);
  const displayItems = sortedAndFilteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const selectedItems = React.useMemo(() => {
    return sortedAndFilteredItems.filter(item => selection.includes(item.id));
  }, [sortedAndFilteredItems, selection]);

  React.useEffect(() => {
    setSelection([]);
    setCurrentPage(1);
  }, [stage, columnFilters, sorting, selectedProjectId]);
  
  const openConfirmationDialog = ({ title, description, onConfirm}: Omit<typeof confirmationState, 'open'>) => {
    setConfirmationState({ open: true, title, description, onConfirm });
  }

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const exportJSON = (data: (EnrichedBook | AppDocument)[]) => {
    if (data.length === 0) return;
    const jsonString = JSON.stringify(data, null, 2);
    downloadFile(jsonString, `${stage}_export.json`, 'application/json');
    toast({ title: "Exportação Concluída", description: `${data.length} itens exportados em formato JSON.` });
  }

  const exportCSV = (data: (EnrichedBook | AppDocument)[]) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(item => 
            headers.map(header => {
                let value = item[header as keyof typeof item] as any ?? '';
                if(Array.isArray(value)) value = value.join(';');
                if (typeof value === 'object' && value !== null) value = JSON.stringify(value);
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');
    downloadFile(csvContent, `${stage}_export.csv`, 'text/csv;charset=utf-8;');
    toast({ title: "Exportação Concluída", description: `${data.length} itens exportados em formato CSV.` });
  }

  const exportXLSX = (data: (EnrichedBook | AppDocument)[]) => {
    if (data.length === 0) return;
    const dataToExport = data.map(item => {
        const newItem = {...item};
        Object.keys(newItem).forEach(key => {
            const value = newItem[key as keyof typeof newItem];
            if(Array.isArray(value)) {
                (newItem as any)[key] = value.join(';');
            }
        });
        return newItem;
    });
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, title);
    XLSX.writeFile(workbook, `${stage}_export.xlsx`);
    toast({ title: "Exportação Concluída", description: `${data.length} itens exportados em formato XLSX.` });
  }
  
  const handleDirectorySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const firstFile = files[0];
      const pathParts = (firstFile as any).webkitRelativePath?.split('/') || [];
      const folderName = pathParts.length > 1 ? pathParts[0] : null;
      
      const tifFiles = Array.from(files).filter(file => file.name.toLowerCase().endsWith('.tif'));
      const fileCount = tifFiles.length;

      if (!folderName) {
        toast({ title: "Seleção Inválida", description: "Por favor, selecione uma pasta, não um arquivo individual.", variant: "destructive" });
        setScanState(prev => ({ ...prev, folderName: null, fileCount: null }));
      } else {
        setScanState(prev => ({ ...prev, folderName, fileCount }));
      }
    } else {
        setScanState(prev => ({ ...prev, folderName: null, fileCount: null }));
    }
  };

  const handleConfirmScanBypass = () => {
    if (scanState.book) {
      handleSendToStorage(scanState.book.id, { actualPageCount: scanState.fileCount ?? 0 });
      closeScanningDialog();
    }
  }

  const handleConfirmScan = () => {
    if (scanState.book) {
      handleSendToStorage(scanState.book.id, { actualPageCount: scanState.fileCount ?? scanState.book.expectedDocuments });
      closeScanningDialog();
    }
  };

  const closeScanningDialog = () => {
    setScanState({ open: false, book: null, folderName: null, fileCount: null });
  }
  
  const getAssignableUsers = (role: AssignmentRole, projectId?: string) => {
      const requiredPermission = assignmentConfig[role].permission;
      return users.filter(user => {
        if (user.role === 'Admin') return false; 
        const userPermissions = permissions[user.role] || [];
        const hasPermission = userPermissions.includes('*') || userPermissions.includes(requiredPermission);
        if (!projectId) return hasPermission;
        const hasProjectAccess = !user.projectIds || user.projectIds.length === 0 || user.projectIds.includes(projectId);
        return hasPermission && hasProjectAccess;
      });
  }

  const openAssignmentDialog = (book: EnrichedBook, role: AssignmentRole) => {
    setAssignState({ open: true, book, role });
    setSelectedUserId('');
  };
  
  const closeAssignmentDialog = () => {
    setAssignState({ open: false, book: null, role: null });
    setSelectedUserId('');
  };

  const handleConfirmAssignment = () => {
    if (assignState.book && selectedUserId && assignState.role) {
      handleAssignUser(assignState.book.id, selectedUserId, assignState.role);
      closeAssignmentDialog();
    } else {
      toast({ title: "Nenhum Utilizador Selecionado", description: "Por favor, selecione um utilizador para atribuir a tarefa.", variant: "destructive" });
    }
  };
  
  const openBulkAssignmentDialog = (role: 'indexer' | 'qc' | 'scanner') => {
    setBulkAssignState({ open: true, role, selectedUserId: '' });
  };

  const closeBulkAssignmentDialog = () => {
    setBulkAssignState({ open: false, role: null, selectedUserId: '' });
  };

  const handleBulkAssignmentSubmit = () => {
    if (bulkAssignState.role && bulkAssignState.selectedUserId && selection.length > 0) {
      selection.forEach(bookId => {
        const book = Object.values(groupedByBook).find(g => g.book.id === bookId)?.book;
        if(book) {
            handleAssignUser(book.id, bulkAssignState.selectedUserId, bulkAssignState.role!);
        }
      });
      closeBulkAssignmentDialog();
      setSelection([]);
    }
  };

  const isCancelable = ['Scanning Started', 'Indexing Started', 'Checking Started'].includes(config.dataStatus as string);

  const handleBulkCancel = () => {
    openConfirmationDialog({
        title: `Cancel ${selection.length} tasks?`,
        description: "This will return all selected books to their previous step.",
        onConfirm: () => {
            selection.forEach(id => {
                const item = allDisplayItems.find(d => d.id === id) as EnrichedBook;
                if (item) {
                    handleCancelTask(item.id, item.status);
                }
            });
            setSelection([]);
        }
    });
  };

  const handleActionClick = (book: EnrichedBook) => {
    const role = config.assigneeRole;
    
    if (['to-scan', 'to-indexing', 'to-checking'].includes(stage)) {
        console.log(`[handleActionClick] Stage is ${stage}, role is ${role}`);
        if (role && !canViewAll) {
            console.log("[handleActionClick] User is not admin. Checking for open tasks...");
            
            const startedStatusMap = { scanner: 'Scanning Started', indexer: 'Indexing Started', qc: 'Checking Started' };
            const endTimeFieldMap: Record<AssignmentRole, keyof EnrichedBook> = { scanner: 'scanEndTime', indexer: 'indexingEndTime', qc: 'qcEndTime' };
            const userIdFieldMap = { scanner: 'scannerUserId', indexer: 'indexerUserId', qc: 'qcUserId' };
            
            const startedStatus = startedStatusMap[role];
            const endTimeField = endTimeFieldMap[role];
            const userIdField = userIdFieldMap[role];
            
            console.log(`[handleActionClick] Filtering for status: ${startedStatus}, userId: ${currentUser?.id}, endTimeField: ${endTimeField}`);

            const openTasks = books.filter(b => {
                const isStatusMatch = b.status === startedStatus;
                const isUserMatch = b[userIdField as keyof EnrichedBook] === currentUser?.id;
                const isEndTimeNull = !b[endTimeField];
                
                return isStatusMatch && isUserMatch && isEndTimeNull;
            });

            console.log(`[handleActionClick] Found ${openTasks.length} open tasks.`);
            if (openTasks.length > 0) {
                console.log(`[handleActionClick] Open tasks are:`, openTasks.map(t => ({id: t.id, name: t.name, status: t.status, endTime: t[endTimeField]})));
            }
            
            if (openTasks.length > 0) {
                setPendingTasksState({ open: true, tasks: openTasks, bookToStart: book, role: role! });
                return;
            }
        }
        
        let label = 'Start Task';
        if (stage === 'to-scan') label = 'Start Scanning';
        if (stage === 'to-indexing') label = 'Start Indexing';
        if (stage === 'to-checking') label = 'Start Checking';

        openConfirmationDialog({
            title: `Confirm: ${label}?`,
            description: `This will perform the action for "${book.name}".`,
            onConfirm: () => {
                if (stage === 'to-scan') handleStartTask(book.id, 'scanner');
                else if (stage === 'to-indexing') handleStartTask(book.id, 'indexer');
                else if (stage === 'to-checking') handleStartTask(book.id, 'qc');
            }
        });
        return;
    }

    if (stage === 'confirm-reception') {
      openConfirmationDialog({
        title: `Confirm Reception for "${book.name}"?`,
        description: `This will confirm the physical arrival of the book.`,
        onConfirm: () => handleConfirmReception(book.id)
      });
      return;
    }

    if (stage === 'already-received') {
      const projectWorkflow = projectWorkflows[book.projectId!] || [];
      const isScanningEnabled = projectWorkflow.includes('to-scan');
      if (isScanningEnabled) {
        if (canViewAll) {
            openAssignmentDialog(book, 'scanner');
        } else {
            handleAssignUser(book.id, currentUser!.id, 'scanner');
        }
      } else {
          setScanState({ open: true, book, folderName: null, fileCount: null });
      }
      return;
    }
    
    if (stage === 'scanning-started') {
      setScanState({ open: true, book, folderName: null, fileCount: null });
      return;
    }
    
    if (stage === 'ready-for-processing') {
      /*
         openConfirmationDialog({
            title: `Confirm: Start Processing?`,
            description: `This will begin automated processing for "${book.name}".`,
            onConfirm: () => handleStartProcessing(book.id)
        });*/
        return;
    }

    if (actionButtonLabel) {
       openConfirmationDialog({
          title: `Confirm: ${actionButtonLabel}?`,
          description: `This will perform the action for "${book.name}".`,
          onConfirm: () => handleMainAction(book)
      });
    }
};

const handleMainAction = async (book: EnrichedBook) => {
  if (!book.projectId) {
      toast({ title: "Erro", description: "ID do projeto não encontrado para este livro.", variant: "destructive" });
      return;
  }
  console.log("handleMainAction");
  
  const workflow = projectWorkflows[book.projectId] || [];
  const currentStageKey = findStageKeyFromStatus(book.status);
  if (!currentStageKey) {
      toast({ title: "Erro de Workflow", description: `Não foi possível encontrar uma fase de workflow para o estado: "${book.status}"`, variant: "destructive" });
      return;
  }
  
  const nextStage = getNextEnabledStage(currentStageKey, workflow);
  
  if (!nextStage) {
    //const result = await handleMoveBookToNextStage(book.id, book.status);
    toast({ title: "Fim de Workflow", description: "Esta é a última etapa para este projeto.", variant: "default" });
 
    return '';
  }
  
  const nextStageConfig = STAGE_CONFIG[nextStage];

  if (nextStageConfig?.assigneeRole) {
    openAssignmentDialog(book, nextStageConfig.assigneeRole);
    return '';
  } else {
    const result = await handleMoveBookToNextStage(book.id, book.status);
    return result ? 'success' : 'error';
  }
}

  const getDynamicActionButtonLabel = React.useCallback((book: EnrichedBook) => {
    if (config.actionButtonLabel) {
      return config.actionButtonLabel;
    }
    
    if (!book.projectId) return "Next Step";
    
    const workflow = projectWorkflows[book.projectId] || [];
    const currentStageKey = findStageKeyFromStatus(book.status);
    if (!currentStageKey) return "Next Step";
    
    const nextStageKey = getNextEnabledStage(currentStageKey, workflow);
    if (!nextStageKey) return "End of Workflow";
    
    const nextStageConfig = STAGE_CONFIG[nextStageKey];
    if (nextStageConfig.assigneeRole) {
        return `Atribuir para ${nextStageConfig.title}`;
    }
    return `Move to ${nextStageConfig.title}`;
  }, [config.actionButtonLabel, projectWorkflows, getNextEnabledStage]);
  
  const determineNextActionType = React.useCallback((book: EnrichedBook): 'ASSIGN' | 'MOVE' | 'FOLDER_SELECT' | 'END' => {
      if (!book.projectId) return 'MOVE';
      const workflow = projectWorkflows[book.projectId] || [];
      const currentStageKey = findStageKeyFromStatus(book.status);
      if (!currentStageKey) return 'MOVE';
      if(currentStageKey === 'scanning-started') return 'FOLDER_SELECT';
      const nextStage = getNextEnabledStage(currentStageKey, workflow);
      if (!nextStage) return 'END';
      const nextStageConfig = STAGE_CONFIG[nextStage];
      return nextStageConfig.assigneeRole ? 'ASSIGN' : 'MOVE';
  }, [projectWorkflows, getNextEnabledStage]);

  const handleBulkAction = async () => {
    if (selection.length === 0) return;
    const firstBook = allDisplayItems.find(item => item.id === selection[0]) as EnrichedBook;
    if (!firstBook) return;

    const actionType = determineNextActionType(firstBook);

    if (actionType === 'ASSIGN') {
        const role = STAGE_CONFIG[getNextEnabledStage(findStageKeyFromStatus(firstBook.status)!, projectWorkflows[firstBook.projectId] || [])!]?.assigneeRole;
        if(role) openBulkAssignmentDialog(role);
    } else if (actionType === 'FOLDER_SELECT') {
        toast({ title: "Ação em Massa Não Suportada", description: "Esta ação deve ser realizada individualmente para cada livro.", variant: "destructive" });
    } else {
        const actionLabel = getDynamicActionButtonLabel(firstBook);
        openConfirmationDialog({
            title: `Realizar ação em ${selection.length} livros?`,
            description: `Isto irá realizar "${actionLabel}" para todos os livros selecionados.`,
            /*onConfirm: async () => {
                for (const bookId of selection) {
                  const book = allDisplayItems.find(b => b.id === bookId) as EnrichedBook;
                  if (book) {
                    await handleMainAction(book); // processa um por vez
                  }
                }
                setSelection([]);
              }*/
             /*onConfirm: async () => {
              await Promise.all(
                selection.map(async bookId => {
                  const book = allDisplayItems.find(b => b.id === bookId) as EnrichedBook;
                  if (book) {
                    await handleMainAction(book);
                  }
                })
              );
              setSelection([]);
            }*/
           onConfirm: async () => {
            if (selection.length === 0) return;

            await withMutation(async () => {
              const results = await Promise.all(
                selection.map(async (bookId) => {
                  const book = allDisplayItems.find(b => b.id === bookId) as EnrichedBook;
                  if (!book) return { book, status: 'skipped', message: 'Livro não encontrado' };
                  const status = await handleMainAction(book);
                  return { book, status, message: status === 'success' ? `Livro "${book.name}" processado com sucesso` : `Erro ao processar "${book.name}"` };
                })
              );

              const successCount = results.filter(r => r.status === 'success').length;
              const errorCount = results.filter(r => r.status === 'error').length;

              // Toast resumo
              toast({
                title: 'Ação em massa concluída',
                description: `${successCount} livros processados com sucesso. ${errorCount} falharam.`,
                variant: errorCount > 0 ? 'destructive' : 'default'
              });

              setSelection([]);
            });
          }
        });
    }
  };
  
  const handleBulkResubmit = (targetStage: string) => {
    const stageKey = findStageKeyFromStatus(targetStage);
    if (!stageKey) {
      toast({ title: "Erro de Workflow", description: `Não foi possível encontrar a configuração para a etapa: ${targetStage}`, variant: "destructive" });
      return;
    }
    const stageConfig = STAGE_CONFIG[stageKey];
    openConfirmationDialog({
      title: `Reenviar ${selection.length} livros?`,
      description: `Isso reenviará todos os livros selecionados para a etapa "${stageConfig.title}".`,
      onConfirm: () => {
        selection.forEach(bookId => handleResubmit(bookId, targetStage));
        setSelection([]);
      }
    });
  }

    const handleBulkResubmitMoveTifs = (targetStage: string) => {
    const stageKey = findStageKeyFromStatus(targetStage);
    if (!stageKey) {
      toast({ title: "Erro de Workflow", description: `Não foi possível encontrar a configuração para a etapa: ${targetStage}`, variant: "destructive" });
      return;
    }
    const stageConfig = STAGE_CONFIG[stageKey];
    openConfirmationDialog({
      title: `Reenviar ${selection.length} livros?`,
      description: `Isso reenviará todos os livros selecionados para a etapa "${stageConfig.title}".`,
      onConfirm: () => {
        selection.forEach(bookId => handleResubmitMoveTifs(bookId, targetStage));
        setSelection([]);
      }
    });
  }
  
  const getDynamicActionButton = (book: EnrichedBook): { label: string, icon: LucideIcon, disabled: boolean } | null => {
      if (processingBookIds.includes(book.id)) {
        return { label: "Processing...", icon: Loader2, disabled: true };
      }
      
      if (stage === 'confirm-reception') {
          return { label: 'Confirm Arrival', icon: Check, disabled: false };
      }

      if (stage === 'already-received') {
          const projectWorkflow = projectWorkflows[book.projectId!] || [];
          const isScanningEnabled = projectWorkflow.includes('to-scan');
    if (isScanningEnabled) {
        const label = canViewAll ? 'Assign Scanner' : 'Assign to me';
        return { label: label, icon: UserPlus, disabled: false };
    } else {
        return { label: 'Send to Storage', icon: FolderSync, disabled: false };
    }
      }

      if(stage === 'scanning-started') {
        return { label: 'Complete Scan', icon: ScanLine, disabled: false };
      }
      
      if (actionButtonLabel && actionButtonIcon) {
          const Icon = iconMap[actionButtonIcon];
          return { label: actionButtonLabel, icon: Icon, disabled: false };
      }
      
      return null;
  }
    
  const renderBookRow = (item: any, index: number) => {
    const actionDetails = getDynamicActionButton(item);
    const isProcessing = processingBookIds.includes(item.id);
    const book = item as EnrichedBook;

    const hasEndTime = 
      (stage === 'scanning-started' && !!book.scanEndTime) ||
      (stage === 'indexing-started' && !!book.indexingEndTime) ||
      (stage === 'checking-started' && !!book.qcEndTime);

    let startTimeKey: keyof EnrichedBook | null = null;
    let endTimeKey: keyof EnrichedBook | null = null;

    if (config.assigneeRole === 'scanner') {
        startTimeKey = 'scanStartTime';
        endTimeKey = 'scanEndTime';
    } else if (config.assigneeRole === 'indexer') {
        startTimeKey = 'indexingStartTime';
        endTimeKey = 'indexingEndTime';
    } else if (config.assigneeRole === 'qc') {
        startTimeKey = 'qcStartTime';
        endTimeKey = 'qcEndTime';
    }

    return (
        <TableRow key={item.id} data-state={selection.includes(item.id) && "selected"}>
        <TableCell>
            <Checkbox
                checked={selection.includes(item.id)}
                onCheckedChange={(checked) => setSelection(
                    checked ? [...selection, item.id] : selection.filter((id) => id !== item.id)
                )}
                aria-label={`Selecionar linha ${index + 1}`}
            />
        </TableCell>
        <TableCell className="font-medium">
            <div className="flex items-center gap-2">
            <span
              className="h-4 w-4 rounded-full border shrink-0"
              style={{ backgroundColor: book.color || '#FFFFFF' }}
            />
                <Link href={`/books/${item.id}`} className="hover:underline">{item.name}</Link>
            </div>
        </TableCell>
        <TableCell>{item.projectName}</TableCell>
        <TableCell className="hidden md:table-cell">{item.isbn}</TableCell>
        <TableCell className="hidden md:table-cell">{item.expectedDocuments}</TableCell>
        {canViewAll && config.assigneeRole && (
          <TableCell>{item.assigneeName}</TableCell>
        )}
        {(stage !== 'confirm-reception' && stage !== 'already-received' && stage !== 'pending-shipment' && stage !== 'pending-deliveries') && (
          <>
         <TableCell>{item.scannerDeviceName}</TableCell>
          <TableCell>{item.storageName}</TableCell>
          </>
        )}
        {startTimeKey && endTimeKey && (
          <>
            <TableCell className="hidden md:table-cell">
              {item[startTimeKey] ? (
                <div className="flex flex-col">
                  <span>{format(new Date(item[startTimeKey]!), "HH:mm")}</span>
                  <span>{format(new Date(item[startTimeKey]!), "yyyy-MM-dd")}</span>
                </div>
              ) : ""}
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {item[endTimeKey] ? (
                <div className="flex flex-col">
                  <span>{format(new Date(item[endTimeKey]!), "HH:mm")}</span>
                  <span>{format(new Date(item[endTimeKey]!), "yyyy-MM-dd")}</span>
                </div>
              ) : ""}
            </TableCell>
          </>
        )}
        <TableCell>
          <div className="flex items-center justify-end gap-2">
            {isCancelable && hasEndTime ? (
                <Badge variant="default" className="bg-green-600 hover:bg-green-600/90">
                  <Check className="mr-2 h-4 w-4" />
                  Tarefa Completa
                </Badge>
            ) : isCancelable ? (
              <>
              {stage === 'scanning-started' && (
                    <Button size="sm" variant="secondary" onClick={() => openAppValidateScan(item.id)}>
                      <Check className="mr-2 h-4 w-4" />
                        Validar
                    </Button>
                  )}
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  openConfirmationDialog({
                    title: "Confirmar Tarefa Completa",
                    description: `Tem a certeza de que deseja marcar "${item.name}" como completa?`,
                    onConfirm: () => handleCompleteTask(item.id, item.status),
                  })
                }
              >
                <Check className="mr-2 h-4 w-4" />
                Concluir
              </Button>
              </>
            )  : null}
            {(canViewAll || !['scanning-started', 'indexing-started', 'checking-started'].includes(stage)) && actionDetails && (
              <Button size="sm" onClick={() => handleActionClick(item)} disabled={actionDetails.disabled}>
                  <actionDetails.icon className={isProcessing ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
                  {actionDetails.label}
              </Button>
            )}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => setObservationTarget(book)}>
                        <MessageSquarePlus className="mr-2 h-4 w-4" />
                        Observação
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setDetailsState({ open: true, book: item })}>
                        <Info className="mr-2 h-4 w-4" />
                        Detalhes
                    </DropdownMenuItem>
                    {isCancelable && (
                      <>
                        
                        { hasEndTime && (
                           <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-yellow-600 hover:bg-yellow-100" onSelect={() => openConfirmationDialog({
                                  title: `Marcar "${item.name}" como Não Completo?`,
                                  description: "Isto irá desfazer a conclusão desta tarefa, marcando-a como não completa.",
                                  onConfirm: () => handleCancelCompleteTask(item.id, item.status)
                              })}>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Marcar Não Completo
                          </DropdownMenuItem>
                          </>
                        )}

                        <DropdownMenuSeparator />

                        <DropdownMenuItem onSelect={() => openConfirmationDialog({
                                title: `Cancelar tarefa para "${item.name}"?`,
                                description: "Isto irá devolver o livro à etapa anterior.",
                                onConfirm: () => handleCancelTask(item.id, item.status)
                            })} className="text-destructive hover:bg-red-100">
                            <Undo2 className="mr-2 h-4 w-4" />
                            Reverter para Pendente
                        </DropdownMenuItem>
                       
                      </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
        </TableRow>
    )
  }
  
  const renderDocumentRow = (item: AppDocument, index: number) => (
     <TableRow key={item.id} data-state={selection.includes(item.id) && "selected"}>
      <TableCell>
            <Checkbox
                checked={selection.includes(item.id)}
                onCheckedChange={(checked) => setSelection(
                    checked ? [...selection, item.id] : selection.filter((id) => id !== item.id)
                )}
                aria-label={`Selecionar linha ${index + 1}`}
            />
        </TableCell>
      <TableCell className="font-medium">
          <Link href={`/documents/${item.id}`} className="hover:underline">{item.name}</Link>
      </TableCell>
      <TableCell>{item.client}</TableCell>
      <TableCell className="hidden md:table-cell">{item.type}</TableCell>
      <TableCell>
        <Badge variant={getBadgeVariant(item.status)}>{item.status}</Badge>
      </TableCell>
       <TableCell className="hidden md:table-cell">{item.lastUpdated}</TableCell>
      {(actionButtonLabel) && (
        <TableCell>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => openConfirmationDialog({
                title: `Tem a certeza?`,
                description: `Isto irá mover o livro "${item.name}" para a fase seguinte.`,
                onConfirm: () => handleMoveBookToNextStage(item.bookId!, item.status)
            })}>
                {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
                {actionButtonLabel}
            </Button>
          </div>
        </TableCell>
      )}
    </TableRow>
  )
    const PaginationNav = () => {
    if (totalPages <= 1) return null;
    const pageNumbers: number[] = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
        for (let i = 1; i <= totalPages; i++) { pageNumbers.push(i); }
    } else {
        pageNumbers.push(1);
        if (currentPage > 3) { pageNumbers.push(-1); }
        let start = Math.max(2, currentPage - 1);
        let end = Math.min(totalPages - 1, currentPage + 1);
        if (currentPage <= 2) { end = 3; }
        if (currentPage >= totalPages - 1) { start = totalPages - 2; }
        for (let i = start; i <= end; i++) { pageNumbers.push(i); }
        if (currentPage < totalPages - 2) { pageNumbers.push(-1); }
        pageNumbers.push(totalPages);
    }
    
    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}/></PaginationItem>
          {pageNumbers.map((num, i) => num === -1 ? <PaginationItem key={`ellipsis-${i}`}><PaginationEllipsis /></PaginationItem> : <PaginationItem key={num}><PaginationLink href="#" isActive={currentPage === num} onClick={(e) => { e.preventDefault(); setCurrentPage(num); }}>{num}</PaginationLink></PaginationItem>)}
          <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}/></PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  }

  const handleRejectSubmit = () => {
    if (!currentBook) return;
    //handleClientAction(currentBook.id, 'reject', rejectionComment);
    setRejectionComment("");
    setCurrentBook(null);
  }

  const openTaggingDialog = (doc: AppDocument) => {
    const book = Object.values(groupedByBook).map(g => g.book).find(b => b.id === doc.bookId);
    if (!book) return;
    
    const availableTags = rejectionTags.filter(tag => tag.clientId === book.clientId);

    setTaggingState({
      open: true,
      docId: doc.id,
      docName: doc.name,
      selectedTags: doc.tags || [],
      availableTags: availableTags
    });
  };
  
  const closeTaggingDialog = () => {
    setTaggingState({ open: false, docId: null, docName: null, selectedTags: [], availableTags: [] });
  };
  
  const handleTaggingSubmit = () => {
    if (taggingState.docId) {
      tagPageForRejection(taggingState.docId, taggingState.selectedTags);
    }
    closeTaggingDialog();
  };

  const isScanFolderMatch = scanState.book?.name === scanState.folderName;

  const tableColSpan = React.useMemo(() => {
    let count = 6;
    if (config.assigneeRole && canViewAll) count++;
    return count;
  }, [dataType, stage, config.assigneeRole, canViewAll]);
  
  const renderBulkActions = () => {
    if (selection.length === 0) return null;
    /*
    if (stage === 'pending-deliveries') {
      return (
         <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selection.length} selected</span>
            <Button size="sm" onClick={() => openConfirmationDialog({
              title: `Approve ${selection.length} books?`,
              description: 'This will approve all selected books and finalize them.',
              onConfirm: () => {
                selection.forEach(bookId => handleClientAction(bookId, 'approve'));
                setSelection([]);
              }
            })}>
              <ThumbsUp className="mr-2 h-4 w-4" /> Approve Selected
            </Button>
         </div>
      );
    } else*/
     if (stage === 'corrected') {
      return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selection.length} selected</span>
                    <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm">
                          <Send className="mr-2 h-4 w-4" /> Send Only Tifs To...
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => handleBulkResubmitMoveTifs("Storage")}
                        >
                          Storage
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleBulkResubmitMoveTifs("To Indexing")}
                        >
                          Indexing
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleBulkResubmitMoveTifs("To Checking")}
                        >
                          Quality Control
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem
                          onClick={() => handleBulkResubmitMoveTifs("Ready for Processing")}
                        >
                          Ready for Processing
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="secondary">
                          <Send className="mr-2 h-4 w-4" /> Send All To...
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => handleBulkResubmit("Final Quality Control")}
                        >
                          Final Quality Control
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
        </div>
      );
    } else if (stage === 'client-rejections') {
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{selection.length} selected</span>
           <Button size="sm" onClick={() => openConfirmationDialog({
             title: `Marcar ${selection.length} livros como corrigidos?`,
             description: `Isso moverá todos os livros selecionados para a próxima etapa.`,
             onConfirm: () => {
               selection.forEach(bookId => handleMarkAsCorrected(bookId));
               setSelection([]);
             }
           })}>
            <Undo2 className="mr-2 h-4 w-4" />
            Mark Selected as Corrected
          </Button>
        </div>
      )
    } else if (SIMPLE_BULK_ACTION_STAGES.includes(stage)) {
       const firstBook = allDisplayItems.find(item => item.id === selection[0]) as EnrichedBook;
       if (!firstBook) return null;

       const actionType = determineNextActionType(firstBook);

       if(actionType === 'ASSIGN') {
          const role = STAGE_CONFIG[getNextEnabledStage(findStageKeyFromStatus(firstBook.status)!, projectWorkflows[firstBook.projectId] || [])!]?.assigneeRole;
          if(!role) return null;
           return (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selection.length} selected</span>
                {canViewAll && (
                <Button size="sm" onClick={() => openBulkAssignmentDialog(role)}>
                  <UserPlus className="mr-2 h-4 w-4" /> Atribuir Itens Selecionados
                </Button>)
                }
              </div>
            );
       } else {
          return (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{selection.length} selected</span>
               {canViewAll && (
              <Button size="sm" onClick={handleBulkAction}>
                <CheckCheck className="mr-2 h-4 w-4" /> Concluir Selecionados
              </Button>)
              }
            </div>
          )
       }
    } else if (isCancelable) {
       return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{selection.length} selected</span>
          <Button size="sm" variant="destructive" onClick={handleBulkCancel}>
            <X className="mr-2 h-4 w-4" /> Cancel Selected Tasks
          </Button>
        </div>
      )
    }

    return null;
  }
  
  const getPagesForBook = (bookId: string) => {
    const getPageNum = (name: string): number => {
        const match = name.match(/ - Page (\d+)/);
        return match ? parseInt(match[1], 10) : 9999; 
    }

    return documents
        .filter(doc => doc.bookId === bookId)
        .sort((a, b) => getPageNum(a.name) - getPageNum(b.name));
  }
  
  const gridClasses: { [key: number]: string } = {
    1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6',
    7: 'grid-cols-7', 8: 'grid-cols-8', 9: 'grid-cols-9', 10: 'grid-cols-10', 11: 'grid-cols-11', 12: 'grid-cols-12'
  };


  const openFlagDialog = (doc: AppDocument, flag: NonNullable<AppDocument['flag']>) => {
    setFlagDialogState({
      open: true,
      docId: doc.id,
      docName: doc.name,
      flag: flag,
      comment: doc.flagComment || '',
    });
  };

  const closeFlagDialog = () => {
    setFlagDialogState({ open: false, docId: null, docName: null, flag: null, comment: '' });
  };

  const handleFlagSubmit = () => {
    if (flagDialogState.docId && flagDialogState.flag) {
      updateDocumentFlag(flagDialogState.docId, flagDialogState.flag, flagDialogState.comment);
    }
    closeFlagDialog();
  };

  const handleSaveObservation = () => {
    if (observationTarget && newObservation.trim()) {
        addBookObservation(observationTarget.id, newObservation.trim());
        setNewObservation('');
        setObservationTarget(null);
    }
  }
  
  return (
    <>
      <AlertDialog open={pendingTasksState.open} onOpenChange={(open) => !open && setPendingTasksState({ open: false, tasks: [], bookToStart: {} as EnrichedBook, role: 'scanner' })}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Você tem tarefas por terminar</AlertDialogTitle>

                  <AlertDialogDescription asChild>
                    <div>
                      <p>Os seguintes livros ainda estão marcados como "{pendingTasksState.role} iniciado". Você deseja marcá-los como completos antes de iniciar "{pendingTasksState.bookToStart.name}"?</p>
                      <ul className="list-disc pl-5 mt-2">
                          {pendingTasksState.tasks.map(t => <li key={t.id}>{t.name}</li>)}
                      </ul>
                    </div>
                  </AlertDialogDescription>

            </AlertDialogHeader>
            <AlertDialogFooter>
              <ul className="list-none p-0 m-0 flex flex-col gap-2 w-full">
                <li>
                  <AlertDialogAction
                    className="w-full justify-center"
                    onClick={() => {
                      pendingTasksState.tasks.forEach(task =>
                        handleCompleteTask(task.id, task.status)
                      )
                      handleStartTask(
                        pendingTasksState.bookToStart.id,
                        pendingTasksState.role
                      )
                      setPendingTasksState({
                        open: false,
                        tasks: [],
                        bookToStart: {} as EnrichedBook,
                        role: 'scanner',
                      })
                    }}
                  >
                    Sim, Completar Anterior & Iniciar Novo
                  </AlertDialogAction>
                </li>

                <li>
                  <AlertDialogCancel
                    className="w-full justify-center"
                    onClick={() => {
                      handleStartTask(pendingTasksState.bookToStart.id, pendingTasksState.role)
                      setPendingTasksState({
                        open: false,
                        tasks: [],
                        bookToStart: {} as EnrichedBook,
                        role: 'scanner',
                      })
                    }}
                  >
                    Não, Apenas Iniciar Nova Tarefa
                  </AlertDialogCancel>
                </li>

                
                <li>
                  <AlertDialogCancel className="w-full justify-center">
                    Cancelar
                  </AlertDialogCancel>
                </li>
              </ul>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

     <AlertDialog>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle className="font-headline">{config.title}</CardTitle>
                    <CardDescription>{config.description}</CardDescription>
                </div>
                 <div className="flex items-center gap-2">
                    {['to-indexing', 'to-checking'].includes(stage) && (
                      <Button variant="outline" size="sm" onClick={() => canViewAll ? setPullTaskState({open: true, stage, role: config.assigneeRole ?? null}) : handlePullNextTask(stage)}>
                        <UserPlus2 className="mr-2 h-4 w-4" /> Receber próximo
                      </Button>
                    )}
                    {renderBulkActions()}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="h-9 gap-1">
                                <Download className="h-3.5 w-3.5" />
                                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Exportar</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Exportar Seleção ({selection.length})</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => exportXLSX(selectedItems)} disabled={selection.length === 0}>Exportar como XLSX</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => exportJSON(selectedItems)} disabled={selection.length === 0}>Exportar como JSON</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => exportCSV(selectedItems)} disabled={selection.length === 0}>Exportar como CSV</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Exportar Todos ({sortedAndFilteredItems.length})</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => exportXLSX(sortedAndFilteredItems)} disabled={sortedAndFilteredItems.length === 0}>Exportar como XLSX</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => exportJSON(sortedAndFilteredItems)} disabled={sortedAndFilteredItems.length === 0}>Exportar como JSON</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => exportCSV(sortedAndFilteredItems)} disabled={sortedAndFilteredItems.length === 0}>Exportar como CSV</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                
            </div>
             <Accordion type="single" collapsible className="w-full pt-4">
                <AccordionItem value="stats">
                  <AccordionTrigger className="text-base px-6 font-semibold rounded-lg border bg-card text-card-foreground shadow-sm">
                    <div className="flex items-center gap-2"><BarChart className="h-5 w-5"/>Estatísticas</div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 px-6 border-x border-b rounded-b-lg bg-card">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                       <KpiCard title="Total de Tarefas" value={stageStats.total} icon={Book} description={`Total de livros nesta fase (${stageStats.totalPages.toLocaleString()} páginas).`} />
                       {['to-indexing', 'to-checking'].includes(stage) && (
                          <KpiCard
                            title="Livros no Armazenamento Atual"
                            value={totalLivros}
                            icon={CheckCheck}
                            description={`Total de ${totalPaginas} páginas disponíveis no armazenamento atual.`}
                          />
                        )}
                       {['scanning-started', 'indexing-started', 'checking-started'].includes(stage) && <KpiCard title="Tarefas Concluídas Hoje" value={stageStats.tasksToday} icon={CheckCheck} description={`Total de ${stageStats.totalPagesToday.toLocaleString()} páginas concluídas hoje.`} />}
                       {['scanning-started', 'indexing-started', 'checking-started'].includes(stage) && <KpiCard title="Total Concluído" value={stageStats.completed} icon={CheckCheck} description={`Total de ${stageStats.totalPagesCompleted.toLocaleString()} páginas concluídas.`} />}
                       {['scanning-started', 'indexing-started', 'checking-started'].includes(stage) && <KpiCard title="Por Concluir" value={stageStats.notCompleted} icon={Loader2} description={`${stageStats.totalPagesNotCompleted.toLocaleString()} páginas por concluir.`} />}
                    </div>
                  </AccordionContent>
                </AccordionItem>
             </Accordion>
          </CardHeader>
          <CardContent>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-muted-foreground">
                  {selection.length > 0
                    ? `${selection.length} de ${sortedAndFilteredItems.length} item(s) selecionados.`
                    : `A mostrar ${
                        displayItems.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0
                      }-${(currentPage - 1) * itemsPerPage + displayItems.length} de ${
                        sortedAndFilteredItems.length
                      } itens`}
                </div>

                <div className="flex items-center gap-4">
                  <PaginationNav />
                  <div className="flex items-center space-x-2 text-xs">
                    <p className="text-muted-foreground">Linhas por página</p>
                    <Select
                      value={`${itemsPerPage}`}
                      onValueChange={(value) => {
                        setItemsPerPage(Number(value));
                        setCurrentPage(1); // Reset para a primeira página
                      }}
                    >
                      <SelectTrigger className="h-7 w-[70px]">
                        <SelectValue placeholder={itemsPerPage} />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 20, 50, 100, 200, 500].map((pageSize) => (
                          <SelectItem key={pageSize} value={`${pageSize}`}>
                            {pageSize}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
 
                </div>
              </div>
            <Table>
              <TableHeader>
                {dataType === 'book' ? (
                  <>
                  <TableRow>
                      <TableHead className="w-[50px]">
                          <Checkbox
                              checked={displayItems.length > 0 && selection.length === displayItems.length}
                              onCheckedChange={(checked) => setSelection(checked ? displayItems.map(item => item.id) : [])}
                              aria-label="Selecionar todos"
                          />
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('name', e.shiftKey)}>
                            Nome {getSortIndicator('name')}
                        </div>
                      </TableHead>
                      <TableHead>
                         <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('projectName', e.shiftKey)}>
                            Projeto {getSortIndicator('projectName')}
                        </div>
                      </TableHead>
                      <TableHead className="hidden md:table-cell"><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('isbn', e.shiftKey)}>Cota {getSortIndicator('isbn')}</div></TableHead>
                      <TableHead className="hidden md:table-cell"><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('expectedDocuments', e.shiftKey)}>Paginas {getSortIndicator('expectedDocuments')}</div></TableHead>
                      {canViewAll && config.assigneeRole && (
                         <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('assigneeName', e.shiftKey)}>Atribuído{getSortIndicator('assigneeName')}</div></TableHead>
                      )}
                 

                        {(stage !== 'confirm-reception' && stage !== 'already-received' && stage !== 'pending-shipment' && stage !== 'pending-deliveries') && (
                          <>
                              <TableHead>
                                <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('scannerDeviceName', e.shiftKey)}>
                                    Scanner {getSortIndicator('scannerDeviceName')}
                                </div>
                              </TableHead>
                              <TableHead>
                                  <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('storageName', e.shiftKey)}>
                                    Proc. {getSortIndicator('storageName')}
                                </div>
                              </TableHead>
                          </>
                      )}
                      {(config.assigneeRole === 'scanner' || config.assigneeRole === 'indexer' || config.assigneeRole === 'qc') && (
                          <>
                              <TableHead>
                                  <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort(`${config.assigneeRole!}StartTime`, e.shiftKey)}>
                                      <span className="inline-block w-[8ch] text-left">Início</span>
                                      {getSortIndicator(`${config.assigneeRole!}StartTime`)}
                                  </div>
                              </TableHead>
                              <TableHead>
                                  <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort(`${config.assigneeRole!}EndTime`, e.shiftKey)}>
                                      <span className="inline-block w-[8ch] text-left">Fim</span>
                                      {getSortIndicator(`${config.assigneeRole!}EndTime`)}
                                  </div>
                              </TableHead>
                          </>
                      )}

                      
                      
                      {/*<TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('status', e.shiftKey)}>Estado {getSortIndicator('status')}</div></TableHead>*/}
                      <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead />
                    <TableHead>
                        <Input
                            placeholder="Filtrar..."
                            value={columnFilters['name'] || ''}
                            onChange={(e) => handleColumnFilterChange('name', e.target.value)}
                            className="h-8"
                        />
                    </TableHead>
                    <TableHead>
                        <Input
                            placeholder="Filtrar..."
                            value={columnFilters['projectName'] || ''}
                            onChange={(e) => handleColumnFilterChange('projectName', e.target.value)}
                            className="h-8"
                        />
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                        <Input
                            placeholder="Filtrar..."
                            value={columnFilters['isbn'] || ''}
                            onChange={(e) => handleColumnFilterChange('isbn', e.target.value)}
                            className="h-8"
                        />
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                        <Input
                            placeholder="Filtrar..."
                            value={columnFilters['expectedDocuments'] || ''}
                            onChange={(e) => handleColumnFilterChange('expectedDocuments', e.target.value)}
                            className="h-8"
                        />
                    </TableHead>
                     {canViewAll && config.assigneeRole && (
                       <TableHead>
                            <Input
                                placeholder="Filtrar..."
                                value={columnFilters['assigneeName'] || ''}
                                onChange={(e) => handleColumnFilterChange('assigneeName', e.target.value)}
                                className="h-8"
                            />
                       </TableHead>
                     )}
                      {(stage !== 'confirm-reception' && stage !== 'already-received' && stage !== 'pending-shipment' && stage !== 'pending-deliveries') && (
                          <>
                            <TableHead>
                                <Input
                                    placeholder="Filtrar..."
                                    value={columnFilters['scannerDeviceName'] || ''}
                                    onChange={(e) => handleColumnFilterChange('scannerDeviceName', e.target.value)}
                                    className="h-8"
                                />
                            </TableHead>
                            <TableHead>
                                <Input
                                    placeholder="Filtrar..."
                                    value={columnFilters['storageName'] || ''}
                                    onChange={(e) => handleColumnFilterChange('storageName', e.target.value)}
                                    className="h-8"
                                />
                            </TableHead>
                          </>
                      )}
                     {(config.assigneeRole === 'scanner' || config.assigneeRole === 'indexer' || config.assigneeRole === 'qc') && (
                        <>
                            <TableHead>
                                <Input placeholder="Filtrar..." value={columnFilters[`${config.assigneeRole!}StartTime`] || ''} onChange={e => handleColumnFilterChange(`${config.assigneeRole!}StartTime`, e.target.value)} className="h-8" />
                            </TableHead>
                            <TableHead>
                                <Input placeholder="Filtrar..." value={columnFilters[`${config.assigneeRole!}EndTime`] || ''} onChange={e => handleColumnFilterChange(`${config.assigneeRole!}EndTime`, e.target.value)} className="h-8" />
                            </TableHead>
                        </>
                    )}
              
                    <TableHead className="text-right">
                      <Button variant="ghost" size="sm" onClick={handleClearFilters} disabled={Object.values(columnFilters).every(v => !v)}>Limpar Filtros</Button>
                    </TableHead>
                  </TableRow>
                  </>
                ) : (
                  <>
                   <TableRow>
                      <TableHead className="w-[50px]">
                         <Checkbox
                              checked={displayItems.length > 0 && selection.length === displayItems.length}
                              onCheckedChange={(checked) => setSelection(checked ? displayItems.map(item => item.id) : [])}
                              aria-label="Selecionar todos"
                          />
                      </TableHead>
                    <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('name', e.shiftKey)}>Nome do Documento {getSortIndicator('name')}</div></TableHead>
                    <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('client', e.shiftKey)}>Cliente {getSortIndicator('client')}</div></TableHead>
                    <TableHead className="hidden md:table-cell"><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('type', e.shiftKey)}>Tipo {getSortIndicator('type')}</div></TableHead>
                    <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('status', e.shiftKey)}>Estado {getSortIndicator('status')}</div></TableHead>
                    <TableHead className="hidden md:table-cell"><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('lastUpdated', e.shiftKey)}>Última Atualização {getSortIndicator('lastUpdated')}</div></TableHead>
                    {(actionButtonLabel) && (
                      <TableHead>Ações</TableHead>
                    )}
                  </TableRow>
                  <TableRow>
                    <TableHead />
                    <TableHead><Input placeholder="Filtrar nome..." value={columnFilters['name'] || ''} onChange={(e) => handleColumnFilterChange('name', e.target.value)} className="h-8"/></TableHead>
                    <TableHead><Input placeholder="Filtrar cliente..." value={columnFilters['client'] || ''} onChange={(e) => handleColumnFilterChange('client', e.target.value)} className="h-8"/></TableHead>
                    <TableHead className="hidden md:table-cell"><Input placeholder="Filter type..." value={columnFilters['type'] || ''} onChange={(e) => handleColumnFilterChange('type', e.target.value)} className="h-8"/></TableHead>
                    <TableHead><Input placeholder="Filtrar estado..." value={columnFilters['status'] || ''} onChange={(e) => handleColumnFilterChange('status', e.target.value)} className="h-8"/></TableHead>
                    <TableHead className="hidden md:table-cell"><Input placeholder="Filtrar data..." value={columnFilters['lastUpdated'] || ''} onChange={(e) => handleColumnFilterChange('lastUpdated', e.target.value)} className="h-8"/></TableHead>
                    {(actionButtonLabel) && (<TableHead className="text-right"><Button variant="ghost" size="sm" onClick={handleClearFilters} disabled={Object.values(columnFilters).every(v => !v)}>Limpar Filtros</Button></TableHead>)}
                  </TableRow>
                  </>
                )}
              </TableHeader>
              <TableBody>
                {displayItems.length > 0 ? (
                  displayItems.map((item, index) => (
                    dataType === 'book'
                      ? renderBookRow(item as EnrichedBook, index)
                      : renderDocumentRow(item as AppDocument, index)
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={tableColSpan} className="h-24 text-center">
                      {emptyStateText}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
      <CardFooter className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {selection.length > 0 
                ? `${selection.length} de ${sortedAndFilteredItems.length} item(s) selecionados.` 
                : `A mostrar ${displayItems.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-${(currentPage - 1) * itemsPerPage + displayItems.length} de ${sortedAndFilteredItems.length} itens`}
            </div>
            
            <div className="flex items-center gap-4">
              <PaginationNav />
              <div className="flex items-center space-x-2 text-xs">
                <p className="text-muted-foreground">Linhas por página</p>
                <Select
                  value={`${itemsPerPage}`}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1); // Reset para a primeira página
                  }}
                >
                  <SelectTrigger className="h-7 w-[70px]">
                    <SelectValue placeholder={itemsPerPage} />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50, 100, 200, 500].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
 
            </div>

          </CardFooter>
        </Card>

        <AlertDialogContent>
          <AlertDialogHeader>
              <AlertDialogTitle>Motivo da Rejeição</AlertDialogTitle>
              <AlertDialogDescription>
                  Por favor, forneça um motivo para rejeitar o livro "{currentBook?.name}". Isso será enviado para a equipe interna para correção.
              </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
              <Label htmlFor="rejection-comment">Comentário</Label>
              <Textarea 
                  id="rejection-comment"
                  placeholder="ex.:, Page 5 is blurry, please re-scan."
                  value={rejectionComment}
                  onChange={(e) => setRejectionComment(e.target.value)}
              />
          </div>
          <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleRejectSubmit} disabled={!rejectionComment.trim()}>
                  Enviar Rejeição
              </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    <AlertDialog open={confirmationState.open} onOpenChange={(open) => !open && setConfirmationState(prev => ({...prev, open: false}))}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{confirmationState.title}</AlertDialogTitle>
                <AlertDialogDescription>{confirmationState.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmationState(prev => ({...prev, open: false}))}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                    confirmationState.onConfirm();
                    setConfirmationState({ open: false, title: '', description: '', onConfirm: () => {} });
                }}>Confirm</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <Dialog open={scanState.open} onOpenChange={closeScanningDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar Digitalização para "{scanState.book?.name}"</DialogTitle>
          <DialogDescription>
            Selecione a pasta contendo as páginas digitalizadas. O nome da pasta deve corresponder ao nome do livro.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="folder-upload">Selecionar Pasta Digitalizada</Label>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline">
                    <label htmlFor="folder-upload" className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        Escolher Diretório
                    </label>
                </Button>
                <Input {...{
                  id: "folder-upload",
                  type: "file",
                  onChange: handleDirectorySelect,
                  webkitdirectory: "true",
                  directory: "true",
                  className: "hidden",
                  accept: ".tif"
                } as any} />

                {scanState.folderName && (
                    <div className="flex items-center gap-2 text-sm font-medium">
                        {isScanFolderMatch ? <CheckCheck className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
                        <span>{scanState.folderName}</span>
                         {scanState.fileCount !== null && <span className="text-muted-foreground">({scanState.fileCount} .tif files)</span>}
                    </div>
                )}
              </div>
          </div>
          {scanState.folderName && !isScanFolderMatch && (
              <p className="text-sm text-destructive">
                  O nome da pasta não corresponde ao nome do livro. Esperado: "{scanState.book?.name}".
              </p>
          )}
          {scanState.book && scanState.fileCount !== null && scanState.fileCount !== scanState.book.expectedDocuments && (
            <Alert variant="destructive">
              <FileWarning className="h-4 w-4" />
              <AlertTitle>Incompatibilidade de Contagem de Arquivos</AlertTitle>
              <AlertDescription>
                Encontrados {scanState.fileCount} arquivos .tif, mas esperado {scanState.book.expectedDocuments}.
                Prosseguindo, serão geradas apenas {scanState.fileCount} páginas.
              </AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeScanningDialog}>Cancelar</Button>
          <Button onClick={stage === 'already-received' ? handleConfirmScanBypass : handleConfirmScan} disabled={!isScanFolderMatch || scanState.fileCount === 0}>
            Confirmar Digitalização
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={assignState.open} onOpenChange={closeAssignmentDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{assignState.role ? assignmentConfig[assignState.role].title : 'Assign User'} for "{assignState.book?.name}"</DialogTitle>
          <DialogDescription>{assignState.role ? assignmentConfig[assignState.role].description : ''}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder={`Selecione um ${assignState.role}...`} />
            </SelectTrigger>
            <SelectContent>
              {assignState.role && assignState.book && 
                getAssignableUsers(assignState.role, assignState.book.projectId).map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeAssignmentDialog}>Cancelar</Button>
          <Button onClick={handleConfirmAssignment} disabled={!selectedUserId}>
            Atribuir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    <Dialog open={bulkAssignState.open} onOpenChange={closeBulkAssignmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir {selection.length} livros a um {bulkAssignState.role}</DialogTitle>
            <DialogDescription>
                Selecione um utilizador para executar a tarefa nos livros selecionados. As tarefas serão adicionadas à sua lista de pendentes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={bulkAssignState.selectedUserId} onValueChange={(val) => setBulkAssignState(s => ({...s, selectedUserId: val}))}>
              <SelectTrigger>
                <SelectValue placeholder={`Selecione um ${bulkAssignState.role}...`} />
              </SelectTrigger>
              <SelectContent>
                {bulkAssignState.role && getAssignableUsers(bulkAssignState.role).map(user => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeBulkAssignmentDialog}>Cancel</Button>
            <Button onClick={handleBulkAssignmentSubmit} disabled={!bulkAssignState.selectedUserId}>
              Atribuir
            </Button>
          </DialogFooter>
        </DialogContent>
    </Dialog>
    
    <Dialog open={flagDialogState.open} onOpenChange={closeFlagDialog}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Flag Document: "{flagDialogState.docName}"</DialogTitle>
                <DialogDescription>
                    Provide a comment for the flag. This will be visible to the team.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
                <Label htmlFor="flag-comment">Comment</Label>
                <Textarea
                    id="flag-comment"
                    placeholder={`Reason for the ${flagDialogState.flag}...`}
                    value={flagDialogState.comment}
                    onChange={(e) => setFlagDialogState(prev => ({...prev, comment: e.target.value}))}
                    className="min-h-[100px]"
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={closeFlagDialog}>Cancel</Button>
                <Button onClick={handleFlagSubmit} disabled={!flagDialogState.comment.trim()}>Save Comment</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <Dialog open={detailsState.open} onOpenChange={() => setDetailsState({ open: false, book: undefined })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Livro</DialogTitle>
            <DialogDescription>{detailsState.book?.name}</DialogDescription>
          </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
              <DetailItem 
                label="Projeto" 
                value={
                  <Link href={`/projects/${detailsState.book?.projectId}`} className="text-primary hover:underline">
                    {detailsState.book?.projectName}
                  </Link>
                } 
              />
              <DetailItem label="Cliente" value={detailsState.book?.clientName} />
              <DetailItem label="Estado" value={<Badge variant="outline">{detailsState.book?.status}</Badge>} />
              <Separator />
              <DetailItem label="Autor" value={detailsState.book?.author || '—'} />
              <DetailItem label="ISBN" value={detailsState.book?.isbn || '—'} />
              <DetailItem label="Ano de Publicação" value={detailsState.book?.publicationYear || '—'} />
              <Separator />
              <DetailItem label="Prioridade" value={detailsState.book?.priority || '—'} />
              <DetailItem label="Páginas Esperadas" value={detailsState.book?.expectedDocuments} />
              <DetailItem label="Páginas Digitalizadas" value={detailsState.book?.documentCount} />
            </div>
           <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setDetailsState({ open: false, book: undefined })}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    
    <Dialog open={pullTaskState.open} onOpenChange={(open) => !open && setPullTaskState({ open: false, stage: '', role: null })}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Obter Próxima Tarefa e Atribuir</DialogTitle>
          <DialogDescription>
            Encontre o próximo livro disponível da etapa anterior e atribua-o a um usuário.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Label htmlFor="user-select">Atribuir a</Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger id="user-select">
              <SelectValue placeholder={`Selecione um usuário...`} />
            </SelectTrigger>
            <SelectContent>
              {pullTaskState.role && getAssignableUsers(pullTaskState.role).map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setPullTaskState({ open: false, stage: '', role: null })}>Cancelar</Button>
          <Button onClick={() => {
            handlePullNextTask(pullTaskState.stage, selectedUserId);
            setPullTaskState({ open: false, stage: '', role: null });
            setSelectedUserId('');
          }} disabled={!selectedUserId}>
            Atribuir Tarefa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={!!observationTarget} onOpenChange={() => setObservationTarget(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Adicionar Observação para: {observationTarget?.name}</DialogTitle>
                <DialogDescription>
                    A sua nota será adicionada ao histórico do livro com o seu nome e data.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Textarea
                    placeholder="Escreva a sua observação aqui..."
                    value={newObservation}
                    onChange={(e) => setNewObservation(e.target.value)}
                    rows={5}
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setObservationTarget(null)}>Cancelar</Button>
                <Button onClick={() => {
                    if (observationTarget) addBookObservation(observationTarget.id, newObservation);
                    setNewObservation('');
                    setObservationTarget(null);
                }} disabled={!newObservation.trim()}>Guardar Observação</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  )
}
    

