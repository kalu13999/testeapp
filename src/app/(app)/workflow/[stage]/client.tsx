
"use client"

import * as React from "react";
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
import { ThumbsDown, ThumbsUp, Undo2, Check, ScanLine, FileText, FileJson, Play, Send, FolderSync, Upload, XCircle, CheckCircle, FileWarning, PlayCircle, UserPlus, Info, MoreHorizontal, Download, ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/workflow-context";
import { EnrichedBook, AppDocument, User } from "@/context/workflow-context";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { STAGE_CONFIG, findStageKeyFromStatus } from "@/lib/workflow-config";

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
    UserPlus
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


export default function WorkflowClient({ config, stage }: WorkflowClientProps) {
  const { 
    books, documents, handleBookAction, handleMoveBookToNextStage, 
    updateDocumentStatus, currentUser, users, permissions,
    handleStartTask, handleAssignUser, handleStartProcessing, handleCancelTask,
    selectedProjectId, projectWorkflows, handleConfirmReception, getNextEnabledStage,
    handleSendToStorage
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
  const [detailsState, setDetailsState] = React.useState<{ open: boolean; book?: EnrichedBook }>({ open: false });
  const [currentPage, setCurrentPage] = React.useState(1);
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({});
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([
    { id: 'name', desc: false }
  ]);
  
  const userPermissions = currentUser ? permissions[currentUser.role] || [] : [];
  const canViewAll = userPermissions.includes('/workflow/view-all') || userPermissions.includes('*');

  const allDisplayItems = React.useMemo(() => {
    let items: (EnrichedBook | AppDocument)[];
    
    // Base filtering by stage status
    if (dataType === 'book' && dataStatus) {
      items = books.filter(book => book.status === dataStatus);
    } else if (dataType === 'document' && dataStage) {
      items = documents.filter(doc => doc.status === dataStage);
    } else {
      items = [];
    }

    const isSharedQueue = dataStatus === 'Received';

    // Filter by assignee if the user does NOT have permission to view all
    if (currentUser && config.assigneeRole && dataType === 'book' && !canViewAll) {
        if (isSharedQueue) {
            // In shared queue, non-privileged users see their own books and unassigned books
            items = (items as EnrichedBook[]).filter(book => {
                const assigneeId = book[(config.assigneeRole as AssignmentRole) + 'UserId'];
                return assigneeId === currentUser.id || !assigneeId;
            });
        } else {
            // In personal queues, they only see their own
            items = (items as EnrichedBook[]).filter(book => book[(config.assigneeRole as AssignmentRole) + 'UserId'] === currentUser.id);
        }
    }

    // Add assigneeName for display purposes
    if (dataType === 'book' && config.assigneeRole) {
      return (items as EnrichedBook[]).map(book => {
        let assigneeName = '—';
        const role = config.assigneeRole as keyof typeof book;
        const userId = book[`${role}UserId` as keyof EnrichedBook] as string | undefined;

        if (userId) {
          const user = users.find(u => u.id === userId);
          assigneeName = user?.name || 'Unknown';
        } else if (isSharedQueue) {
          assigneeName = 'Unassigned';
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
          const itemValue = item[columnId as keyof typeof item] as any;
          return String(itemValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    if (sorting.length > 0) {
        filtered.sort((a, b) => {
            for (const s of sorting) {
                const key = s.id as keyof (EnrichedBook | AppDocument);
                const valA = a[key as keyof typeof a];
                const valB = b[key as keyof typeof b];
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

  // --- EXPORT LOGIC ---
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
      handleBookAction(scanState.book.id, { actualPageCount: scanState.fileCount ?? 0 });
      closeScanningDialog();
    }
  };

  const closeScanningDialog = () => {
    setScanState({ open: false, book: null, folderName: null, fileCount: null });
  }
  
  const getAssignableUsers = (role: AssignmentRole, projectId: string) => {
      const requiredPermission = assignmentConfig[role].permission;
      return users.filter(user => {
        if (user.role === 'Admin') return false; // Exclude admins
        const userPermissions = permissions[user.role] || [];
        const hasPermission = userPermissions.includes('*') || userPermissions.includes(requiredPermission);
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
    setSelectedUserId("");
  };

  const handleConfirmBulkAssignment = () => {
    const role = bulkAssignState.role;
    if (!selectedUserId || !role) {
      toast({ title: "No User Selected", description: "Please select a user to assign the books.", variant: "destructive" });
      return;
    }

    selection.forEach(bookId => {
      const book = allDisplayItems.find(b => b.id === bookId) as EnrichedBook;
      if (book) {
        handleAssignUser(book.id, selectedUserId, role);
      }
    });

    closeBulkAssignmentDialog();
    setSelection([]);
  };

  const handleBulkCancel = () => {
    selection.forEach(id => {
        const item = allDisplayItems.find(d => d.id === id) as EnrichedBook;
        if (item) {
            handleCancelTask(item.id, item.status);
        }
    });
    setSelection([]);
  };

  const isScanFolderMatch = scanState.book?.name === scanState.folderName;

  const tableColSpan = React.useMemo(() => {
    let count = 6;
    if (config.assigneeRole && canViewAll) count++;
    return count;
  }, [dataType, stage, config.assigneeRole, canViewAll]);
    
  const handleActionClick = (book: EnrichedBook) => {
      if (stage === 'confirm-reception') {
          handleConfirmReception(book.id);
          return;
      }
      
      if (stage === 'assign-scanner') {
        const projectWorkflow = projectWorkflows[book.projectId] || [];
        const isScanningEnabled = projectWorkflow.includes('to-scan');
        if (isScanningEnabled) {
          openAssignmentDialog(book, 'scanner');
        } else {
          setScanState({ open: true, book, folderName: null, fileCount: null });
        }
        return;
      }

      if (['to-scan', 'to-indexing', 'to-checking'].includes(stage)) {
          openConfirmationDialog({
              title: `Confirm: ${actionButtonLabel}?`,
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
  };
    
  const renderBookRow = (item: any, index: number) => {
    const isCancelable = ['Scanning Started', 'Indexing Started', 'Checking Started'].includes(item.status);

    const getDynamicActionButton = (book: EnrichedBook) => {
        if (stage === 'confirm-reception') {
            return {
                label: 'Confirm Arrival',
                icon: Check,
                action: () => handleConfirmReception(book.id),
                disabled: false
            };
        }

        if (stage === 'assign-scanner') {
            const projectWorkflow = projectWorkflows[book.projectId!] || [];
            const isScanningEnabled = projectWorkflow.includes('to-scan');
            if (isScanningEnabled) {
                return {
                    label: 'Assign Scanner',
                    icon: UserPlus,
                    action: () => openAssignmentDialog(book, 'scanner'),
                    disabled: false
                };
            } else {
                return {
                    label: 'Send to Storage',
                    icon: FolderSync,
                    action: () => setScanState({ open: true, book, folderName: null, fileCount: null }),
                    disabled: false
                };
            }
        }
        
        if (actionButtonLabel) {
            return {
                label: actionButtonLabel,
                icon: ActionIcon,
                action: () => handleActionClick(book),
                disabled: false
            };
        }
        
        return null;
    }

    const currentAction = getDynamicActionButton(item);
    const CurrentActionIcon = currentAction?.icon;

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
            {currentAction && (
              <Button size="sm" onClick={currentAction.action} disabled={currentAction.disabled}>
                  {CurrentActionIcon && <CurrentActionIcon className="mr-2 h-4 w-4" />}
                  {currentAction.label}
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
                {selection.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{selection.length} of {sortedAndFilteredItems.length} selected</span>
                        {['Scanning Started', 'Indexing Started', 'Checking Started'].includes(stage) && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openConfirmationDialog({
                                    title: `Cancel ${selection.length} selected tasks?`,
                                    description: "This will revert all selected books to their previous step.",
                                    onConfirm: () => handleBulkCancel()
                                })}
                            >
                                <Undo2 className="mr-2 h-4 w-4" />
                                Cancel Selected
                            </Button>
                        )}
                        {actionButtonLabel && (
                        <Button size="sm" onClick={() => openConfirmationDialog({
                            title: `Are you sure?`,
                            description: `This will perform the action "${actionButtonLabel}" on ${selection.length} selected items.`,
                            onConfirm: () => {}
                        })}>
                            {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
                            {actionButtonLabel} Selected
                        </Button>
                        )}
                    </div>
                )}
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
                <Input id="folder-upload" type="file" onChange={handleDirectorySelect} webkitdirectory="true" directory="true" className="hidden" accept=".tif" />
                <Button asChild variant="outline">
                    <label htmlFor="folder-upload" className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        Choose Directory
                    </label>
                </Button>
                {scanState.folderName && (
                    <div className="flex items-center gap-2 text-sm font-medium">
                        {isScanFolderMatch ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
                        <span>{scanState.folderName}</span>
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
          <Button onClick={stage === 'assign-scanner' ? handleConfirmScanBypass : handleConfirmScan} disabled={!isScanFolderMatch}>
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
            <DialogDescription>{assignmentConfig[bulkAssignState.role].description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder={`Select a ${bulkAssignState.role}...`} />
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
            <Button onClick={handleConfirmBulkAssignment} disabled={!selectedUserId}>
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
               <div className="grid grid-cols-1 gap-2">
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
