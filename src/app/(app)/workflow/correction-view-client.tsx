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
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FolderSync, MessageSquareWarning, Trash2, Replace, FilePlus2, Info, BookOpen, X, Tag } from "lucide-react";
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
import { AppDocument, RejectionTag } from "@/context/workflow-context";


interface CorrectionViewClientProps {
  stage: string;
  config: {
    title: string;
    description: string;
    emptyStateText: string;
    dataStage: string;
  };
}

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="grid grid-cols-3 items-center gap-x-4">
    <p className="text-muted-foreground">{label}</p>
    <p className="col-span-2 font-medium">{value}</p>
  </div>
);


export default function CorrectionViewClient({ config }: CorrectionViewClientProps) {
  const { 
    documents, 
    books, 
    handleMarkAsCorrected,
    addPageToBook,
    deletePageFromBook,
    selectedProjectId,
    rejectionTags,
    currentUser,
    tagPageForRejection,
    clearPageRejectionTags,
  } = useAppContext();
  const { toast } = useToast();
  
  const [addPageState, setAddPageState] = React.useState({ open: false, bookId: '', bookName: '', maxPages: 0 });
  const [newPagePosition, setNewPagePosition] = React.useState<number | string>('');
  const [confirmationState, setConfirmationState] = React.useState({ open: false, title: '', description: '', onConfirm: () => {} });
  const [taggingState, setTaggingState] = React.useState<{
    open: boolean;
    docId: string | null;
    docName: string | null;
    selectedTags: string[];
    availableTags: RejectionTag[];
  }>({ open: false, docId: null, docName: null, selectedTags: [], availableTags: [] });

  const rejectedBooks = React.useMemo(() => {
    let baseBooks = books.filter(book => book.status === config.dataStage);
    if (selectedProjectId) {
      baseBooks = baseBooks.filter(book => book.projectId === selectedProjectId);
    }
    return baseBooks;
  }, [books, config.dataStage, selectedProjectId]);

  const getPagesForBook = (bookId: string) => {
    const getPageNum = (name: string): number => {
        const match = name.match(/ - Page (\d+)/);
        return match ? parseInt(match[1], 10) : 9999; 
    }

    return documents
        .filter(doc => doc.bookId === bookId)
        .sort((a, b) => getPageNum(a.name) - getPageNum(b.name));
  }

  const handleAddPageSubmit = () => {
    const position = Number(newPagePosition);
    if (!addPageState.bookId || !position || position < 1 || position > addPageState.maxPages + 1) {
      toast({
        title: "Invalid Position",
        description: `Please enter a number between 1 and ${addPageState.maxPages + 1}.`,
        variant: "destructive",
      });
      return;
    }
    addPageToBook(addPageState.bookId, position);
    setAddPageState({ open: false, bookId: '', bookName: '', maxPages: 0 });
    setNewPagePosition('');
  };

  const handleDeletePage = (pageId: string, pageName: string) => {
    const page = documents.find(p => p.id === pageId);
    if (!page || !page.bookId) return;
    deletePageFromBook(pageId, page.bookId);
     toast({
      title: "Page Deleted",
      description: `Page "${pageName}" has been deleted.`,
      variant: "destructive"
    });
  }

  const openConfirmationDialog = ({ title, description, onConfirm}: Omit<typeof confirmationState, 'open'>) => {
    setConfirmationState({ open: true, title, description, onConfirm });
  }

  const openTaggingDialog = (doc: AppDocument) => {
    const book = rejectedBooks.find(b => b.id === doc.bookId);
    if (!book) return;

    let availableTags;
    if (currentUser?.role === 'Admin' || currentUser?.role === 'Correction Specialist') {
        availableTags = rejectionTags.filter(tag => tag.clientId === book.clientId);
    } else {
        availableTags = rejectionTags.filter(tag => tag.clientId === currentUser?.clientId);
    }
    
    setTaggingState({
      open: true,
      docId: doc.id,
      docName: doc.name,
      selectedTags: doc.tags,
      availableTags: availableTags
    });
  };
  
  const closeTaggingDialog = () => {
    setTaggingState({ open: false, docId: null, docName: null, selectedTags: [], availableTags: [] });
  };
  
  const handleTaggingSubmit = () => {
    if (taggingState.docId) {
      clearPageRejectionTags(taggingState.docId, taggingState.selectedTags);
    }
    closeTaggingDialog();
  };

  return (
    <>
     <Card>
      <CardHeader>
        <CardTitle className="font-headline">{config.title}</CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rejectedBooks.length > 0 ? (
          <Accordion type="multiple" className="w-full">
            {rejectedBooks.map(book => {
              const pages = getPagesForBook(book.id);
              return (
              <AccordionItem value={book.id} key={book.id}>
                <div className="flex items-center justify-between hover:bg-muted/50 rounded-md">
                    <AccordionTrigger className="flex-1 px-4 py-2">
                        <div className="flex items-center gap-3 text-left">
                            <FolderSync className="h-5 w-5 text-destructive" />
                            <div>
                                <p className="font-semibold text-base">
                                  {book.name}
                                </p>
                                <p className="text-sm text-muted-foreground">{book.projectName} - {pages.length} pages</p>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <div className="px-4">
                       <Button size="sm" onClick={() => openConfirmationDialog({
                         title: `Are you sure?`,
                         description: `This will mark "${book.name}" as corrected and move it to the next stage.`,
                         onConfirm: () => handleMarkAsCorrected(book.id)
                       })}>
                         Mark as Corrected
                       </Button>
                    </div>
                </div>
                <AccordionContent>
                    <div className="px-4 py-4 space-y-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center gap-2 pb-2">
                                <Info className="h-4 w-4" />
                                <CardTitle className="text-base">Book Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <DetailItem label="Book" value={<Link href={`/books/${book.id}`} className="text-primary hover:underline">{book.name}</Link>} />
                                <DetailItem label="Project" value={book.projectName} />
                                <DetailItem label="Client" value={book.clientName} />
                                <Separator />
                                <DetailItem label="Author" value={book.author || '—'} />
                                <DetailItem label="ISBN" value={book.isbn || '—'} />
                                <DetailItem label="Publication Year" value={book.publicationYear || '—'} />
                                <Separator />
                                <DetailItem label="Priority" value={book.priority || '—'} />
                                {book.info && (
                                <>
                                <Separator />
                                <div className="pt-2 grid grid-cols-1 gap-2">
                                    <p className="text-muted-foreground">Additional Info</p>
                                    <p className="font-medium whitespace-pre-wrap">{book.info}</p>
                                </div>
                                </>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="bg-destructive/10 border-destructive/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base text-destructive font-semibold">
                                    <MessageSquareWarning className="h-5 w-5" /> Client Rejection Reason
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-destructive-foreground/90">{book.rejectionReason || "No reason provided."}</p>
                            </CardContent>
                        </Card>

                        <div className="flex items-center justify-end gap-2">
                             <Button variant="outline" size="sm" onClick={() => setAddPageState({ open: true, bookId: book.id, bookName: book.name, maxPages: pages.length })}>
                                <FilePlus2 className="mr-2 h-4 w-4"/> Add Page
                             </Button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                            {pages.map(page => (
                                <Card key={page.id} className="overflow-hidden group relative">
                                    <Link href={`/documents/${page.id}`}>
                                        <CardContent className="p-0">
                                            <Image
                                                src={page.imageUrl || "https://placehold.co/400x550.png"}
                                                alt={`Preview of ${page.name}`}
                                                data-ai-hint="document page"
                                                width={400}
                                                height={550}
                                                className="aspect-[4/5.5] object-cover w-full h-full"
                                            />
                                        </CardContent>
                                         <CardFooter className="p-2 flex-col items-start gap-1">
                                             <p className="text-xs font-medium truncate w-full">{page.name}</p>
                                             <div className="flex flex-wrap gap-1">
                                                 {page.tags.map(tag => (
                                                     <Badge key={tag} variant="destructive" className="text-xs">
                                                         {tag}
                                                     </Badge>
                                                 ))}
                                             </div>
                                         </CardFooter>
                                    </Link>
                                    <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="icon" className="h-7 w-7">
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Page?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will permanently delete "{page.name}". This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeletePage(page.id, page.name)}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                        <Button variant="secondary" size="icon" className="h-7 w-7">
                                            <Replace className="h-4 w-4"/>
                                        </Button>
                                         <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => openTaggingDialog(page)}>
                                            <Tag className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                </AccordionContent>
              </AccordionItem>
            )})}
          </Accordion>
        ) : (
           <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-4">
              <BookOpen className="h-12 w-12"/>
              <p>{config.emptyStateText}</p>
           </div>
        )}
      </CardContent>
       <CardFooter>
        <div className="text-xs text-muted-foreground">
          Showing <strong>{rejectedBooks.length}</strong> rejected books.
        </div>
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

    <Dialog open={addPageState.open} onOpenChange={(isOpen) => !isOpen && setAddPageState({ open: false, bookId: '', bookName: '', maxPages: 0 })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Page to "{addPageState.bookName}"</DialogTitle>
            <DialogDescription>
              Enter the position where the new page should be inserted. The current book has {addPageState.maxPages} pages.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="position" className="text-right">
                Position
              </Label>
              <Input
                id="position"
                type="number"
                value={newPagePosition}
                onChange={(e) => setNewPagePosition(e.target.value)}
                className="col-span-3"
                min={1}
                max={addPageState.maxPages + 1}
                placeholder={`e.g., 1 to ${addPageState.maxPages + 1}`}
              />
            </div>
          </div>
          <DialogFooter>
             <Button type="button" variant="outline" onClick={() => setAddPageState({ open: false, bookId: '', bookName: '', maxPages: 0 })}>Cancel</Button>
             <Button type="submit" onClick={handleAddPageSubmit}>Add Page</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={taggingState.open} onOpenChange={closeTaggingDialog}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Manage Tags for "{taggingState.docName}"</DialogTitle>
                <DialogDescription>
                    Select or deselect rejection reasons for this page.
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
    </>
  )
}
