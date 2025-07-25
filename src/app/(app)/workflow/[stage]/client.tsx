

"use client"

import * as React from "react"
import * as XLSX from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ThumbsDown, ThumbsUp, Undo2, Check, ScanLine, FileText, FileJson, Play, Send, FolderSync, PlayCircle, UserPlus, CheckCheck, Archive, MoreHorizontal, Info, Download, ArrowUp, ArrowDown, ChevronsUpDown, Loader2, XCircle, FileWarning, ShieldAlert, AlertTriangle, Tag, Replace, FilePlus2, BookOpen, MessageSquareWarning, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/workflow-context";
import { type AppDocument, type RejectionTag } from "@/context/workflow-context";
import type { EnrichedBook, User } from "@/lib/data";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { STAGE_CONFIG, findStageKeyFromStatus } from "@/lib/workflow-config";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const ITEMS_PER_PAGE = 10;

const iconMap: { [key: string]: LucideIcon } = {
    Check,
    ScanLine,
    FileText,
    FileJson,
    Play,
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

const SIMPLE_BULK_ACTION_STAGES = [
    'confirm-reception',
    'to-scan',
    'to-indexing',
    'to-checking',
    'ready-for-processing',
    'processed',
    'final-quality-control',
    'delivery',
];


export default function WorkflowClient({ config, stage }: WorkflowClientProps) {
  const { 
    books, documents, handleMoveBookToNextStage, 
    currentUser, users, permissions,
    handleStartTask, handleAssignUser, handleStartProcessing, handleCancelTask,
    selectedProjectId, projectWorkflows, handleConfirmReception, getNextEnabledStage,
    handleSendToStorage, processingBookIds
  } = useAppContext();

  const { toast } = useToast();
  const { title, description, dataType, actionButtonLabel, actionButtonIcon, emptyStateText, dataStatus, dataStage } = config;
  const ActionIcon = actionButtonIcon ? iconMap[actionButtonIcon] : null;

  const [scanState, setScanState] = React.useState<{ open: boolean; book: EnrichedBook | null; folderName: string | null; fileCount: number | null; }>({ open: false, book: null, folderName: null, fileCount: null });
  const [selection, setSelection] = React.useState<string[]>([]);
  const [confirmationState, setConfirmationState] = React.useState({ open: false, title: '', description: '', onConfirm: () => {} });
  const [assignState, setAssignState] = React.useState<{ open: boolean; book: EnrichedBook | null; role: AssignmentRole | null }>({ open: false, book: null, role: null });
  const [bulkAssignState, setBulkAssignState] = React.useState<{ open: boolean; role: AssignmentRole | null }>({ open: false, role: null });
  const [selectedUserId, setSelectedUserId] = React.useState<string>("");
  const [selectedBulkUserId, setSelectedBulkUserId] = React.useState<string>("");
  const [detailsState, setDetailsState] = React.useState<{ open: boolean; book?: EnrichedBook }>({ open: false });
  const [currentPage, setCurrentPage] = React.useState(1);
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({});
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([
    { id: 'name', desc: false }
  ]);
  
  const userPermissions = currentUser ? permissions[currentUser.role] || [] : [];
  const canViewAll = userPermissions.includes('/workflow/view-all') || userPermissions.includes('*');

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
    
    if (dataType === 'book' && dataStatus) {
      items = books.filter(book => book.status === dataStatus);
    } else if (dataType === 'document' && dataStage) {
      items = documents.filter(doc => doc.status === dataStage);
    } else {
      items = [];
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
                if (newSorting[existingSortIndex].desc) { newSorting.splice(existingSortIndex, 1); } 
                else { newSorting[existingSortIndex].desc = true; }
            } else {
                newSorting.push({ id: columnId, desc: false });
            }
            return newSorting;
        } else {
            if (currentSorting.length === 1 && currentSorting[0].id === columnId) {
                if (currentSorting[0].desc) { return []; }
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
    return <div className="flex items-center gap-1">{icon}{sorting.length > 1 && (<span className="text-xs font-bold text-muted-foreground">{sortIndex + 1}</span>)}</div>;
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
  };
  
  const closeAssignmentDialog = () => {
    setAssignState({ open: false, book: null, role: null });
    setSelectedUserId("");
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
    selection.forEach(id => {
        const item = allDisplayItems.find(d => d.id === id) as EnrichedBook;
        if (item) {
            handleCancelTask(item.id, item.status);
        }
    });
    setSelection([]);
  };

  const handleBulkComplete = () => {
    if (selection.length === 0) return;
    openConfirmationDialog({
      title: `Complete ${selection.length} tasks?`,
      description: "This will mark all selected books as complete and move them to the next stage.",
      onConfirm: () => {
        selection.forEach(bookId => {
          const book = allDisplayItems.find(b => b.id === bookId) as EnrichedBook;
          if (book) handleMoveBookToNextStage(book.id, book.status);
        });
        setSelection([]);
      }
    });
  };

  const handleBulkAction = () => {
    if (selection.length === 0) return;
    const firstSelected = allDisplayItems.find(item => item.id === selection[0]) as EnrichedBook;

    if (SIMPLE_BULK_ACTION_STAGES.includes(stage)) {
      const onConfirm = () => {
        selection.forEach(bookId => {
          const book = allDisplayItems.find(b => b.id === bookId) as EnrichedBook;
          if (book) {
            handleMoveBookToNextStage(book.id, book.status);
          }
        });
        setSelection([]);
      };

      openConfirmationDialog({
        title: `Perform action for ${selection.length} books?`,
        description: `This will move all selected books to the next step.`,
        onConfirm,
      });
    }
  };

  const handleActionClick = (book: EnrichedBook) => {
    if (stage === 'confirm-reception') {
      handleConfirmReception(book.id);
      return;
    }

    if (stage === 'already-received') {
      const projectWorkflow = projectWorkflows[book.projectId!] || [];
      const isScanningEnabled = projectWorkflow.includes('to-scan');
      if (isScanningEnabled) {
        openAssignmentDialog(book, 'scanner');
      } else {
        setScanState({ open: true, book, folderName: null, fileCount: null });
      }
      return;
    }
    
    if (['to-scan', 'to-indexing', 'to-checking'].includes(stage)) {
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

    if (stage === 'scanning-started') {
        setScanState({ open: true, book: book, folderName: null, fileCount: null });
        return;
    }
    
    if (['indexing-started', 'checking-started'].includes(stage)) {
        const onConfirm = () => {
            if (!book.projectId) return;
            const workflow = projectWorkflows[book.projectId] || [];
            const currentStageKey = findStageKeyFromStatus(book.status);
            if (!currentStageKey) return;
            
            const nextStageKey = getNextEnabledStage(currentStageKey, workflow);
            if (!nextStageKey) {
                toast({ title: "Workflow End", description: "This is the last configured step for this project." });
                handleMoveBookToNextStage(book.id, book.status);
                return;
            }

            const nextStageConfig = STAGE_CONFIG[nextStageKey];
            if (nextStageConfig.assigneeRole) {
                openAssignmentDialog(book, nextStageConfig.assigneeRole);
            } else {
                handleMoveBookToNextStage(book.id, book.status);
            }
        };

        openConfirmationDialog({
            title: `Confirm: Mark as Complete?`,
            description: `This will complete the task for "${book.name}" and move it to the next step.`,
            onConfirm: onConfirm
        });
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
          onConfirm: () => handleMoveBookToNextStage(book.id, book.status)
      });
    }
};

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
      
      if (actionButtonLabel && actionButtonIcon) {
          const Icon = iconMap[actionButtonIcon];
          return { label: actionButtonLabel, icon: Icon, disabled: false };
      }
      
      return null;
  }
    
  const renderBookRow = (item: any, index: number) => {
    const actionDetails = getDynamicActionButton(item);
    const isProcessing = processingBookIds.includes(item.id);

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
            {actionDetails && (
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

  const isScanFolderMatch = scanState.book?.name === scanState.folderName;

  const tableColSpan = React.useMemo(() => {
    let count = 6;
    if (config.assigneeRole && canViewAll) count++;
    return count;
  }, [dataType, stage, config.assigneeRole, canViewAll]);

  const renderBulkActions = () => {
    if (selection.length === 0) return null;

    if (isCancelable) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selection.length} selected</span>
                <Button variant="destructive" size="sm" onClick={handleBulkCancel}>
                    <Undo2 className="mr-2 h-4 w-4" /> Cancel Selected
                </Button>
                 {['indexing-started', 'checking-started'].includes(stage) && (
                    <Button variant="default" size="sm" onClick={handleBulkComplete}>
                        <CheckCheck className="mr-2 h-4 w-4" /> Mark Selected as Complete
                    </Button>
                )}
            </div>
        );
    }
    
    const firstSelected = allDisplayItems.find(item => item.id === selection[0]) as EnrichedBook;
    if (!firstSelected || dataType !== 'book') return null;

    const actionDetails = getDynamicActionButton(firstSelected as EnrichedBook);
    if (!actionDetails) return null;

    const isDisabled = selection.some(bookId => {
        const book = allDisplayItems.find(item => item.id === bookId) as EnrichedBook;
        return processingBookIds.includes(bookId) || getDynamicActionButton(book)?.disabled;
    });

    if (SIMPLE_BULK_ACTION_STAGES.includes(stage)) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selection.length} selected</span>
                <Button size="sm" onClick={handleBulkAction} disabled={isDisabled}>
                    {actionDetails.icon && <actionDetails.icon className="mr-2 h-4 w-4" />}
                    {actionDetails.label} ({selection.length})
                </Button>
            </div>
        );
    }
    
    return null;
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle className="font-headline">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
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
                        <DropdownMenuItem onSelect={() => exportCSV(selectedItems)} disabled={selection.length === 0}>Export as CSV</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Export All ({sortedAndFilteredItems.length})</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => exportXLSX(sortedAndFilteredItems)} disabled={sortedAndFilteredItems.length === 0}>Export as XLSX</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => exportJSON(sortedAndFilteredItems)} disabled={sortedAndFilteredItems.length === 0}>Export as JSON</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => exportCSV(sortedAndFilteredItems)} disabled={sortedAndFilteredItems.length === 0}>Export as CSV</DropdownMenuItem>
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
                <TableHead><Input placeholder="Filter by name..." value={columnFilters['name'] || ''} onChange={(e) => handleColumnFilterChange('name', e.target.value)} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filter by project..." value={columnFilters['projectName'] || ''} onChange={(e) => handleColumnFilterChange('projectName', e.target.value)} className="h-8"/></TableHead>
                <TableHead className="hidden md:table-cell"><Input placeholder="Filter by client..." value={columnFilters['clientName'] || ''} onChange={(e) => handleColumnFilterChange('clientName', e.target.value)} className="h-8"/></TableHead>
                 {canViewAll && config.assigneeRole && (
                   <TableHead><Input placeholder="Filter by user..." value={columnFilters['assigneeName'] || ''} onChange={(e) => handleColumnFilterChange('assigneeName', e.target.value)} className="h-8"/></TableHead>
                 )}
                <TableHead><Input placeholder="Filter by status..." value={columnFilters['status'] || ''} onChange={(e) => handleColumnFilterChange('status', e.target.value)} className="h-8"/></TableHead>
                <TableHead className="text-right"><Button variant="ghost" size="sm" onClick={handleClearFilters} disabled={Object.values(columnFilters).every(v => !v)}>Clear</Button></TableHead>
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

    {assignState.role && assignState.book && (
      <Dialog open={assignState.open} onOpenChange={closeAssignmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{assignmentConfig[assignState.role].title} for "{assignState.book?.name}"</DialogTitle>
            <DialogDescription>{assignmentConfig[assignState.role].description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder={`Select a ${assignState.role}...`} />
              </SelectTrigger>
              <SelectContent>
                {getAssignableUsers(assignState.role, assignState.book.projectId).map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAssignmentDialog}>Cancel</Button>
            <Button onClick={handleConfirmAssignment} disabled={!selectedUserId}>
              Assign and Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )}
    
    {bulkAssignState.role && (
      <Dialog open={bulkAssignState.open} onOpenChange={closeBulkAssignmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{assignmentConfig[bulkAssignState.role].title} for {selection.length} Books</DialogTitle>
            <DialogDescription>
                Select a user to process all selected books. They will be added to their personal queue.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={selectedBulkUserId} onValueChange={setSelectedBulkUserId}>
              <SelectTrigger>
                <SelectValue placeholder={`Select an ${bulkAssignState.role}...`} />
              </SelectTrigger>
              <SelectContent>
                 {getAssignableUsers(bulkAssignState.role, (allDisplayItems.find(item => item.id === selection[0]) as EnrichedBook)?.projectId).map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeBulkAssignmentDialog}>Cancel</Button>
            <Button onClick={handleConfirmBulkAssignment} disabled={!selectedBulkUserId}>
              Assign and Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )}

     <Dialog open={detailsState.open} onOpenChange={() => setDetailsState({ open: false, book: undefined })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book Details</DialogTitle>
            <DialogDescription>{detailsState.book?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm">
            <DetailItem label="Book" value={<Link href={`/books/${detailsState.book?.id}`} className="text-primary hover:underline">{detailsState.book?.name}</Link>} />
            <DetailItem label="Project" value={detailsState.book?.projectName} />
            <DetailItem label="Client" value={detailsState.book?.clientName} />
            <Separator />
            <DetailItem label="Author" value={detailsState.book?.author || '—'} />
            <DetailItem label="ISBN" value={detailsState.book?.isbn || '—'} />
            <DetailItem label="Publication Year" value={detailsState.book?.publicationYear || '—'} />
            <Separator />
            <DetailItem label="Priority" value={detailsState.book?.priority || '—'} />
            <DetailItem label="Expected Pages" value={detailsState.book?.expectedDocuments} />
            <DetailItem label="Scanned Pages" value={detailsState.book?.documentCount} />
            <Separator />
            {detailsState.book?.info && (
               <div className="pt-2 grid grid-cols-1 gap-2">
                <p className="text-muted-foreground">Additional Info</p>
                <p className="font-medium whitespace-pre-wrap">{detailsState.book.info}</p>
              </div>
            )}
          </div>
           <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setDetailsState({ open: false, book: undefined })}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
