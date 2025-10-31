

"use client"

import * as React from "react"
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Button } from "@/components/ui/button";
import DocumentDetailClient from '@/app/(app)/documents/[id]/client';
import { useRouter, usePathname } from "next/navigation";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, ArrowRight, View, FileClock, MessageSquareWarning, Trash2, Replace, FilePlus2, Info, BookOpen, X, Tag, ShieldAlert, AlertTriangle, ThumbsDown, ThumbsUp, Check, type LucideIcon } from "lucide-react";
import { useAppContext } from "@/context/workflow-context";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { type AppDocument, type EnrichedBook, type RejectionTag } from "@/context/workflow-context";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";


type ValidationTask = {
  item: {
    id: string;
    deliveryId: string;
  };
  book: EnrichedBook;
  assigneeName: string;
  batchDate: string;
  itemStatus: 'pending' | 'approved' | 'rejected';
};

const flagConfig = {
    error: { icon: ShieldAlert, color: "text-destructive" },
    warning: { icon: AlertTriangle, color: "text-orange-500" },
    info: { icon: Info, color: "text-primary" },
};

const gridClasses: { [key: number]: string } = {
  1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6',
  7: 'grid-cols-7', 8: 'grid-cols-8', 9: 'grid-cols-9', 10: 'grid-cols-10', 11: 'grid-cols-11', 12: 'grid-cols-12'
};


export default function MyValidationsClient() {
  const {
    currentUser, permissions, deliveryBatches, deliveryBatchItems, books, users,
    documents, rejectionTags, selectedProjectId, setSelectedBookId, selectedBookId,
    setProvisionalDeliveryStatus, tagPageForRejection
  } = useAppContext();
  
  const { toast } = useToast();
  
  const [rejectionDialog, setRejectionDialog] = React.useState<{ open: boolean; bookId: string; deliveryItemId: string; bookName: string; } | null>(null);
  const [rejectionComment, setRejectionComment] = React.useState("");
  const [taggingState, setTaggingState] = React.useState<{ open: boolean; doc: AppDocument | null; availableTags: RejectionTag[]; }>({ open: false, doc: null, availableTags: [] });
  const [columnStates, setColumnStates] = React.useState<{ [key: string]: { cols: number } }>({});

  const [openBooks, setOpenBooks] = React.useState<string[]>([]);
  const [openDocId, setOpenDocId] = React.useState<string | null>(null);

  const canViewAll = React.useMemo(() => {
    if (!currentUser) return false;
    const userPermissions = permissions[currentUser.role] || [];
    return userPermissions.includes('*') || userPermissions.includes('/client/view-all-validations');
  }, [currentUser, permissions]);

    const isAdmin = React.useMemo(() => {
      if (!currentUser) return false;
      const userPermissions = permissions[currentUser.role] || [];
      return userPermissions.includes('*');
    }, [currentUser, permissions]);
  

      

      const handleOpenModal = (id: string) => setOpenDocId(id);
      const handleCloseModal = () => setOpenDocId(null);

      const handleOpenWindow = (id: string) => {
        window.open(`/documents/${id}`, `doc_${id}`, "width=900,height=700");
      };

 /*const batchesToValidate = React.useMemo(() => {
    if (!currentUser) return [];

    const validatingBatchIds = new Set(deliveryBatches.filter(b => b.status === 'Validating').map(b => b.id));
    
    let relevantItems = deliveryBatchItems.filter(item => 
      validatingBatchIds.has(item.deliveryId)
    );

    if (!canViewAll) {
      relevantItems = relevantItems.filter(item => item.user_id === currentUser.id);
    } else if(currentUser.clientId) {
      const clientBookIds = new Set(books.filter(b => b.clientId === currentUser.clientId).map(b => b.id));
      relevantItems = relevantItems.filter(item => clientBookIds.has(item.bookId));
    }
    
    if (selectedProjectId) {
        const projectBookIds = new Set(books.filter(b => b.projectId === selectedProjectId).map(b => b.id));
        relevantItems = relevantItems.filter(item => projectBookIds.has(item.bookId));
    }
    
    const tasks = relevantItems.map(item => {
      const book = books.find(b => b.id === item.bookId);
      const batch = deliveryBatches.find(b => b.id === item.deliveryId);
      const assignee = users.find(u => u.id === item.user_id);
      if (!book || !batch) return null;
      return {
        item: { id: item.id, deliveryId: item.deliveryId },
        book,
        assigneeName: assignee?.name || 'Unassigned',
        batchDate: batch.creationDate,
        itemStatus: item.status
      };
    }).filter((task): task is ValidationTask => !!task);

    const batchesMap = new Map<string, { creationDate: string; books: ValidationTask[] }>();
    tasks.forEach(task => {
        const batchId = task.item.deliveryId;
        if (!batchesMap.has(batchId)) {
            batchesMap.set(batchId, { creationDate: task.batchDate, books: [] });
        }
        batchesMap.get(batchId)!.books.push(task);
    });

    return Array.from(batchesMap.entries())
        .map(([batchId, data]) => ({ batchId, ...data }))
        .sort((a,b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());
  
  }, [currentUser, deliveryBatches, deliveryBatchItems, books, users, canViewAll, selectedProjectId, permissions]);*/

  type ValidationTask = {
    item: { id: string; deliveryId: string };
    book: EnrichedBook;
    assigneeName: string;
    batchDate: string;
    itemStatus: string;
  };

  type BatchToValidate = {
    batchId: string;
    creationDate: string;
    books: ValidationTask[];
  };

  const [batchesToValidate, setBatchesToValidate] = React.useState<BatchToValidate[]>([]);

  React.useEffect(() => {
    if (!currentUser) {
      setBatchesToValidate([]);
      return;
    }

    const validatingBatchIds = new Set(
      deliveryBatches.filter(b => b.status === 'Validating').map(b => b.id)
    );

    let relevantItems = deliveryBatchItems.filter(item =>
      validatingBatchIds.has(item.deliveryId)
    );

    if (!canViewAll) {
      relevantItems = relevantItems.filter(item => item.user_id === currentUser.id);
    } else if (currentUser.clientId) {
      const clientBookIds = new Set(
        books.filter(b => b.clientId === currentUser.clientId).map(b => b.id)
      );
      relevantItems = relevantItems.filter(item => clientBookIds.has(item.bookId));
    }

    if (selectedProjectId) {
      const projectBookIds = new Set(
        books.filter(b => b.projectId === selectedProjectId).map(b => b.id)
      );
      relevantItems = relevantItems.filter(item => projectBookIds.has(item.bookId));
    }

    const tasks: ValidationTask[] = relevantItems.flatMap(item => {
      const book = books.find(b => b.id === item.bookId);
      const batch = deliveryBatches.find(b => b.id === item.deliveryId);
      const assignee = users.find(u => u.id === item.user_id);
      if (!book || !batch) return [];
      return [{
        item: { id: item.id, deliveryId: item.deliveryId },
        book,
        assigneeName: assignee?.name || 'Unassigned',
        batchDate: batch.creationDate,
        itemStatus: item.status,
      }];
    });

    const batchesMap = new Map<string, { creationDate: string; books: ValidationTask[] }>();
    tasks.forEach(task => {
      const batchId = task.item.deliveryId;
      if (!batchesMap.has(batchId)) {
        batchesMap.set(batchId, { creationDate: task.batchDate, books: [] });
      }
      batchesMap.get(batchId)!.books.push(task);
    });

    const sortedBatches = Array.from(batchesMap.entries())
      .map(([batchId, data]) => ({ batchId, ...data }))
      .sort(
        (a, b) =>
          new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime()
      );

    setBatchesToValidate(sortedBatches);
  }, [
    currentUser,
    deliveryBatches,
    deliveryBatchItems,
    books,
    users,
    canViewAll,
    selectedProjectId,
    permissions,
  ]);



  const handleApprove = (item: ValidationTask) => {
    setProvisionalDeliveryStatus(item.item.id, item.book.id, 'approved');
    toast({ title: `Livro "${item.book.name}" Aprovado` });
  };
  
  const handleRejectSubmit = () => {
    if (!rejectionDialog) return;
    setProvisionalDeliveryStatus(rejectionDialog.deliveryItemId, rejectionDialog.bookId, 'rejected', rejectionComment);
    setRejectionDialog(null);
    setRejectionComment("");
    toast({ title: `Livro "${rejectionDialog.bookName}" Rejeitado`, variant: "destructive" });
  };

  const openTaggingDialog = (doc: AppDocument) => {
    const book = books.find(b => b.id === doc.bookId);
    if (!book) return;

    if (!currentUser?.clientId && !isAdmin) return;
    
    let idCliente: string;
    if (isAdmin)
      idCliente = book.clientId
    else if (currentUser?.clientId)
      idCliente =  currentUser.clientId

    const availableTags = rejectionTags.filter(tag => tag.clientId === idCliente);
    setTaggingState({
      open: true,
      doc: doc,
      availableTags: availableTags
    });
  };
  
  const closeTaggingDialog = () => {
    setTaggingState({ open: false, doc: null, availableTags: [] });
  };
  
  const handleTaggingSubmit = (tags: string[]) => {
    if (taggingState.doc) {
      tagPageForRejection(taggingState.doc.id, tags);
    }
    closeTaggingDialog();
  };
  
  const setBookColumns = (bookId: string, cols: number) => {
    setColumnStates(prev => ({ ...prev, [bookId]: { cols } }));
  }

  /*const getPagesForBook = (bookId: string) => {
    const getPageNum = (name: string): number => {
        const match = name.match(/ - Page (\d+)/);
        return match ? parseInt(match[1], 10) : 9999; 
    }
    return documents.filter(doc => doc.bookId === bookId).sort((a, b) => getPageNum(a.name) - getPageNum(b.name));
  }*/

  const [pagesByBatch, setPagesByBatch] = React.useState<{ [key: string]: number }>({});
  

  // --- Memo: páginas por livro (evita filtrar/ordenar repetidas vezes) ---
  const pagesByBook = React.useMemo(() => {
    const map = new Map<string, AppDocument[]>();

    const getPageNum = (name: string): number => {
      const match = name.match(/ - Page (\d+)/);
      return match ? parseInt(match[1], 10) : 9999;
    };

    for (const doc of documents) {
      if (!map.has(doc.bookId)) map.set(doc.bookId, []);
      map.get(doc.bookId)!.push(doc);
    }

    for (const [bookId, arr] of map.entries()) {
      arr.sort((a, b) => getPageNum(a.name) - getPageNum(b.name));
    }

    return map;
  }, [documents]);


  // Configuração da paginação
  const booksPerPage = 30;

    // Função para alterar a página de um batch
  function setCurrentPage(batchId: string, page: number) {
    setPagesByBatch(prev => ({ ...prev, [batchId]: page }));
  }

  // Componente PaginationNav reutilizado com props
  const PaginationNav = ({ currentPage, totalPages, onPageChange }: {
      currentPage: number;
      totalPages: number;
      onPageChange: (page: number) => void;
    }) => {
    if (totalPages <= 1) return null;
    const pageNumbers = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(1);
      if (currentPage > 3) pageNumbers.push(-1);
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      if (currentPage <= 2) end = 3;
      if (currentPage >= totalPages - 1) start = totalPages - 2;
      for (let i = start; i <= end; i++) {
        pageNumbers.push(i);
      }
      if (currentPage < totalPages - 2) pageNumbers.push(-1);
      pageNumbers.push(totalPages);
    }

    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={e => {
                e.preventDefault();
                onPageChange(Math.max(1, currentPage - 1));
              }}
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : undefined}
            />
          </PaginationItem>

          {pageNumbers.map((num, i) =>
            num === -1 ? (
              <PaginationItem key={`ellipsis-${i}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={num}>
                <PaginationLink
                  href="#"
                  isActive={currentPage === num}
                  onClick={e => {
                    e.preventDefault();
                    onPageChange(num);
                  }}
                >
                  {num}
                </PaginationLink>
              </PaginationItem>
            )
          )}

          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={e => {
                e.preventDefault();
                onPageChange(Math.min(totalPages, currentPage + 1));
              }}
              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : undefined}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Validações</CardTitle>
          <CardDescription>Analise e aprove ou rejeite os livros atribuídos para validação.</CardDescription>
        </CardHeader>
        <CardContent>
          {batchesToValidate.length > 0 ? (
            <Accordion type="multiple" className="w-full">
              {batchesToValidate.map(({ batchId, creationDate, books: booksInBatch }) => {
                    const currentPage = pagesByBatch[batchId] || 1;
                    const totalPages = Math.ceil(booksInBatch.length / booksPerPage);

                    // Paginar os livros
                    const paginatedBooks = booksInBatch.slice(
                      (currentPage - 1) * booksPerPage,
                      currentPage * booksPerPage
                    );

                    const totalDocs = booksInBatch.reduce((sum, task) => sum + (task.book.documentCount || 0), 0);

                    return (
                <AccordionItem value={batchId} key={batchId}>
                   <div className="flex items-center justify-between hover:bg-muted/50 rounded-md">
                    <AccordionTrigger className="flex-1 px-4 py-2">
                        <div className="flex items-center gap-3 text-left">
                            <FileClock className="h-5 w-5 text-primary" />
                            <div>
                                <p className="font-semibold text-base">
                                  Lote de Entrega - {new Date(creationDate).toLocaleDateString()}
                                </p>
                                <p className="text-sm text-muted-foreground">{booksInBatch.length} livro(s) neste lote</p>
                                <p className="text-sm text-muted-foreground">{totalDocs} documento(s) neste lote</p>
                           
                            </div>
                        </div>
                    </AccordionTrigger>
                  </div>
                  <AccordionContent className="p-4 space-y-4">
                     <Accordion type="multiple" className="w-full"
                       value={openBooks}
                        onValueChange={(newValues) => {
                          // Detecta o livro que acabou de ser aberto
                          const newlyOpened = newValues.find(v => !openBooks.includes(v));

                          setOpenBooks(newValues);

                          if (newlyOpened) {
                            setSelectedBookId(newlyOpened);
                            console.log("Livro aberto:", newlyOpened);
                          }
                        }}
                     
                     >
                        {paginatedBooks.map(task => {
                            const { book } = task;
                            const pages = pagesByBook.get(book.id) || [];
                            const bookCols = columnStates[book.id]?.cols || 8;
                            return (
                                <AccordionItem value={book.id} key={book.id} className={cn(
                                  "border-b transition-colors",
                                  task.itemStatus === 'approved' && 'bg-green-500/10 border-green-500/30',
                                  task.itemStatus === 'rejected' && 'bg-red-500/10 border-red-500/30'
                                )}>
                                    <div className="flex items-center justify-between hover:bg-muted/50 rounded-md">
                                        <AccordionTrigger className="flex-1 px-4 py-2">
                                            <div className="flex items-center gap-3 text-left">
                                                <BookOpen className="h-5 w-5 text-muted-foreground" />
                                                <div>
                                                    <p className="font-semibold">{book.name}</p>
                                                    <p className="text-sm text-muted-foreground">{book.projectName} - {book.documentCount} pages {canViewAll && `- Assigned to: ${task.assigneeName}`}</p>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        
                                    </div>
                                    <AccordionContent className="p-4 space-y-4">
                                        <div className="flex justify-start gap-2 px-4">
                                            <Button size="sm" variant="destructive" onClick={() => setRejectionDialog({ open: true, bookId: book.id, deliveryItemId: task.item.id, bookName: book.name })}>
                                                <ThumbsDown className="mr-2 h-4 w-4" /> Rejeitar
                                            </Button>
                                            <Button size="sm" onClick={() => handleApprove(task)}>
                                                <ThumbsUp className="mr-2 h-4 w-4" /> Aprovar
                                            </Button>
                                        </div>
                                        <div className="flex items-center justify-end gap-4">
                                            <Label htmlFor={`columns-slider-${book.id}`} className="text-sm whitespace-nowrap">Tamanho da miniatura:</Label>
                                            <Slider id={`columns-slider-${book.id}`} min={1} max={12} step={1} value={[bookCols]} onValueChange={(val) => setBookColumns(book.id, val[0])} className="w-full max-w-[200px]" />
                                            <Badge variant="outline" className="w-16 justify-center">{bookCols} {bookCols > 1 ? 'cols' : 'col'}</Badge>
                                        </div>
                                         <div className={`grid gap-4 ${gridClasses[bookCols]}`}>
                                            {pages.map(page => (
                                                <div key={page.id} className="relative group">
                                            
                                                    <Link href={`/documents/${page.id}`} className="block">
                                                        {//<//href="#"
                                                        //onClick={(e) => {
                                                          //e.preventDefault(); // evita navegação
                                                          //setOpenDocId(page.id); // faz o mesmo que o botão
                                                        //}}
                                                        //className="block"
                                                      //>
                                                      }
                                                        <Card className="overflow-hidden hover:shadow-lg transition-shadow relative border-2 border-transparent group-hover:border-primary">
                                                            <CardContent className="p-0">
                                                                <Image src={page.imageUrl || "https://placehold.co/400x550.png"} alt={`Preview of ${page.name}`} data-ai-hint="document page" 
                                                                  width={400} 
                                                                  height={550} 
                                                                  className="aspect-[4/5.5] object-contain w-full h-full" 
                                                                  //className="object-contain w-full h-full"
                                                                  unoptimized
                                                                  //fill
                                                                />
                                                            </CardContent>
                                                            <CardFooter className="p-2 min-h-[50px] flex-col items-start gap-1">
                                                                <p className="text-xs font-medium break-words">{page.name}</p>
                                                                {page.tags && page.tags.length > 0 && (<div className="flex flex-wrap gap-1 pt-1">{page.tags.map(tag => (<Badge key={tag} variant={'outline'} className="text-xs">{tag}</Badge>))}</div>)}
                                                            </CardFooter>
                                                        </Card>
                                                    </Link>
                                                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                      <Button variant="secondary" size="icon" onClick={() => openTaggingDialog(page)}>
                                                        <Tag className="h-4 w-4" />
                                                      </Button>
                                                      <Button variant="secondary" size="icon" onClick={() => setOpenDocId(page.id)}>
                                                        <View className="h-4 w-4" />
                                                      </Button>
                                                    </div>
                                                    {openDocId && (() => {
                                                      
                                                      const allPages = pagesByBook.get(book.id) ?? [];
                                                   
                                                      const currentIndex = allPages.findIndex(doc => doc.id === openDocId);
                                                      const prevPage = currentIndex > 0 ? allPages[currentIndex - 1] : null;
                                                      const nextPage = currentIndex < pages.length - 1 ? allPages[currentIndex + 1] : null;
                                                      const page = allPages[currentIndex];

                                                        return (
                                                          <div className="fixed inset-0 bg-background z-50 flex flex-col animate-fade-in">
                                                            {/* Header */}
                                                            <div className="flex items-center justify-between p-4 border-b">
                                                              {/* Título à esquerda */}
                                                              <h2 className="text-xl font-bold">{page?.name}</h2>

                                                              {/* Navegação central */}
                                                              <div className="flex items-center gap-3">
                                                                <Button
                                                                  variant="outline"
                                                                  size="icon"
                                                                  className="h-10 w-10" // botões um pouco maiores
                                                                  disabled={!prevPage}
                                                                  onClick={() => prevPage && setOpenDocId(prevPage.id)}
                                                                >
                                                                  <ArrowLeft className="h-6 w-6" />
                                                                </Button>
                                                                <Button
                                                                  variant="outline"
                                                                  size="icon"
                                                                  className="h-10 w-10"
                                                                  disabled={!nextPage}
                                                                  onClick={() => nextPage && setOpenDocId(nextPage.id)}
                                                                >
                                                                  <ArrowRight className="h-6 w-6" />
                                                                </Button>
                                                              </div>

                                                              {/* Botões à direita */}
                                                              <div className="flex items-center gap-2">
                                                                <Button
                                                                  variant="secondary"
                                                                  onClick={() => openTaggingDialog(page)}
                                                                >
                                                                  <Tag className="mr-2 h-4 w-4" /> Registar Motivo de Rejeição
                                                                </Button>
                                                                <Button
                                                                  variant="destructive"
                                                                  size="icon"
                                                                  className="h-10 w-10"
                                                                  onClick={() => setOpenDocId(null)}
                                                                >
                                                                  <X className="h-6 w-6" />
                                                                </Button>
                                                              </div>
                                                            </div>

                                                            {/* Conteúdo do documento */}
                                                            <div className="flex-1 overflow-auto p-6">
                                                              <DocumentDetailClient docId={openDocId} btnNavigation={false} />
                                                            </div>
                                                          </div>
                                                        );

                                                    })()}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-end gap-2 px-4">
                                            <Button size="sm" variant="destructive" onClick={() => setRejectionDialog({ open: true, bookId: book.id, deliveryItemId: task.item.id, bookName: book.name })}>
                                                <ThumbsDown className="mr-2 h-4 w-4" /> Rejeitar
                                            </Button>
                                            <Button size="sm" onClick={() => handleApprove(task)}>
                                                <ThumbsUp className="mr-2 h-4 w-4" /> Aprovar
                                            </Button>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                                
                            )
                        })}
                     </Accordion>
                  {/* Paginação */}
                  <PaginationNav
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={page => setCurrentPage(batchId, page)}
                  />
                  </AccordionContent>
                </AccordionItem>
                         );
                  })}
            </Accordion>
          ) : (
            <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-4">
              <FileClock className="h-12 w-12"/>
              <p>Não tem tarefas de validação pendentes.</p>
           </div>
          )}
        </CardContent>
      </Card>
      
       {/* Rejection Comment Dialog */}
       <Dialog open={!!rejectionDialog} onOpenChange={(isOpen) => !isOpen && setRejectionDialog(null)}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Motivo da Rejeição</DialogTitle>
                  <DialogDescription>
                      Por favor, forneça um motivo para rejeitar o livro "{rejectionDialog?.bookName}". Isso será enviado para a equipe interna para correção.
                  </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-4">
                  <Label htmlFor="rejection-comment">Comentário</Label>
                  <Textarea 
                      id="rejection-comment"
                      placeholder="ex.:, Página 5 está desfocada."
                      value={rejectionComment}
                      onChange={(e) => setRejectionComment(e.target.value)}
                  />
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setRejectionDialog(null)}>Cancelar</Button>
                  <Button variant="destructive" onClick={handleRejectSubmit} disabled={!rejectionComment.trim()}>
                      Enviar Rejeição
                  </Button>
              </DialogFooter>
          </DialogContent>
       </Dialog>
       
       {/* Tagging Dialog */}
       <TaggingDialog
         isOpen={taggingState.open}
         onClose={closeTaggingDialog}
         doc={taggingState.doc}
         availableTags={taggingState.availableTags}
         onSave={handleTaggingSubmit}
       />
    </>
  )
}


// --- TaggingDialog Component ---
interface TaggingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  doc: AppDocument | null;
  availableTags: RejectionTag[];
  onSave: (selectedTags: string[]) => void;
}

function TaggingDialog({ isOpen, onClose, doc, availableTags, onSave }: TaggingDialogProps) {
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (doc) {
      setSelectedTags(doc.tags || []);
    }
  }, [doc]);

  if (!doc) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
          <DialogHeader>
              <DialogTitle>Tag "{doc.name}"</DialogTitle>
              <DialogDescription>
                  Selecione um ou mais motivos de rejeição para esta página.
              </DialogDescription>
          </DialogHeader>
          <div className="py-4">
              <ScrollArea className="h-64">
                  <div className="space-y-2 pr-6">
                       {availableTags.length > 0 ? (
                          availableTags.map(tag => (
                              <div key={tag.id} className="flex items-center space-x-2">
                                  <Checkbox
                                      id={`tag-${tag.id}`}
                                      checked={selectedTags.includes(tag.label)}
                                      onCheckedChange={(checked) => {
                                          setSelectedTags(prev => 
                                            checked 
                                              ? [...prev, tag.label] 
                                              : prev.filter(t => t !== tag.label)
                                          );
                                      }}
                                  />
                                  <Label htmlFor={`tag-${tag.id}`} className="flex flex-col gap-1 w-full">
                                      <span className="font-medium">{tag.label}</span>
                                      <span className="text-xs text-muted-foreground">{tag.description}</span>
                                  </Label>
                              </div>
                          ))
                      ) : (<p className="text-sm text-muted-foreground text-center">Nenhuma tag de rejeição foi definida para este cliente.</p>)}
                  </div>
              </ScrollArea>
          </div>
          <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={() => onSave(selectedTags)}>Guardar Tags</Button>
          </DialogFooter>
      </DialogContent>
  </Dialog>
  )
}
