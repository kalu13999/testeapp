

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
import type { EnrichedBook } from "@/lib/data";
import type { AppDocument, EnrichedAuditLog} from "@/context/workflow-context";
import { useAppContext } from "@/context/workflow-context";
import { Info, BookOpen, History, InfoIcon, ArrowUp, ArrowDown, ChevronsUpDown, ShieldAlert, AlertTriangle, MessageSquarePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";


interface BookDetailClientProps {
  bookId: string;
}

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col space-y-1">
    <p className="text-sm text-muted-foreground">{label}</p>
    <div className="font-medium">{value}</div>
  </div>
);

const StageDetailItem = ({ stage, user, startTime, endTime }: { stage: string, user?: string, startTime?: string, endTime?: string | null}) => (
  <div>
    <p className="text-sm font-medium">{stage}</p>
    <div className="text-sm text-muted-foreground pl-4 border-l-2 ml-2 py-1 space-y-1">
      <p>User: <span className="font-semibold">{user || '—'}</span></p>
      <p>Start: <span className="font-semibold">{startTime ? new Date(startTime).toLocaleString() : '—'}</span></p>
      <p>End: <span className="font-semibold">{endTime ? new Date(endTime).toLocaleString() : '—'}</span></p>
    </div>
  </div>
);

export default function BookDetailClient({ bookId }: BookDetailClientProps) {
  const { books, documents, users, auditLogs, bookObservations, addBookObservation } = useAppContext();
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([
    { id: 'date', desc: true }
  ]);
  const [columns, setColumns] = React.useState(8);
  const [isObservationModalOpen, setIsObservationModalOpen] = React.useState(false);
  const [newObservation, setNewObservation] = React.useState('');

  const book = books.find(b => b.id === bookId);
  
  const pages = React.useMemo(() => {
    const getPageNum = (name: string): number => {
        const match = name.match(/ - Page (\d+)/);
        return match ? parseInt(match[1], 10) : 9999; 
    }
    return documents
      .filter(d => d.bookId === bookId)
      .sort((a, b) => getPageNum(a.name) - getPageNum(b.name));
  }, [documents, bookId]);
  
  const scanner = users.find(u => u.id === book?.scannerUserId);
  const indexer = users.find(u => u.id === book?.indexerUserId);
  const qc = users.find(u => u.id === book?.qcUserId);


  const bookAuditLogs = React.useMemo(() => {
    let logs = auditLogs.filter(log => log.bookId === bookId);
    
    if (sorting.length > 0) {
      logs.sort((a, b) => {
        for (const s of sorting) {
          const key = s.id as keyof EnrichedAuditLog;
          const valA = a[key];
          const valB = b[key];
          let result = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
          if (result !== 0) return s.desc ? -result : result;
        }
        return 0;
      });
    }
    return logs;
  }, [auditLogs, bookId, sorting]);
  
  const relevantObservations = React.useMemo(() => {
    if (!bookObservations) return [];
    return bookObservations
        .filter(obs => obs.book_id === bookId)
        .map(obs => ({...obs, userName: users.find(u => u.id === obs.user_id)?.name || 'Unknown'}))
        .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [bookObservations, bookId, users]);

  const handleSort = (columnId: string, isShift: boolean) => {
    setSorting( currentSorting => {
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

  const handleSaveObservation = () => {
    if (book && newObservation.trim()) {
        addBookObservation(book.id, newObservation.trim());
        setNewObservation('');
        setIsObservationModalOpen(false);
    }
  }

  if (!book) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Book Not Found</CardTitle>
                <CardDescription>This book could not be found in the current context.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-center text-muted-foreground py-10">
                    Please check if the book exists or has been deleted.
                </p>
            </CardContent>
        </Card>
    );
  }

  const gridClasses: { [key: number]: string } = {
    1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6',
    7: 'grid-cols-7', 8: 'grid-cols-8', 9: 'grid-cols-9', 10: 'grid-cols-10', 11: 'grid-cols-11', 12: 'grid-cols-12'
  };

  return (
    <>
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm text-muted-foreground">{book.projectName} / {book.clientName}</p>
                <h1 className="font-headline text-3xl font-bold tracking-tight">{book.name}</h1>
                <p className="text-muted-foreground max-w-2xl mt-1">
                    Showing {pages.length} of {book.expectedDocuments} expected pages. Once scanned, pages will appear here.
                </p>
            </div>
            <Button onClick={() => setIsObservationModalOpen(true)}>
                <MessageSquarePlus className="mr-2 h-4 w-4" /> Adicionar Observação
            </Button>
        </div>

        <div className="flex items-center gap-4 py-2">
          <Label htmlFor="columns-slider" className="text-sm whitespace-nowrap">Thumbnail Size:</Label>
          <Slider
            id="columns-slider"
            min={1}
            max={12}
            step={1}
            value={[columns]}
            onValueChange={(value) => setColumns(value[0])}
            className="w-full max-w-[200px]"
          />
          <Badge variant="outline" className="w-16 justify-center">{columns} {columns > 1 ? 'cols' : 'col'}</Badge>
        </div>

        {pages.length > 0 ? (
            <div className={`grid gap-4 ${gridClasses[columns] || 'grid-cols-8'}`}>
                {pages.map(page => (
                    <div key={page.id} className="relative group">
                        <Link href={`/documents/${page.id}`}>
                            <Card className="overflow-hidden hover:shadow-lg transition-shadow relative border-2 border-transparent group-hover:border-primary">
                                <CardContent className="p-0">
                                    <Image
                                        src={page.imageUrl || "https://placehold.co/400x550.png"}
                                        alt={`Preview of ${page.name}`}
                                        data-ai-hint="document page"
                                        width={400}
                                        height={550}
                                        className="aspect-[4/5.5] object-cover w-full h-full"
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
                                        <div className="flex items-start gap-1.5 text-xs w-full text-muted-foreground">
                                            {page.flag === 'error' && <ShieldAlert className="h-3 w-3 mt-0.5 flex-shrink-0 text-destructive"/>}
                                            {page.flag === 'warning' && <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0 text-orange-500"/>}
                                            {page.flag === 'info' && <Info className="h-3 w-3 mt-0.5 flex-shrink-0 text-primary"/>}
                                            <p className="break-words">{page.flagComment}</p>
                                        </div>
                                    )}
                                    {page.tags && page.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 pt-1">
                                            {page.tags.map(tag => (
                                                <Badge key={tag} variant={'outline'} className="text-xs">{tag}</Badge>
                                            ))}
                                        </div>
                                    )}
                                </CardFooter>
                            </Card>
                        </Link>
                    </div>
                ))}
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center text-center py-20 rounded-lg bg-muted">
                <BookOpen className="h-12 w-12 text-muted-foreground" />
                <h3 className="text-xl font-semibold mt-4">Awaiting Scans</h3>
                <p className="text-muted-foreground">No pages have been scanned for this book yet.</p>
            </div>
        )}
      </div>

      <div className="lg:col-span-1 space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Book Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                  <DetailItem label="Project" value={<Link href={`/projects/${book.projectId}`} className="text-primary hover:underline">{book.projectName}</Link>} />
                  <DetailItem label="Client" value={book.clientName} />
                  <DetailItem label="Status" value={<Badge variant="outline">{book.status}</Badge>} />
                  <Separator />
                  <DetailItem label="Author" value={book.author || '—'} />
                  <DetailItem label="ISBN" value={book.isbn || '—'} />
                  <DetailItem label="Publication Year" value={book.publicationYear || '—'} />
                  <DetailItem label="Priority" value={book.priority || '—'} />
                  <Separator />
                  <DetailItem label="Expected Pages" value={book.expectedDocuments} />
                  <DetailItem label="Scanned Pages" value={book.documentCount} />
                  <Separator />
                  <DetailItem label="Storage" value={book.storageName || '—'} />
                  <DetailItem label="Scanner (Device)" value={book.scannerDeviceName || '—'} />
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader><CardTitle>Workflow Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <StageDetailItem stage="Scanning" user={scanner?.name} startTime={book.scanStartTime} endTime={book.scanEndTime} />
                <StageDetailItem stage="Indexing" user={indexer?.name} startTime={book.indexingStartTime} endTime={book.indexingEndTime} />
                <StageDetailItem stage="Quality Control" user={qc?.name} startTime={book.qcStartTime} endTime={book.qcEndTime} />
            </CardContent>
        </Card>

        {book.info && (
          <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base">Informações Adicionais</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{book.info}</p>
            </CardContent>
          </Card>
        )}
        
         <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><History className="h-5 w-5"/> Histórico de Observações</CardTitle>
                <CardDescription>Notas e observações sobre este livro.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                {relevantObservations.length > 0 ? relevantObservations.map((obs, index) => (
                    <div key={obs.id} className="flex items-start gap-3 relative">
                        <div className="flex-1 -mt-1.5">
                            <p className="text-sm text-foreground">{obs.observation}</p>
                            <time className="text-xs text-muted-foreground/80">{new Date(obs.created_at).toLocaleString()} por {obs.userName}</time>
                        </div>
                    </div>
                )) : (
                    <p className="text-sm text-muted-foreground">Nenhuma observação registada para este livro.</p>
                )}
                </div>
            </CardContent>
        </Card>


        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><History className="h-5 w-5"/> Histórico do Livro</CardTitle>
                <CardDescription>Eventos chave no ciclo de vida deste livro.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                {bookAuditLogs.length > 0 ? bookAuditLogs.map((log, index) => (
                    <div key={log.id} className="flex items-start gap-3 relative">
                        {index < bookAuditLogs.length - 1 && <div className="absolute left-[7px] top-6 w-px h-full bg-border" />}
                        <div className="flex-shrink-0 z-10">
                            <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center ring-4 ring-background">
                                <InfoIcon className="h-2.5 w-2.5 text-primary"/>
                            </div>
                        </div>
                        <div className="flex-1 -mt-1.5">
                            <p className="font-medium text-xs">{log.action}</p>
                            <p className="text-xs text-muted-foreground">{log.details}</p>
                            <time className="text-xs text-muted-foreground/80">{new Date(log.date).toLocaleString()} por {log.user}</time>
                        </div>
                    </div>
                )) : (
                        <p className="text-sm text-muted-foreground">Nenhum histórico disponível para este livro.</p>
                )}
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
    
     <Dialog open={isObservationModalOpen} onOpenChange={setIsObservationModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Adicionar Observação para: {book.name}</DialogTitle>
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
                <Button variant="outline" onClick={() => setIsObservationModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveObservation} disabled={!newObservation.trim()}>Guardar Observação</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
