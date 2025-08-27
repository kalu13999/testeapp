

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
import { FolderSync, MessageSquareWarning, Trash2, Replace, FilePlus2, Info, BookOpen, X, Tag, ShieldAlert, AlertTriangle, Check, ScanLine, FileText, FileJson, PlayCircle, Send, UserPlus, CheckCheck, Archive, ThumbsUp, ThumbsDown, Undo2, MoreHorizontal, Loader2, Upload, FileWarning, Download, ArrowUp, ArrowDown, ChevronsUpDown, XCircle, UserPlus2 } from "lucide-react";
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
import { AppDocument, EnrichedBook, User, RejectionTag } from "@/context/workflow-context";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STAGE_CONFIG, findStageKeyFromStatus, getNextEnabledStage } from "@/lib/workflow-config";
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


const ITEMS_PER_PAGE = 10;
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
};

interface WorkflowClientProps {
  config: {
    title: string;
    description: string;
    dataType: 'book' | 'document';
    actionButtonLabel?: string;
    actionButtonIcon?: keyof typeof iconMap;
    emptyStateText: string;
    dataStatus?: string; // For books
    dataStage?: string; // For documents
    assigneeRole?: 'scanner' | 'indexer' | 'qc';
  };
  stage: string;
}

type BadgeVariant = "default" | "destructive" | "secondary" | "outline";
type AssignmentRole = 'scanner' | 'indexer' | 'qc';

const assignmentConfig: { [key in AssignmentRole]: { title: string, description: string, permission: string } } = {
    scanner: { title: "Assign Scanner", description: "Select a scanner operator to process this book.", permission: '/workflow/to-scan' },
    indexer: { title: "Assign Indexer", description: "Select an indexer to process this book.", permission: '/workflow/to-indexing' },
    qc: { title: "Assign for QC", description: "Select a QC specialist to review this book.", permission: '/workflow/to-checking' }
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

export default function WorkflowClient({ config, stage }: WorkflowClientProps) {
  const { 
    books, documents, handleMoveBookToNextStage, 
    currentUser, users, permissions,
    handleStartTask, handleAssignUser, handleStartProcessing, handleCancelTask,
    selectedProjectId, projectWorkflows, handleConfirmReception, getNextEnabledStage,
    handleSendToStorage, processingBookIds,
    handleClientAction, handleFinalize, handleMarkAsCorrected, handleResubmit,
    addPageToBook, deletePageFromBook, updateDocumentFlag, rejectionTags, tagPageForRejection,
    handleCompleteTask, handlePullNextTask
  } = useAppContext();

  const { toast } = useToast();
  const { title, description, dataType, actionButtonLabel, actionButtonIcon, emptyStateText, dataStatus, dataStage } = config;
  const ActionIcon = actionButtonIcon ? iconMap[actionButtonIcon] : FolderSync;

  const [scanState, setScanState] = React.useState<{ open: boolean; book: EnrichedBook | null; folderName: string | null; fileCount: number | null; }>({ open: false, book: null, folderName: null, fileCount: null });
  const [selection, setSelection] = React.useState<string[]>([]);
  const [confirmationState, setConfirmationState] = React.useState({ open: false, title: '', description: '', onConfirm: () => {} });
  const [assignState, setAssignState] = React.useState<{ open: boolean; book: EnrichedBook | null; role: AssignmentRole | null }>({ open: false, book: null, role: null });
  const [bulkAssignState, setBulkAssignState] = React.useState<{ open: boolean; role: AssignmentRole | null }>({ open: false, role: null });
  const [pullTaskState, setPullTaskState] = React.useState<{ open: boolean; stage: string; role: AssignmentRole | null }>({ open: false, stage: '', role: null });
  const [pendingTasksState, setPendingTasksState] = React.useState<{ open: boolean; tasks: EnrichedBook[], bookToStart: EnrichedBook, role: AssignmentRole }>({ open: false, tasks: [], bookToStart: {} as EnrichedBook, role: 'scanner' });

  const [selectedUserId, setSelectedUserId] = React.useState<string>("");
  const [selectedBulkUserId, setSelectedBulkUserId] = React.useState<string>("");
  const [detailsState, setDetailsState] = React.useState<{ open: boolean; book?: EnrichedBook }>({ open: false });
  const [currentPage, setCurrentPage] = React.useState(1);
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({});
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([
    { id: 'name', desc: false }
  ]);
  const [rejectionComment, setRejectionComment] = React.useState("");
  const [currentBook, setCurrentBook] = React.useState<{id: string, name: string} | null>(null);

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
    
    // START HERE: The error might be because we filter by dataStatus,
    // but the `openTasks` check needs to see books in a DIFFERENT status (e.g. "Scanning Started").
    // Let's broaden the initial pool for book-based views.
    if (dataType === 'book') {
        items = books;
    } else if (dataType === 'document' && dataStage) {
      items = documents.filter(doc => doc.status === dataStage);
    } else {
      items = [];
    }

    // Now filter down to the specific status for the page display
    if (dataType === 'book' && dataStatus) {
      items = (items as EnrichedBook[]).filter(book => book.status === dataStatus);
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
  }, [books, documents, dataType, dataStatus, dataStage, currentUser, permissions, config.assigneeRole, users, canViewAll]);

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

  const totalPages = Math.ceil(sortedAndFilteredItems.length / ITEMS_PER_PAGE);
  const displayItems = sortedAndFilteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
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
    toast({ title: "Export Successful", description: `${data.length} items exported as JSON.` });
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
    toast({ title: "Export Successful", description: `${data.length} items exported as CSV.` });
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
    toast({ title: "Export Successful", description: `${data.length} items exported as XLSX.` });
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
        toast({ title: "Invalid Selection", description: "Please select a folder, not an individual file.", variant: "destructive" });
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
      toast({ title: "No User Selected", description: "Please select a user to assign the task.", variant: "destructive" });
    }
  };
  
  const openBulkAssignmentDialog = (role: AssignmentRole) => {
    setBulkAssignState({ open: true, role });
  };
  
  const closeBulkAssignmentDialog = () => {
    setBulkAssignState({ open: false, role: null });
    setSelectedBulkUserId('');
  };

  const handleConfirmBulkAssignment = () => {
    const role = bulkAssignState.role;
    if (!selectedBulkUserId || !role) {
      toast({ title: "No User Selected", description: "Please select a user to assign the books.", variant: "destructive" });
      return;
    }

    selection.forEach(bookId => {
      const book = allDisplayItems.find(b => b.id === bookId) as EnrichedBook;
      if (book) {
        handleAssignUser(book.id, selectedBulkUserId, role);
      }
    });

    closeBulkAssignmentDialog();
    setSelection([]);
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
    console.log(`[handleActionClick] Clicked for book: "${book.name}" in stage: "${stage}"`);

    if (['to-scan', 'to-indexing', 'to-checking'].includes(stage)) {
        if (!canViewAll && config.assigneeRole) {
            console.log(`[handleActionClick] User is not admin. Checking for open tasks...`);
            const role = config.assigneeRole;
            const statusMap = { scanner: 'Scanning Started', indexer: 'Indexing Started', qc: 'Checking Started' };
            const endTimeMap = { scanner: 'scanEndTime', indexer: 'indexingEndTime', qc: 'qcEndTime' };
            const userIdMap = { scanner: 'scannerUserId', indexer: 'indexerUserId', qc: 'qcUserId' };

            const startedStatus = statusMap[role];
            const endTimeField = endTimeMap[role] as keyof EnrichedBook;
            const userIdField = userIdMap[role] as keyof EnrichedBook;
            
            console.log(`[handleActionClick] Checking params: role=${role}, startedStatus=${startedStatus}, endTimeField=${endTimeField}, userIdField=${userIdField}`);

            const openTasks = books.filter(b => {
                return b.status === startedStatus &&
                       b[userIdField] === currentUser?.id &&
                       !b[endTimeField];
            });

            console.log(`[handleActionClick] Found ${openTasks.length} open tasks.`);
            if (openTasks.length > 0) {
              console.log('[handleActionClick] Open tasks are:', JSON.stringify(openTasks.map(t => ({id: t.id, name: t.name, status: t.status, end: t[endTimeField]}))));
            }

            if (openTasks.length > 0) {
                setPendingTasksState({ open: true, tasks: openTasks, bookToStart: book, role: role });
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
                else if (stage === 'to-indexing') handleStartTask(book.id, 'indexing');
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
            const userPermissions = currentUser ? permissions[currentUser.role] || [] : [];
            const canViewAll = userPermissions.includes('/workflow/view-all') || userPermissions.includes('*');
            const canScan = userPermissions.includes('/workflow/to-scan') || canViewAll;

            if (canViewAll) {
                openAssignmentDialog(book, 'scanner');
            } else if (canScan) {
                handleAssignUser(book.id, currentUser!.id, 'scanner');
            } else {
                openAssignmentDialog(book, 'scanner');
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
         openConfirmationDialog({
            title: `Confirm: Start Processing?`,
            description: `This will begin automated processing for "${book.name}".`,
            onConfirm: () => handleStartProcessing(book.id)
        });
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

const handleMainAction = (book: EnrichedBook) => {
  if (!book.projectId) {
      toast({ title: "Error", description: "Project ID not found for this book.", variant: "destructive" });
      return;
  }
  
  const workflow = projectWorkflows[book.projectId] || [];
  const currentStageKey = findStageKeyFromStatus(book.status);
  if (!currentStageKey) {
      toast({ title: "Workflow Error", description: `Cannot find a workflow stage for status: "${book.status}"`, variant: "destructive" });
      return;
  }
  
  const nextStage = getNextEnabledStage(currentStageKey, workflow);
  
  if (!nextStage) {
    handleMoveBookToNextStage(book.id, book.status);
    return;
  }
  
  const nextStageConfig = STAGE_CONFIG[nextStage];

  if (nextStageConfig?.assigneeRole) {
    openAssignmentDialog(book, nextStageConfig.assigneeRole);
  } else {
     handleMoveBookToNextStage(book.id, book.status);
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
        return `Assign for ${nextStageConfig.title}`;
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

  const handleBulkAction = () => {
    if (selection.length === 0) return;
    const firstBook = allDisplayItems.find(item => item.id === selection[0]) as EnrichedBook;
    if (!firstBook) return;

    const actionType = determineNextActionType(firstBook);

    if (actionType === 'ASSIGN') {
        const role = STAGE_CONFIG[getNextEnabledStage(findStageKeyFromStatus(firstBook.status)!, projectWorkflows[firstBook.projectId] || [])!]?.assigneeRole;
        if(role) openBulkAssignmentDialog(role);
    } else if (actionType === 'FOLDER_SELECT') {
        toast({ title: "Bulk Action Not Supported", description: "This action must be performed individually for each book.", variant: "destructive" });
    } else {
        const actionLabel = getDynamicActionButtonLabel(firstBook);
        openConfirmationDialog({
            title: `Perform action on ${selection.length} books?`,
            description: `This will perform "${actionLabel}" for all selected books.`,
            onConfirm: () => {
                selection.forEach(bookId => {
                    const book = allDisplayItems.find(b => b.id === bookId) as EnrichedBook;
                    if (book) handleMainAction(book);
                });
                setSelection([]);
            }
        });
    }
  };
  
  const handleBulkResubmit = (targetStage: string) => {
    const stageKey = findStageKeyFromStatus(targetStage);
    if (!stageKey) {
      toast({ title: "Workflow Error", description: `Could not find configuration for stage: ${targetStage}`, variant: "destructive" });
      return;
    }
    const stageConfig = STAGE_CONFIG[stageKey];
    openConfirmationDialog({
      title: `Resubmit ${selection.length} books?`,
      description: `This will resubmit all selected books to the "${stageConfig.title}" stage.`,
      onConfirm: () => {
        selection.forEach(bookId => handleResubmit(bookId, targetStage));
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
          return isScanningEnabled
              ? { label: 'Assign Scanner', icon: UserPlus, disabled: false }
              : { label: 'Send to Storage', icon: FolderSync, disabled: false };
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

    return (
        <TableRow key={item.id} data-state={selection.includes(item.id) && "selected"}>
        <TableCell>
            <Checkbox
                checked={selection.includes(item.id)}
                onCheckedChange={(checked) => setSelection(
                    checked ? [...selection, item.id] : selection.filter((id) => id !== item.id)
                )}
                aria-label={`Select row ${index + 1}`}
            />
        </TableCell>
        <TableCell className="font-medium">
            <Link href={`/books/${item.id}`} className="hover:underline">{item.name}</Link>
        </TableCell>
        <TableCell>{item.projectName}</TableCell>
        <TableCell className="hidden md:table-cell">{item.clientName}</TableCell>
        {canViewAll && config.assigneeRole && (
          <TableCell>{item.assigneeName}</TableCell>
        )}
        <TableCell>
            <Badge variant={getBadgeVariant(item.status)}>{item.status}</Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center justify-end gap-2">
            {isCancelable && hasEndTime ? (
              <Badge variant="default" className="bg-green-600 hover:bg-green-600/90">
                <Check className="mr-2 h-4 w-4" />
                Task Completed
              </Badge>
            ) : isCancelable ? (
              <Button size="sm" variant="secondary" onClick={() => handleCompleteTask(item.id, item.status)}>
                <Check className="mr-2 h-4 w-4" />
                Complete Task
              </Button>
            ) : null}

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
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => setDetailsState({ open: true, book: item })}>
                        <Info className="mr-2 h-4 w-4" />
                        Details
                    </DropdownMenuItem>
                    {isCancelable && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => openConfirmationDialog({
                                title: `Cancel task for "${item.name}"?`,
                                description: "This will return the book to the previous step.",
                                onConfirm: () => handleCancelTask(item.id, item.status)
                            })} className="text-destructive">
                            <Undo2 className="mr-2 h-4 w-4" />
                            Cancel Task
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
                aria-label={`Select row ${index + 1}`}
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
                title: `Are you sure?`,
                description: `This will move the book for "${item.name}" to the next stage.`,
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
    handleClientAction(currentBook.id, 'reject', rejectionComment);
    setRejectionComment("");
    setCurrentBook(null);
  }

  const openTaggingDialog = (doc: AppDocument) => {
    const book = Object.values(groupedByBook).map(g => g.book).find(b => b.id === doc.bookId);
    if (!book) return;
    
    // Always load tags based on the book's client.
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
    } else if (stage === 'corrected') {
      return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selection.length} selected</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Send className="mr-2 h-4 w-4" /> Resubmit Selected To...
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleBulkResubmit('To Indexing')}>Indexing</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkResubmit('To Checking')}>Quality Control</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkResubmit('Delivery')}>Delivery</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      );
    } else if (stage === 'client-rejections') {
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{selection.length} selected</span>
           <Button size="sm" onClick={() => openConfirmationDialog({
             title: `Mark ${selection.length} books as corrected?`,
             description: `This will move all selected books to the next stage.`,
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
                <Button size="sm" onClick={() => openBulkAssignmentDialog(role)}>
                  <UserPlus className="mr-2 h-4 w-4" /> Assign Selected
                </Button>
              </div>
            );
       } else {
          return (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{selection.length} selected</span>
              <Button size="sm" onClick={handleBulkAction}>
                <CheckCheck className="mr-2 h-4 w-4" /> Complete Selected
              </Button>
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

  return (
    <>
      <AlertDialog open={pendingTasksState.open} onOpenChange={(open) => !open && setPendingTasksState({ open: false, tasks: [], bookToStart: {} as EnrichedBook, role: 'scanner' })}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>You have tasks in progress</AlertDialogTitle>
                <AlertDialogDescription>
                    The following books are still marked as "{pendingTasksState.role} started". Do you want to mark them as complete before starting "{pendingTasksState.bookToStart.name}"?
                    <ul className="list-disc pl-5 mt-2">
                        {pendingTasksState.tasks.map(t => <li key={t.id}>{t.name}</li>)}
                    </ul>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => {
                  handleStartTask(pendingTasksState.bookToStart.id, pendingTasksState.role);
                  setPendingTasksState({ open: false, tasks: [], bookToStart: {} as EnrichedBook, role: 'scanner' });
                }}>No, Just Start New Task</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                    pendingTasksState.tasks.forEach(task => handleCompleteTask(task.id, task.status));
                    handleStartTask(pendingTasksState.bookToStart.id, pendingTasksState.role);
                    setPendingTasksState({ open: false, tasks: [], bookToStart: {} as EnrichedBook, role: 'scanner' });
                }}>
                    Yes, Complete Old & Start New
                </AlertDialogAction>
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
                        <UserPlus2 className="mr-2 h-4 w-4" /> Get Next Task
                      </Button>
                    )}
                    {renderBulkActions()}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="h-9 gap-1">
                                <Download className="h-3.5 w-3.5" />
                                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Export</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Export Selected ({selection.length})</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => exportXLSX(selectedItems)} disabled={selection.length === 0}>Export as XLSX</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => exportJSON(selectedItems)} disabled={selection.length === 0}>Export as JSON</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => exportCSV(selectedItems, Object.keys(selectedItems[0] || {}))} disabled={selection.length === 0}>Export as CSV</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Export All ({sortedAndFilteredItems.length})</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => exportXLSX(sortedAndFilteredItems)} disabled={sortedAndFilteredItems.length === 0}>Export as XLSX</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => exportJSON(sortedAndFilteredItems)} disabled={sortedAndFilteredItems.length === 0}>Export as JSON</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => exportCSV(sortedAndFilteredItems, Object.keys(sortedAndFilteredItems[0] || {}))} disabled={sortedAndFilteredItems.length === 0}>Export as CSV</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                {dataType === 'book' ? (
                  <>
                  <TableRow>
                      <TableHead className="w-[50px]">
                          <Checkbox
                              checked={displayItems.length > 0 && selection.length === displayItems.length}
                              onCheckedChange={(checked) => setSelection(checked ? displayItems.map(item => item.id) : [])}
                              aria-label="Select all"
                          />
                      </TableHead>
                      <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('name', e.shiftKey)}>Book Name {getSortIndicator('name')}</div></TableHead>
                      <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('projectName', e.shiftKey)}>Project {getSortIndicator('projectName')}</div></TableHead>
                      <TableHead className="hidden md:table-cell"><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('clientName', e.shiftKey)}>Client {getSortIndicator('clientName')}</div></TableHead>
                      {canViewAll && config.assigneeRole && (
                         <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('assigneeName', e.shiftKey)}>Assigned To {getSortIndicator('assigneeName')}</div></TableHead>
                      )}
                      <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('status', e.shiftKey)}>Status {getSortIndicator('status')}</div></TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead />
                    <TableHead>
                        <Input
                            placeholder="Filter by name..."
                            value={columnFilters['name'] || ''}
                            onChange={(e) => handleColumnFilterChange('name', e.target.value)}
                            className="h-8"
                        />
                    </TableHead>
                    <TableHead>
                        <Input
                            placeholder="Filter by project..."
                            value={columnFilters['projectName'] || ''}
                            onChange={(e) => handleColumnFilterChange('projectName', e.target.value)}
                            className="h-8"
                        />
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                        <Input
                            placeholder="Filter by client..."
                            value={columnFilters['clientName'] || ''}
                            onChange={(e) => handleColumnFilterChange('clientName', e.target.value)}
                            className="h-8"
                        />
                    </TableHead>
                     {canViewAll && config.assigneeRole && (
                       <TableHead>
                            <Input
                                placeholder="Filter by user..."
                                value={columnFilters['assigneeName'] || ''}
                                onChange={(e) => handleColumnFilterChange('assigneeName', e.target.value)}
                                className="h-8"
                            />
                       </TableHead>
                     )}
                    <TableHead>
                         <Input
                            placeholder="Filter by status..."
                            value={columnFilters['status'] || ''}
                            onChange={(e) => handleColumnFilterChange('status', e.target.value)}
                            className="h-8"
                        />
                    </TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" size="sm" onClick={handleClearFilters} disabled={Object.values(columnFilters).every(v => !v)}>Clear</Button>
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
                              aria-label="Select all"
                          />
                      </TableHead>
                    <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('name', e.shiftKey)}>Document Name {getSortIndicator('name')}</div></TableHead>
                    <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('client', e.shiftKey)}>Client {getSortIndicator('client')}</div></TableHead>
                    <TableHead className="hidden md:table-cell"><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('type', e.shiftKey)}>Type {getSortIndicator('type')}</div></TableHead>
                    <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('status', e.shiftKey)}>Status {getSortIndicator('status')}</div></TableHead>
                    <TableHead className="hidden md:table-cell"><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('lastUpdated', e.shiftKey)}>Last Updated {getSortIndicator('lastUpdated')}</div></TableHead>
                    {(actionButtonLabel) && (
                      <TableHead>Actions</TableHead>
                    )}
                  </TableRow>
                  <TableRow>
                    <TableHead />
                    <TableHead><Input placeholder="Filter name..." value={columnFilters['name'] || ''} onChange={(e) => handleColumnFilterChange('name', e.target.value)} className="h-8"/></TableHead>
                    <TableHead><Input placeholder="Filter client..." value={columnFilters['client'] || ''} onChange={(e) => handleColumnFilterChange('client', e.target.value)} className="h-8"/></TableHead>
                    <TableHead className="hidden md:table-cell"><Input placeholder="Filter type..." value={columnFilters['type'] || ''} onChange={(e) => handleColumnFilterChange('type', e.target.value)} className="h-8"/></TableHead>
                    <TableHead><Input placeholder="Filter status..." value={columnFilters['status'] || ''} onChange={(e) => handleColumnFilterChange('status', e.target.value)} className="h-8"/></TableHead>
                    <TableHead className="hidden md:table-cell"><Input placeholder="Filter date..." value={columnFilters['lastUpdated'] || ''} onChange={(e) => handleColumnFilterChange('lastUpdated', e.target.value)} className="h-8"/></TableHead>
                    {(actionButtonLabel) && (<TableHead className="text-right"><Button variant="ghost" size="sm" onClick={handleClearFilters} disabled={Object.values(columnFilters).every(v => !v)}>Clear</Button></TableHead>)}
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
                {selection.length > 0 ? `${selection.length} of ${sortedAndFilteredItems.length} item(s) selected.` : `Showing ${displayItems.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-${(currentPage - 1) * ITEMS_PER_PAGE + displayItems.length} of ${sortedAndFilteredItems.length} items`}
            </div>
            <PaginationNav />
          </CardFooter>
        </Card>

        <AlertDialogContent>
          <AlertDialogHeader>
              <AlertDialogTitle>Reason for Rejection</AlertDialogTitle>
              <AlertDialogDescription>
                  Please provide a reason for rejecting the book "{currentBook?.name}". This will be sent to the internal team for correction.
              </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
              <Label htmlFor="rejection-comment">Comment</Label>
              <Textarea 
                  id="rejection-comment"
                  placeholder="e.g., Page 5 is blurry, please re-scan."
                  value={rejectionComment}
                  onChange={(e) => setRejectionComment(e.target.value)}
              />
          </div>
          <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRejectSubmit} disabled={!rejectionComment.trim()}>
                  Submit Rejection
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
          <DialogTitle>Confirm Scanning for "{scanState.book?.name}"</DialogTitle>
          <DialogDescription>
            Select the folder containing the scanned pages. The folder name must match the book name.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="folder-upload">Select Scanned Folder</Label>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline">
                    <label htmlFor="folder-upload" className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        Choose Directory
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
                  Folder name does not match book name. Expected: "{scanState.book?.name}".
              </p>
          )}
          {scanState.book && scanState.fileCount !== null && scanState.fileCount !== scanState.book.expectedDocuments && (
            <Alert variant="destructive">
              <FileWarning className="h-4 w-4" />
              <AlertTitle>File Count Mismatch</AlertTitle>
              <AlertDescription>
                Found {scanState.fileCount} .tif files, but expected {scanState.book.expectedDocuments}.
                Proceeding will only generate {scanState.fileCount} pages.
              </AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeScanningDialog}>Cancel</Button>
          <Button onClick={stage === 'already-received' ? handleConfirmScanBypass : handleConfirmScan} disabled={!isScanFolderMatch || scanState.fileCount === 0}>
            Confirm Scan
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
          <Select value={assignState.selectedUserId} onValueChange={(val) => setAssignState(s => ({...s, selectedUserId: val}))}>
            <SelectTrigger>
              <SelectValue placeholder={`Select an ${assignState.role}...`} />
            </SelectTrigger>
            <SelectContent>
              {assignState.projectId && assignState.role && 
                getAssignableUsers(assignState.role, assignState.projectId).map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeAssignmentDialog}>Cancel</Button>
          <Button onClick={handleConfirmAssignment} disabled={!assignState.selectedUserId}>
            Assign and Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    <Dialog open={bulkAssignState.open} onOpenChange={closeBulkAssignmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{bulkAssignState.role ? assignmentConfig[bulkAssignState.role].title : 'Assign User'} for {selection.length} Books</DialogTitle>
            <DialogDescription>
                Select a user to process all selected books. They will be added to their personal queue.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={bulkAssignState.selectedUserId} onValueChange={(val) => setBulkAssignState(s => ({...s, selectedUserId: val}))}>
              <SelectTrigger>
                <SelectValue placeholder={`Select an ${bulkAssignState.role}...`} />
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
            <Button onClick={handleConfirmBulkAssignment} disabled={!bulkAssignState.selectedUserId}>
              Assign and Confirm
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
            <DialogTitle>Book Details</DialogTitle>
            <DialogDescription>{detailsState.book?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm">
            <DetailItem label="Project" value={<Link href={`/projects/${detailsState.book?.projectId}`} className="text-primary hover:underline">{detailsState.book?.projectName}</Link>} />
            <DetailItem label="Client" value={detailsState.book?.clientName} />
            <DetailItem label="Status" value={<Badge variant="outline">{detailsState.book?.status}</Badge>} />
            <Separator />
            <DetailItem label="Author" value={detailsState.book?.author || '—'} />
            <DetailItem label="ISBN" value={detailsState.book?.isbn || '—'} />
            <DetailItem label="Publication Year" value={detailsState.book?.publicationYear || '—'} />
            <Separator />
            <DetailItem label="Priority" value={detailsState.book?.priority || '—'} />
            <DetailItem label="Expected Pages" value={detailsState.book?.expectedDocuments} />
            <DetailItem label="Scanned Pages" value={detailsState.book?.documentCount} />
          </div>
           <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setDetailsState({ open: false, book: undefined })}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    
    <Dialog open={pullTaskState.open} onOpenChange={(open) => !open && setPullTaskState({ open: false, stage: '', role: null })}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Get Next Task and Assign</DialogTitle>
          <DialogDescription>
            Find the next available book from the previous stage and assign it to a user.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Label htmlFor="user-select">Assign To</Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger id="user-select">
              <SelectValue placeholder={`Select a user...`} />
            </SelectTrigger>
            <SelectContent>
              {pullTaskState.role && getAssignableUsers(pullTaskState.role).map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setPullTaskState({ open: false, stage: '', role: null })}>Cancel</Button>
          <Button onClick={() => {
            handlePullNextTask(pullTaskState.stage, selectedUserId);
            setPullTaskState({ open: false, stage: '', role: null });
            setSelectedUserId('');
          }} disabled={!selectedUserId}>
            Assign Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
