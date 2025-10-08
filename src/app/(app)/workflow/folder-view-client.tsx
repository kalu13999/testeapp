

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
import { FolderSync, MessageSquareWarning, Trash2, Replace, FilePlus2, Info, BookOpen, X, Tag, ShieldAlert, AlertTriangle, Check, ScanLine, FileText, FileJson, PlayCircle, Send, UserPlus, CheckCheck, Archive, ThumbsUp, ThumbsDown, Undo2, MoreHorizontal, Loader2, MessageSquarePlus } from "lucide-react";
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


const ITEMS_PER_PAGE = 100;
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

interface FolderViewClientProps {
  stage: string;
  config: StageConfigItem; 
}

type BadgeVariant = "default" | "destructive" | "secondary" | "outline";
type AssignmentRole = 'scanner' | 'indexer' | 'qc';

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
    }};

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

export default function FolderViewClient({ stage, config }: FolderViewClientProps) {
  const { 
    documents, 
    books, 
    handleClientAction,
    handleMoveBookToNextStage,
    handleFinalize,
    handleMarkAsCorrected,
    handleResubmit,
    handleResubmitCopyTifs,
    handleResubmitMoveTifs,
    updateDocumentFlag,
    users,
    permissions,
    handleAssignUser,
    selectedProjectId,
    rejectionTags,
    currentUser,
    tagPageForRejection,
    getNextEnabledStage,
    projectWorkflows,
    processingBookIds,
    processingBatches, 
    processingBatchItems,
    storages,
    addBookObservation,
  } = useAppContext();
  const { toast } = useToast();
  const ActionIcon = config.actionButtonIcon ? iconMap[config.actionButtonIcon] : FolderSync;

  const [selection, setSelection] = React.useState<string[]>([]);
  const [rejectionComment, setRejectionComment] = React.useState("");
  const [currentBook, setCurrentBook] = React.useState<{id: string, name: string} | null>(null);

  const [flagDialogState, setFlagDialogState] = React.useState<{
    open: boolean;
    docId: string | null;
    docName: string | null;
    flag: AppDocument['flag'];
    comment: string;
  }>({ open: false, docId: null, docName: null, flag: null, comment: '' });
  
  const [confirmationState, setConfirmationState] = React.useState({ open: false, title: '', description: '', onConfirm: () => {} });
  
  const [assignmentState, setAssignmentState] = React.useState<{
    open: boolean;
    bookId: string | null;
    bookName: string | null;
    projectId: string | null;
    role: 'indexer' | 'qc' | 'scanner' | null;
    selectedUserId: string;
  }>({ open: false, bookId: null, bookName: null, projectId: null, role: null, selectedUserId: '' });

  const [bulkAssignState, setBulkAssignState] = React.useState<{ open: boolean; role: 'indexer' | 'qc' | 'scanner' | null, selectedUserId: string }>({ open: false, role: null, selectedUserId: '' });

  const [taggingState, setTaggingState] = React.useState<{
    open: boolean;
    docId: string | null;
    docName: string | null;
    selectedTags: string[];
    availableTags: RejectionTag[];
  }>({ open: false, docId: null, docName: null, selectedTags: [], availableTags: [] });
  
  const [columnStates, setColumnStates] = React.useState<{ [key: string]: { cols: number } }>({});
  const [selectedBatchId, setSelectedBatchId] = React.useState<string>('all');
  const [selectedStorageId, setSelectedStorageId] = React.useState<string>('all');

  const [newObservation, setNewObservation] = React.useState('');
  const [observationTarget, setObservationTarget] = React.useState<EnrichedBook | null>(null);

  const setBookColumns = (bookId: string, cols: number) => {
    setColumnStates(prev => ({ ...prev, [bookId]: { cols } }));
  };

  const [openAccordions, setOpenAccordions] = React.useState<string[]>([]);
  const storageKey = React.useMemo(() => `accordion_state_${stage}`, [stage]);


  const [currentPageByBook, setCurrentPageByBook] = React.useState<Record<string, number>>({});
  const itemsPerPage = 52;


  const [bookPage, setBookPage] = React.useState(1);
  const booksPerPage = 50;


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

  const handleAccordionChange = (value: string[]) => {
    setOpenAccordions(value);
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to save accordion state for ${stage} to localStorage`, error);
    }
  };

  const canViewAll = React.useMemo(() => {
    if (!currentUser) return false;
    const userPermissions = permissions[currentUser.role] || [];
    return userPermissions.includes('*') || userPermissions.includes('/client/view-all-validations');
  }, [currentUser, permissions]);
  
  const bookToBatchMap = React.useMemo(() => {
    const map = new Map<string, { id: string, timestampStr: string }>();
    processingBatchItems.forEach(item => {
        const batch = processingBatches.find(b => b.id === item.batchId);
        if (batch) {
            map.set(item.bookId, { id: batch.id, timestampStr: batch.timestampStr });
        }
    });
    return map;
  }, [processingBatchItems, processingBatches]);

  const groupedByBook = React.useMemo(() => {
    if (!config.dataStatus) return {};
    let booksInStage = books.filter(book => book.status === config.dataStatus);

    if (selectedProjectId) {
      booksInStage = booksInStage.filter(book => book.projectId === selectedProjectId);
    }
    
    if (currentUser?.role === 'Client' && currentUser.clientId) {
      booksInStage = booksInStage.filter(b => b.clientId === currentUser.clientId);
    }
    
    if (stage === 'final-quality-control' && selectedBatchId !== 'all') {
      booksInStage = booksInStage.filter(book => bookToBatchMap.get(book.id)?.id === selectedBatchId);
    }
    
    if (stage === 'storage' && selectedStorageId !== 'all') {
      const selectedStorageName = storages.find(s => s.id.toString() === selectedStorageId)?.nome;
      if (selectedStorageName) {
        booksInStage = booksInStage.filter(book => book.storageName === selectedStorageName);
      }
    }
    
    return booksInStage.reduce<GroupedDocuments>((acc, book) => {
        const pages = documents.filter(doc => doc.bookId === book.id);
        acc[book.id] = {
            book,
            pages,
            hasError: pages.some(p => p.flag === 'error'),
            hasWarning: pages.some(p => p.flag === 'warning'),
            batchInfo: bookToBatchMap.get(book.id)
        };
        return acc;
    }, {});
  }, [books, documents, config.dataStatus, selectedProjectId, currentUser, bookToBatchMap, selectedBatchId, stage, selectedStorageId, storages]);
  



  const availableBatches = React.useMemo(() => {
    if (stage !== 'final-quality-control') return [];
    
    const batchIdToBooks = new Map<string, { timestamp: string, books: string[] }>();
    books
      .filter(book => book.status === config.dataStatus)
      .forEach(book => {
        const batchInfo = bookToBatchMap.get(book.id);
        if (batchInfo) {
          if (!batchIdToBooks.has(batchInfo.id)) {
            batchIdToBooks.set(batchInfo.id, { timestamp: batchInfo.timestampStr, books: [] });
          }
          batchIdToBooks.get(batchInfo.id)!.books.push(book.name);
        }
    });
    return Array.from(batchIdToBooks.entries()).map(([id, data]) => ({ id, ...data }));
  }, [books, config.dataStatus, bookToBatchMap, stage]);
  

  const bookGroups = Object.values(groupedByBook);
  const totalBookPages = Math.ceil(bookGroups.length / booksPerPage);

  const paginatedBookGroups = bookGroups.slice(
    (bookPage - 1) * booksPerPage,
    bookPage * booksPerPage
  );

  const allVisibleBookIds = paginatedBookGroups.map(bg => bg.book.id);
  const allVisibleSelected = allVisibleBookIds.every(id => selection.includes(id));
  const someVisibleSelected = allVisibleBookIds.some(id => selection.includes(id));


  React.useEffect(() => {
    setSelection([]);
  }, [selectedProjectId, selectedBatchId, selectedStorageId]);

  const handleRejectSubmit = () => {
    if (!currentBook) return;
    handleClientAction(currentBook.id, 'reject', rejectionComment);
    setRejectionComment("");
    setCurrentBook(null);
  }

  const openConfirmationDialog = ({ title, description, onConfirm}: Omit<typeof confirmationState, 'open'>) => {
    setConfirmationState({ open: true, title, description, onConfirm });
  }
  
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

  const openAssignmentDialog = (bookId: string, bookName: string, projectId: string, role: 'indexer' | 'qc' | 'scanner') => {
    setAssignmentState({ open: true, bookId, bookName, projectId, role, selectedUserId: '' });
  };
  
  const closeAssignmentDialog = () => {
    setAssignmentState({ open: false, bookId: null, bookName: null, projectId: null, role: null, selectedUserId: '' });
  };
  
  const handleAssignmentSubmit = () => {
    if (assignmentState.bookId && assignmentState.selectedUserId && assignmentState.role) {
      handleAssignUser(assignmentState.bookId, assignmentState.selectedUserId, assignmentState.role);
      closeAssignmentDialog();
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

  const assignmentConfig: { [key in 'indexer' | 'qc' | 'scanner']: { permission: string } } = {
    indexer: { permission: '/workflow/to-indexing' },
    qc: { permission: '/workflow/to-checking' },
    scanner: { permission: '/workflow/to-scan' }
  };

  const getAssignableUsers = (role: 'indexer' | 'qc' | 'scanner', projectId?: string) => {
      const requiredPermission = assignmentConfig[role].permission;
      return users.filter(user => {
        if (user.role === 'Admin') return false; 
        const userPermissions = permissions[user.role] || [];
        const hasPermission = userPermissions.includes('*') || userPermissions.includes(requiredPermission);
        if (!projectId) return hasPermission; // For bulk assignment before knowing project
        const hasProjectAccess = !user.projectIds || user.projectIds.length === 0 || user.projectIds.includes(projectId);
        return hasPermission && hasProjectAccess;
      });
  }
  
  const handleMainAction = (book: EnrichedBook) => {
    if (!book.projectId) {
        toast({ title: "Erro", description: "ID do projeto não encontrado para este livro.", variant: "destructive" });
        return;
    }
    
    const workflow = projectWorkflows[book.projectId] || [];
    const currentStageKey = findStageKeyFromStatus(book.status);
    if (!currentStageKey) {
        toast({ title: "Erro de Workflow", description: `Não foi possível encontrar a etapa de workflow para o status: "${book.status}"`, variant: "destructive" });
        return;
    }
    
    const nextStage = getNextEnabledStage(currentStageKey, workflow);
    
    if (!nextStage) {
      toast({ title: "Fim de Workflow", description: "Esta é a última etapa para este projeto.", variant: "default" });
      //handleMoveBookToNextStage(book.id, book.status);
      return;
    }
    
    const nextStageConfig = STAGE_CONFIG[nextStage];

    if (nextStageConfig?.assigneeRole) {
      openAssignmentDialog(book.id, book.name, book.projectId, nextStageConfig.assigneeRole);
    } else {
       handleMoveBookToNextStage(book.id, book.status);
    }
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

  const getDynamicActionButtonLabel = React.useCallback((book: EnrichedBook) => {
    if (stage === 'storage') {
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
    }

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
  }, [stage, config.actionButtonLabel, projectWorkflows, getNextEnabledStage]);

  const handleBulkAction = () => {
    if (selection.length === 0) return;
    const firstBook = Object.values(groupedByBook).find(g => g.book.id === selection[0])?.book;
    if (!firstBook) return;

    if(stage === 'storage') {
      const nextStageKey = getNextEnabledStage('storage', projectWorkflows[firstBook.projectId] || []);
      if (nextStageKey && STAGE_CONFIG[nextStageKey]?.assigneeRole) {
        openBulkAssignmentDialog(STAGE_CONFIG[nextStageKey].assigneeRole!);
        return;
      }
    }
    
    const actionLabel = getDynamicActionButtonLabel(firstBook);
    openConfirmationDialog({
      title: `Perform action on ${selection.length} books?`,
      description: `This will perform "${actionLabel}" for all selected books.`,
      onConfirm: () => {
        selection.forEach(bookId => {
          const book = groupedByBook[bookId]?.book;
          if (book) handleMainAction(book);
        });
        setSelection([]);
      }
    });
  };

  const handlePageChange = (bookId: string, newPage: number) => {
  setCurrentPageByBook(prev => ({
    ...prev,
    [bookId]: newPage
    }));
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
  
  const renderBulkActions = () => {
    if (selection.length === 0) return null;
    
    /*if (stage === 'pending-deliveries') {
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
    } else if (config.actionButtonLabel && stage !== 'archive') {
      const firstBook = Object.values(groupedByBook).find(g => g.book.id === selection[0])?.book;
      if (!firstBook) return null;
      const actionLabel = getDynamicActionButtonLabel(firstBook);
      const isDisabled = selection.some(bookId => groupedByBook[bookId]?.hasError || actionLabel === "End of Workflow");
      
      if(stage === 'storage') {
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selection.length} selected</span>
            {canViewAll && (
              <Button size="sm" onClick={handleBulkAction} disabled={isDisabled}>
                {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
                {actionLabel} ({selection.length})
              </Button>
            )}
          </div>
        );
      }

      return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selection.length} selected</span>
            <Button size="sm" onClick={handleBulkAction} disabled={isDisabled}>
                {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
                {actionLabel} ({selection.length})
            </Button>
        </div>
      );
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

  const renderActions = (bookGroup: GroupedDocuments[string]) => {
    const { book, hasError } = bookGroup;
    const { id: bookId, name: bookName } = book;
    const isProcessing = processingBookIds.includes(bookId);

    if (isProcessing) {
      return (
        <Button size="sm" disabled>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
        </Button>
      );
    }

    if (stage === 'storage') {
        const actionLabel = getDynamicActionButtonLabel(book);
        return (canViewAll && (
            <Button size="sm" onClick={() => handleMainAction(book)}>
                <ActionIcon className="mr-2 h-4 w-4" />
                {actionLabel}
            </Button>)
        );
    }

    switch (stage) {
      /*
      case 'pending-deliveries':
        return (
          <div className="flex gap-2">
            <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" onClick={() => setCurrentBook({id: bookId, name: bookName})}>
                  <ThumbsDown className="mr-2 h-4 w-4" /> Reject
                </Button>
            </AlertDialogTrigger>
            <Button size="sm" onClick={() => openConfirmationDialog({
                title: 'Approve Book?',
                description: `This will approve all documents for "${bookName}" and finalize them.`,
                onConfirm: () => handleClientAction(bookId, 'approve')
            })}>
              <ThumbsUp className="mr-2 h-4 w-4" /> Approve
            </Button>
          </div>
        );*/
      case 'finalized':
        return (
          <Button size="sm" onClick={() => openConfirmationDialog({
              title: 'Arquivar Livro?',
              description: `Isso arquivará todos os documentos para "${bookName}". Esta é uma ação final.`,
              onConfirm: () => handleFinalize(bookId)
          })}>
            <Archive className="mr-2 h-4 w-4" /> Arquivar
          </Button>
        );
       case 'client-rejections':
        return (
           <Button size="sm" onClick={() => openConfirmationDialog({
              title: 'Marcar como Corrigido?',
              description: `Isso marcará "${bookName}" como corrigido e o tornará disponível para reenvio.`,
              onConfirm: () => handleMarkAsCorrected(bookId)
           })}>
            <Undo2 className="mr-2 h-4 w-4" /> Marcar como Corrigido
          </Button>
        );
       case 'corrected':
         return (
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Send className="mr-2 h-4 w-4" /> Enviar Apenas TIFFs Para...
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() =>
                  openConfirmationDialog({
                    title: "Tem a certeza?",
                    description: `Isto irá reenviar apenas os TIFFs de "${bookName}" para o Armazenamento.`,
                    onConfirm: () => handleResubmitMoveTifs(bookId, "Storage"),
                  })
                }
              >
                Armazenamento
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  openConfirmationDialog({
                    title: "Tem a certeza?",
                    description: `Isto irá reenviar apenas os TIFFs de "${bookName}" para a Indexação.`,
                    onConfirm: () => handleResubmitMoveTifs(bookId, "To Indexing"),
                  })
                }
              >
                Indexação
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  openConfirmationDialog({
                    title: "Tem a certeza?",
                    description: `Isto irá reenviar apenas os TIFFs de "${bookName}" para o Controle de Qualidade.`,
                    onConfirm: () => handleResubmitMoveTifs(bookId, "To Checking"),
                  })
                }
              >
                Controlo de Qualidade
              </DropdownMenuItem>
              
               <DropdownMenuItem
                onClick={() =>
                  openConfirmationDialog({
                    title: "Tem a certeza?",
                    description: `Isto irá reenviar todos os formatos de "${bookName}" para Pronto para Processamento.`,
                    onConfirm: () => handleResubmitMoveTifs(bookId, "Ready for Processing"),
                  })
                }
              >
                Pronto para Processamento
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
                onClick={() =>
                  openConfirmationDialog({
                    title: "Tem a certeza?",
                    description: `Isto irá reenviar todos os formatos de "${bookName}" para o Controle de Qualidade Final.`,
                    onConfirm: () => handleResubmit(bookId, "Final Quality Control"),
                  })
                }
              >
                Controlo de Qualidade Final
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
         )
      case 'archive':
        return null;
      default: 
        if (!config.actionButtonLabel) return null;
        const actionButton = (
            <Button 
                size="sm" 
                onClick={() => openConfirmationDialog({
                  title: `Tem a certeza?`,
                  description: `Isso irá realizar a ação "${config.actionButtonLabel}" em "${bookName}".`,
                  onConfirm: () => handleMainAction(book)
                })}
                disabled={hasError}
            >
                <ActionIcon className="mr-2 h-4 w-4" />
                {config.actionButtonLabel}
            </Button>
        );

        if (hasError) {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>{actionButton}</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cannot proceed. One or more pages have an error.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        }
        return actionButton;
    }
  }


  const handleSaveObservation = () => {
    if (observationTarget && newObservation.trim()) {
        addBookObservation(observationTarget.id, newObservation.trim());
        setNewObservation('');
        setObservationTarget(null);
    }
  }
  
  return (
    <>
     <AlertDialog>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle className="font-headline">{config.title}</CardTitle>
                    <CardDescription>{config.description}</CardDescription>
                </div>
                {renderBulkActions()}
            </div>
             {stage === 'final-quality-control' && (
                <div className="pt-4">
                  <Label htmlFor="batch-select">Filtrar por Lote de Processamento</Label>
                  <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                    <SelectTrigger id="batch-select" className="w-[300px]">
                        <SelectValue placeholder="Selecionar um lote..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Lotes</SelectItem>
                        {availableBatches.map(batch => (
                            <SelectItem key={batch.id} value={batch.id}>
                                {batch.timestamp.replace('Process started on ', '')}
                            </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {stage === 'storage' && (
                <div className="pt-4">
                  <Label htmlFor="storage-select">Filtrar por Localização de Armazenamento</Label>
                  <Select value={selectedStorageId} onValueChange={setSelectedStorageId}>
                    <SelectTrigger id="storage-select" className="w-[300px]">
                        <SelectValue placeholder="Selecionar um armazenamento..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Armazenamentos</SelectItem>
                        {storages.map(storage => (
                            <SelectItem key={storage.id} value={String(storage.id)}>{storage.nome}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
          </CardHeader>
          <CardContent>
            {Object.keys(groupedByBook).length > 0 ? (
              <>
                <div className="flex items-center justify-between pb-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                        checked={
                          allVisibleSelected
                            ? true
                            : someVisibleSelected
                            ? "indeterminate"
                            : false
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelection((prev) =>
                              Array.from(new Set([...prev, ...allVisibleBookIds]))
                            );
                          } else {
                            setSelection((prev) =>
                              prev.filter((id) => !allVisibleBookIds.includes(id))
                            );
                          }
                        }}
                        aria-label="Selecionar todos os livros desta página"
                      />
                    <span className="text-sm text-muted-foreground">Selecionar todos os livros desta página</span>
                  </div>
                </div>
                <Accordion type="multiple" value={openAccordions} onValueChange={handleAccordionChange} className="w-full">
                  {paginatedBookGroups.map((bookGroup) => {
                    const { book, pages, hasError, hasWarning, batchInfo } = bookGroup;
                    const isProcessing = processingBookIds.includes(book.id);
                    const pageCount = pages.length;
                    const bookCols = columnStates[book.id]?.cols || 8;

                    const allPages = getPagesForBook(book.id);
                    const currentPage = currentPageByBook[book.id] || 1;
                    const startIdx = (currentPage - 1) * itemsPerPage;
                    const paginatedPages = allPages.slice(startIdx, startIdx + itemsPerPage);
                    const totalPages = Math.ceil(allPages.length / itemsPerPage);

                    return (
                    <AccordionItem value={book.id} key={book.id}>
                      <div className="flex items-center justify-between hover:bg-muted/50 rounded-md">
                          <div className="pl-4">
                              <Checkbox
                                  checked={selection.includes(book.id)}
                                  onCheckedChange={(checked) => {
                                      setSelection(prev =>
                                          checked
                                              ? [...prev, book.id]
                                              : prev.filter(id => id !== book.id)
                                      );
                                  }}
                                  aria-label={`Selecionar livro ${book.name}`}
                              />
                          </div>
                          <AccordionTrigger className="flex-1 px-4 py-2">
                              <div className="flex items-center gap-3 text-left">
                                  <span
                                    className="h-4 w-4 rounded-full border shrink-0"
                                    style={{ backgroundColor: book.color || '#FFFFFF' }}
                                  />
                                  <div>
                                      <p className="font-semibold text-base flex items-center gap-2">
                                        {book.name}
                                        {hasError && <ShieldAlert className="h-4 w-4 text-destructive" />}
                                        {hasWarning && !hasError && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                                      </p>
                                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                        {book.projectName} - 
                                        {isProcessing ? 
                                          <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin"/> Loading pages...</span> 
                                          : <span>{pageCount} pages</span>
                                        }
                                        {stage === 'storage' && book.storageName && <span className="text-xs text-muted-foreground/80 hidden md:inline-block"> (Storage: {book.storageName})</span>}
                                        {batchInfo && <span className="text-xs text-muted-foreground/80 hidden md:inline-block"> (Batch: {batchInfo.timestampStr.replace('Process started on ', '').replace(/ (AM|PM)$/, '')})</span>}
                                      </p>
                                  </div>
                              </div>
                          </AccordionTrigger>
                          <div className="px-4">
                            {renderActions(bookGroup)}
                          </div>
                      </div>
                      <AccordionContent>
                        <div className="p-4 space-y-4">
                            <Card>
                              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full gap-2">
                                  <div className="flex items-center gap-2">
                                    <Info className="h-4 w-4" />
                                    <CardTitle className="text-base">Detalhes do Livro</CardTitle>
                                  </div>
                                  <Button 
                                    onClick={() => setObservationTarget(book)} 
                                    className="w-full md:w-auto"
                                  >
                                    <MessageSquarePlus className="mr-2 h-4 w-4" /> Adicionar Observação
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent className="text-sm space-y-4">
                                  <DetailItem label="Livro" value={<Link href={`/books/${book.id}`} className="text-primary hover:underline">{book.name}</Link>} />
                                  {batchInfo && <DetailItem label="Lote" value={<Link href={`/processing-batches/${batchInfo.id}`} className="text-primary hover:underline">{batchInfo.timestampStr.replace('Process started on ', '').replace(/ (AM|PM)$/, '')}</Link>} />}
                                  <DetailItem label="Projeto" value={book.projectName} />
                                  <DetailItem label="Cliente" value={book.clientName} />
                                  <Separator />
                                  <DetailItem label="Autor" value={book.author || '—'} />
                                  <DetailItem label="ISBN" value={book.isbn || '—'} />
                                  <DetailItem label="Ano de Publicação" value={book.publicationYear || '—'} />
                                  <Separator />
                                  <DetailItem label="Prioridade" value={book.priority || '—'} />
                                  {book.info && (
                                  <>
                                  <Separator />
                                  <div className="pt-2 grid grid-cols-1 gap-2">
                                      <p className="text-muted-foreground">Informação Adicional</p>
                                      <p className="font-medium whitespace-pre-wrap">{book.info}</p>
                                  </div>
                                  </>
                                  )}
                              </CardContent>
                            </Card>
                            {stage === 'client-rejections' && (
                              <Card className="bg-destructive/10 border-destructive/50">
                                  <CardHeader className="pb-2">
                                      <CardTitle className="flex items-center gap-2 text-base text-destructive font-semibold">
                                          <MessageSquareWarning className="h-5 w-5" /> Motivo de Rejeição do Cliente
                                      </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                      <p className="text-sm text-destructive-foreground/90">{book.rejectionReason || "Nenhum motivo fornecido."}</p>
                                  </CardContent>
                              </Card>
                            )}

                            <div className="flex items-center justify-end gap-4">
                              <Label htmlFor={`columns-slider-${book.id}`} className="text-sm whitespace-nowrap">Tamanho da Miniatura:</Label>
                              <Slider
                                  id={`columns-slider-${book.id}`}
                                  min={1}
                                  max={12}
                                  step={1}
                                  value={[bookCols]}
                                  onValueChange={(value) => setBookColumns(book.id, value[0])}
                                  className="w-full max-w-[200px]"
                              />
                              <Badge variant="outline" className="w-16 justify-center">{bookCols} {bookCols > 1 ? 'cols' : 'col'}</Badge>
                            </div>

                            <div className={`grid gap-4 ${gridClasses[bookCols] || 'grid-cols-8'}`}>
                              {isProcessing && pages.length === 0 ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                  <Skeleton key={i} className="aspect-[4/5.5] w-full h-full" />
                                ))
                              ) : (
                                paginatedPages.map(page => (
                                  <div key={page.id} className="relative group">
                                    <Link href={`/documents/${page.id}`} className="block">
                                        <Card className="overflow-hidden hover:shadow-lg transition-shadow relative border-2 border-transparent group-hover:border-primary">
                                            <CardContent className="p-0">
                                                <Image
                                                    src={page.imageUrl || "https://placehold.co/400x550.png"}
                                                    alt={`Preview of ${page.name}`}
                                                    data-ai-hint="document page"
                                                    width={400}
                                                    height={550}
                                                    className="aspect-[4/5.5] object-contain w-full h-full"
                                                    //className="object-contain w-full h-full"
                                                    unoptimized
                                                    //fill
                                                />
                                                <TooltipProvider>
                                                  <Tooltip>
                                                      <TooltipTrigger asChild>
                                                          <div className="absolute inset-0">
                                                              {page.flag === 'error' && <div className="absolute inset-0 bg-destructive/20 border-2 border-destructive"></div>}
                                                              {page.flag === 'warning' && <div className="absolute inset-0 bg-orange-500/20 border-2 border-orange-500"></div>}
                                                          </div>
                                                      </TooltipTrigger>
                                                      {page.flagComment && <TooltipContent><p>{page.flagComment}</p></TooltipContent>}
                                                  </Tooltip>
                                              </TooltipProvider>
                                            </CardContent>
                                            <CardFooter className="p-2 flex-col items-start gap-1">
                                                <p className="text-xs font-medium whitespace-pre-wrap">{page.name}</p>

                                                {page.flag && page.flagComment && (
                                                  <TooltipProvider>
                                                    <Tooltip>
                                                      <TooltipTrigger asChild>
                                                        <div className="flex items-start gap-1.5 text-xs w-full text-muted-foreground">
                                                          {page.flag === 'error' && <ShieldAlert className="h-3 w-3 mt-0.5 flex-shrink-0 text-destructive"/>}
                                                          {page.flag === 'warning' && <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0 text-orange-500"/>}
                                                          {page.flag === 'info' && <Info className="h-3 w-3 mt-0.5 flex-shrink-0 text-primary"/>}
                                                          <p className="whitespace-pre-wrap break-words">{page.flagComment}</p>
                                                        </div>
                                                      </TooltipTrigger>
                                                      <TooltipContent><p>{page.flagComment}</p></TooltipContent>
                                                    </Tooltip>
                                                  </TooltipProvider>
                                                )}

                                                {page.tags && page.tags.length > 0 && (
                                                  <div className="flex flex-wrap gap-1 pt-1">
                                                    {page.tags.map(tag => (
                                                      <Badge key={tag} variant={stage === 'pending-deliveries' ? 'outline' : 'destructive'} className="text-xs">
                                                          {tag}
                                                      </Badge>
                                                    ))}
                                                  </div>
                                                )}
                                            </CardFooter>
                                        </Card>
                                    </Link>
                                    <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {stage === 'pending-deliveries' && (
                                          <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => openTaggingDialog(page)}>
                                              <Tag className="h-4 w-4" />
                                          </Button>
                                      )}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="secondary" size="icon" className="h-7 w-7">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openFlagDialog(page, 'error')}>
                                                    <ShieldAlert className="mr-2 h-4 w-4 text-destructive" /> Mark Error
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => openFlagDialog(page, 'warning')}>
                                                    <AlertTriangle className="mr-2 h-4 w-4 text-orange-500" /> Mark Warning
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => openFlagDialog(page, 'info')}>
                                                    <Info className="mr-2 h-4 w-4 text-primary" /> Mark Info
                                                </DropdownMenuItem>
                                                {page.flag && (
                                                  <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => updateDocumentFlag(page.id, null)}>
                                                        Clear Flag
                                                    </DropdownMenuItem>
                                                  </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                  </div>
                              ))
                              )}
                            </div>
                            {totalPages > 1 && (
                              <div className="flex justify-center items-center gap-4 pt-4">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={currentPage === 1}
                                  onClick={() => handlePageChange(book.id, currentPage - 1)}
                                >
                                  Anterior
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                  Página {currentPage} de {totalPages}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={currentPage === totalPages}
                                  onClick={() => handlePageChange(book.id, currentPage + 1)}
                                >
                                  Próxima
                                </Button>
                              </div>
                            )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )})}
                </Accordion>
                {totalBookPages > 1 && (
                  <div className="flex justify-center items-center gap-4 pt-6">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={bookPage === 1}
                      onClick={() => setBookPage(bookPage - 1)}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Página {bookPage} de {totalBookPages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={bookPage === totalBookPages}
                      onClick={() => setBookPage(bookPage + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-4">
                  <BookOpen className="h-12 w-12"/>
                  <p>{config.emptyStateText}</p>
              </div>
            )}
          </CardContent>
           <CardFooter>
            <div className="text-xs text-muted-foreground">
              A mostrar <strong>{Object.keys(groupedByBook).length}</strong> livro(s) nesta fase.
            </div>
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
                  placeholder="ex.:, Page 5 is blurry, please re-scan."
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

    <Dialog open={assignmentState.open} onOpenChange={closeAssignmentDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atribuir Utilizador a "{assignmentState.bookName}"</DialogTitle>
          <DialogDescription>
            Atribua esta tarefa a um utilizador. A mesma será remetida para a respetiva lista de pendentes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Select value={assignmentState.selectedUserId} onValueChange={(val) => setAssignmentState(s => ({...s, selectedUserId: val}))}>
            <SelectTrigger>
              <SelectValue placeholder={`Selecione um ${assignmentState.role}...`} />
            </SelectTrigger>
            <SelectContent>
              {assignmentState.projectId && assignmentState.role && 
                getAssignableUsers(assignmentState.role, assignmentState.projectId).map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeAssignmentDialog}>Cancel</Button>
          <Button onClick={handleAssignmentSubmit} disabled={!assignmentState.selectedUserId}>
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
    
    <Dialog open={taggingState.open} onOpenChange={closeTaggingDialog}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Tag "{taggingState.docName}"</DialogTitle>
                <DialogDescription>
                    Indique os motivos de rejeição desta página.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <ScrollArea className="h-64">
                    <div className="space-y-2 pr-6">
                         {taggingState.availableTags.length > 0 ? (
                            taggingState.availableTags.map(tag => (
                                <div key={tag.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`tag-${tag.id}`}
                                        checked={taggingState.selectedTags.includes(tag.label)}
                                        onCheckedChange={(checked) => {
                                            setTaggingState(prev => ({
                                                ...prev,
                                                selectedTags: checked
                                                    ? [...prev.selectedTags, tag.label]
                                                    : prev.selectedTags.filter(t => t !== tag.label)
                                            }));
                                        }}
                                    />
                                    <Label htmlFor={`tag-${tag.id}`} className="flex flex-col gap-1 w-full">
                                        <span className="font-medium">{tag.label}</span>
                                        <span className="text-xs text-muted-foreground">{tag.description}</span>
                                    </Label>
                                </div>
                            ))
                        ) : (
                          <p className="text-sm text-muted-foreground text-center">No rejection tags have been defined for this client.</p>
                        )}
                    </div>
                </ScrollArea>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={closeTaggingDialog}>Cancel</Button>
                <Button onClick={handleTaggingSubmit}>Save Tags</Button>
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
    

