

"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Eye, ThumbsDown, ThumbsUp, Tag } from "lucide-react"
import { useAppContext } from "@/context/workflow-context"
import { type EnrichedBook } from "@/lib/data"
import Link from "next/link";
import Image from "next/image";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import type { AppDocument, RejectionTag } from "@/context/workflow-context";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

type ValidationTask = {
  item: {
    id: string;
    deliveryId: string;
  };
  book: EnrichedBook;
  assigneeName: string;
  batchDate: string;
};

const gridClasses: { [key: number]: string } = {
  1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6',
  7: 'grid-cols-7', 8: 'grid-cols-8', 9: 'grid-cols-9', 10: 'grid-cols-10', 11: 'grid-cols-11', 12: 'grid-cols-12'
};

export default function MyTasksClient() {
  const {
    currentUser, permissions, deliveryBatches, deliveryBatchItems, books, users,
    documents, rejectionTags, selectedProjectId,
    setProvisionalDeliveryStatus, tagPageForRejection
  } = useAppContext();
  
  const [reviewState, setReviewState] = React.useState<{ open: boolean; task: ValidationTask | null }>({ open: false, task: null });
  const [columnCols, setColumnCols] = React.useState(8);
  const [rejectionDialog, setRejectionDialog] = React.useState<{ open: boolean; bookId: string; deliveryItemId: string; bookName: string; } | null>(null);
  const [rejectionComment, setRejectionComment] = React.useState("");
  const [taggingState, setTaggingState] = React.useState<{ open: boolean; doc: AppDocument | null; availableTags: RejectionTag[]; }>({ open: false, doc: null, availableTags: [] });
  const { toast } = useToast();
  
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

  const myTasks = React.useMemo(() => {
    if (!currentUser) return [];

    const validatingBatchIds = new Set(deliveryBatches.filter(b => b.status === 'Validating').map(b => b.id));
    
    let relevantItems = deliveryBatchItems.filter(item => 
      validatingBatchIds.has(item.deliveryId) && item.status === 'pending'
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

    return relevantItems.map(item => {
      const book = books.find(b => b.id === item.bookId);
      const batch = deliveryBatches.find(b => b.id === item.deliveryId);
      const assignee = users.find(u => u.id === item.user_id);
      if (!book || !batch) return null;
      return {
        item: { id: item.id, deliveryId: item.deliveryId },
        book,
        assigneeName: assignee?.name || 'Unassigned',
        batchDate: batch.creationDate
      }
    }).filter((task): task is ValidationTask => !!task);
    
  }, [currentUser, deliveryBatches, deliveryBatchItems, books, users, canViewAll, selectedProjectId, permissions]);

  const handleApprove = (item: ValidationTask) => {
    setProvisionalDeliveryStatus(item.item.id, item.book.id, 'approved');
    setReviewState({ open: false, task: null });
    toast({ title: `Livro "${item.book.name}" Aprovado` });
  };
  
  const handleRejectSubmit = () => {
    if (!rejectionDialog) return;
    setProvisionalDeliveryStatus(rejectionDialog.deliveryItemId, rejectionDialog.bookId, 'rejected', rejectionComment);
    setReviewState({ open: false, task: null });
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

  const getPagesForBook = (bookId: string) => {
    const getPageNum = (name: string): number => {
        const match = name.match(/ - Page (\d+)/);
        return match ? parseInt(match[1], 10) : 9999; 
    }
    return documents.filter(doc => doc.bookId === bookId).sort((a, b) => getPageNum(a.name) - getPageNum(b.name));
  }

  function groupPages(pages: AppDocument[]) {
    const grouped: Record<string, Record<string, AppDocument[]>> = {};
    const ungrouped: AppDocument[] = [];

    pages.forEach(page => {
      // casa com formato: 90454_1988-11-02_0001
      const match = page.name.match(/^(\d+)_([\d-]+)_/);

      if (match) {
        const [_, prefix, date] = match;

        if (!grouped[prefix]) grouped[prefix] = {};
        if (!grouped[prefix][date]) grouped[prefix][date] = [];

        grouped[prefix][date].push(page);
      } else {
        ungrouped.push(page);
      }
    });

    return { grouped, ungrouped };
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Tarefas</CardTitle>
          <CardDescription>Analise e aprove ou rejeite os livros atribuídos a você para validação.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Livro</TableHead>
                <TableHead>Projeto</TableHead>
                <TableHead>Data do Lote de Entrega</TableHead>
                {canViewAll && <TableHead>Atribuído a</TableHead>}
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myTasks.length > 0 ? (
                myTasks.map(task => (
                  <TableRow key={task.item.id}>
                    <TableCell className="font-medium">{task.book.name}</TableCell>
                    <TableCell>{task.book.projectName}</TableCell>
                    <TableCell>{new Date(task.batchDate).toLocaleDateString()}</TableCell>
                    {canViewAll && <TableCell>{task.assigneeName}</TableCell>}
                    <TableCell className="text-right">
                       <Button size="sm" onClick={() => setReviewState({ open: true, task })}>
                         <Eye className="mr-2 h-4 w-4" /> Analisar Livro
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={canViewAll ? 5 : 4} className="h-24 text-center">
                    Você não tem tarefas de validação pendentes.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Review Dialog */}
      <Dialog open={reviewState.open} onOpenChange={(isOpen) => !isOpen && setReviewState({ open: false, task: null })}>
          <DialogContent className="max-w-[90vw] h-[95vh] flex flex-col">
              <DialogHeader>
                  <DialogTitle>Analisar: {reviewState.task?.book.name}</DialogTitle>
                  <DialogDescription>
                    Analise todas as páginas. Você pode marcar páginas individuais com problemas antes de tomar uma decisão final.
                  </DialogDescription>
              </DialogHeader>
              <div className="flex-1 min-h-0">
                  <ScrollArea className="h-full pr-6">
                      <div className="flex items-center justify-end gap-4 py-4 sticky top-0 bg-background z-10">
                          <Label htmlFor="columns-slider" className="text-sm whitespace-nowrap">Tamanho da miniatura:</Label>
                          <Slider id="columns-slider" min={1} max={12} step={1} value={[columnCols]} onValueChange={(val) => setColumnCols(val[0])} className="w-full max-w-[200px]" />
                      </div>
                      {reviewState.task && (() => {
                        const pages = getPagesForBook(reviewState.task.book.id);
                        const { grouped, ungrouped } = groupPages(pages);

                        return (
                          <>
                            {/* Acordeões para grupos válidos */}
                            {Object.keys(grouped).length > 0 && (
                                <Accordion
                                  type="multiple"
                                  defaultValue={[Object.keys(grouped)[0]]}
                                  className="w-full space-y-4"
                                >

                                {Object.entries(grouped).map(([prefix, dates]) => (
                                  <AccordionItem key={prefix} value={prefix}>
                                    <AccordionTrigger className="text-lg font-semibold">
                                      {prefix}
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <Accordion type="multiple" 
                                      defaultValue={[Object.keys(dates)[0]]}
                                      className="pl-4">
                                        {Object.entries(dates)
                                          .sort(([a], [b]) => a.localeCompare(b)) // datas mais recentes primeiro
                                          .map(([date, datePages]) => (
                                            <AccordionItem key={date} value={date}>
                                              <AccordionTrigger className="text-md font-medium">
                                                {date} <span className="text-muted-foreground ml-2">({datePages.length})</span>
                                              </AccordionTrigger>
                                              <AccordionContent>
                                                <div className={`grid gap-4 ${gridClasses[columnCols]}`}>
                                                  {datePages
                                                  .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                                                  .map(page => (
                                                    <div key={page.id} className="relative group">
                                                      <Link href={`/documents/${page.id}`} target="_blank" className="block">
                                                        <Card className="overflow-hidden hover:shadow-lg transition-shadow relative border-2 border-transparent group-hover:border-primary">
                                                          <CardContent className="p-0">
                                                            <Image
                                                              src={page.imageUrl || "https://placehold.co/400x550.png"}
                                                              alt={`Preview of ${page.name}`}
                                                              width={400}
                                                              height={550}
                                                              className="aspect-[4/5.5] object-contain w-full h-full"
                                                              unoptimized
                                                            />
                                                          </CardContent>
                                                          <CardFooter className="p-2 min-h-[50px] flex-col items-start gap-1">
                                                            <p className="text-xs font-medium break-words">{page.name}</p>
                                                            {page.tags?.length > 0 && (
                                                              <div className="flex flex-wrap gap-1 pt-1">
                                                                {page.tags.map(tag => (
                                                                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                                                                ))}
                                                              </div>
                                                            )}
                                                          </CardFooter>
                                                        </Card>
                                                      </Link>

                                                      {/* Botão de Tag */}
                                                      <Button
                                                        variant="secondary"
                                                        size="icon"
                                                        className="h-7 w-7 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => openTaggingDialog(page)}
                                                      >
                                                        <Tag className="h-4 w-4" />
                                                      </Button>
                                                    </div>
                                                  ))}
                                                </div>
                                              </AccordionContent>
                                            </AccordionItem>
                                          ))}
                                      </Accordion>
                                    </AccordionContent>
                                  </AccordionItem>
                                ))}
                              </Accordion>
                            )}

                            {/* Grid normal para arquivos não agrupáveis */}
                            {ungrouped.length > 0 && (
                              <div className={`grid gap-4 mt-6 ${gridClasses[columnCols]}`}>
                                {ungrouped
                                .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))                            
                                .map(page => (
                                  <div key={page.id} className="relative group">
                                    <Link href={`/documents/${page.id}`} target="_blank" className="block">
                                      <Card className="overflow-hidden hover:shadow-lg transition-shadow relative border-2 border-transparent group-hover:border-primary">
                                        <CardContent className="p-0">
                                          <Image
                                            src={page.imageUrl || "https://placehold.co/400x550.png"}
                                            alt={`Preview of ${page.name}`}
                                            width={400}
                                            height={550}
                                            className="aspect-[4/5.5] object-contain w-full h-full"
                                            unoptimized
                                          />
                                        </CardContent>
                                        <CardFooter className="p-2 min-h-[50px] flex-col items-start gap-1">
                                          <p className="text-xs font-medium break-words">{page.name}</p>
                                          {page.tags?.length > 0 && (
                                            <div className="flex flex-wrap gap-1 pt-1">
                                              {page.tags.map(tag => (
                                                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                                              ))}
                                            </div>
                                          )}
                                        </CardFooter>
                                      </Card>
                                    </Link>

                                    <Button
                                      variant="secondary"
                                      size="icon"
                                      className="h-7 w-7 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => openTaggingDialog(page)}
                                    >
                                      <Tag className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        );
                      })()}
                  </ScrollArea>
              </div>
              <DialogFooter className="pt-4 border-t">
                  <Button variant="destructive" onClick={() => reviewState.task && setRejectionDialog({ open: true, bookId: reviewState.task.book.id, deliveryItemId: reviewState.task.item.id, bookName: reviewState.task.book.name })}>
                      <ThumbsDown className="mr-2 h-4 w-4"/> Rejeitar Livro
                  </Button>
                  <Button onClick={() => reviewState.task && handleApprove(reviewState.task)}>
                      <ThumbsUp className="mr-2 h-4 w-4"/> Aprovar Livro
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      
       {/* Rejection Comment Dialog */}
       <Dialog open={!!rejectionDialog} onOpenChange={(isOpen) => !isOpen && setRejectionDialog(null)}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Motivo da Rejeição</DialogTitle>
                  <DialogDescription>
                      Por favor, forneça um motivo para rejeitar o livro "{rejectionDialog?.bookName}". Isso será enviado à equipe interna para correção.
                  </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-4">
                  <Label htmlFor="rejection-comment">Comentário</Label>
                  <Textarea 
                      id="rejection-comment"
                      placeholder="ex.: Página 5 está desfocada."
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
