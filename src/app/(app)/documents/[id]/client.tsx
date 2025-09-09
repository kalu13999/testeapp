

"use client";

import React from 'react';
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from '@/context/workflow-context';
import { ShieldAlert, AlertTriangle, InfoIcon, CircleX, History, MessageSquarePlus, ArrowLeft, ArrowRight, ZoomIn } from "lucide-react";
import type { AppDocument, EnrichedAuditLog } from '@/context/workflow-context';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';


interface DocumentDetailClientProps {
  docId: string;
}

const flagConfig = {
    error: { icon: ShieldAlert, color: "text-destructive", label: "Error" },
    warning: { icon: AlertTriangle, color: "text-orange-500", label: "Warning" },
    info: { icon: InfoIcon, color: "text-primary", label: "Info" },
};

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col space-y-1">
    <p className="text-sm text-muted-foreground">{label}</p>
    <div className="font-medium">{value}</div>
  </div>
);

export default function DocumentDetailClient({ docId }: DocumentDetailClientProps) {
  const { documents, auditLogs, updateDocumentFlag, addBookObservation } = useAppContext();
  const [zoom, setZoom] = React.useState(1);
  const [loupeActive, setLoupeActive] = React.useState(false);
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
  const [isLoupeVisible, setIsLoupeVisible] = React.useState(false);
  const [loupeZoom, setLoupeZoom] = React.useState(3);

  const LOUPE_SIZE = 200;
    
  const document = documents.find(doc => doc.id === docId);

  const [flagDialogState, setFlagDialogState] = React.useState<{
    open: boolean;
    docId: string | null;
    docName: string | null;
    flag: AppDocument['flag'];
    comment: string;
  }>({ open: false, docId: null, docName: null, flag: null, comment: '' });

  // Navigation Logic
  const { prevPage, nextPage } = React.useMemo(() => {
      if (!document || !document.bookId) return { prevPage: null, nextPage: null };

      const getPageNum = (name: string): number => {
          const match = name.match(/ - Page (\d+)/);
          return match ? parseInt(match[1], 10) : 9999;
      };

      const bookPages = documents
          .filter(d => d.bookId === document.bookId)
          .sort((a, b) => getPageNum(a.name) - getPageNum(b.name));

      const currentIndex = bookPages.findIndex(p => p.id === docId);

      if (currentIndex === -1) return { prevPage: null, nextPage: null };

      const prevPage = currentIndex > 0 ? bookPages[currentIndex - 1] : null;
      const nextPage = currentIndex < bookPages.length - 1 ? bookPages[currentIndex + 1] : null;

      return { prevPage, nextPage };
  }, [docId, document, documents]);

   React.useEffect(() => {
    setZoom(1);
    setLoupeActive(false);
  }, [docId]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
      const imageElement = e.currentTarget.querySelector('img');
      if (!imageElement) return;

      const imgRect = imageElement.getBoundingClientRect();
      
      const x = e.clientX - imgRect.left + e.currentTarget.scrollLeft;
      const y = e.clientY - imgRect.top + e.currentTarget.scrollTop;
      
      setMousePosition({ x, y });
  };
    
  const documentAuditLogs = React.useMemo(() => {
    return auditLogs.filter(log => log.documentId === docId);
  }, [auditLogs, docId]);
  
  const [isObservationModalOpen, setIsObservationModalOpen] = React.useState(false);
  const [newObservation, setNewObservation] = React.useState('');

  const handleSaveObservation = () => {
    if (document && newObservation.trim()) {
        addBookObservation(document.bookId!, newObservation.trim());
        setNewObservation('');
        setIsObservationModalOpen(false);
    }
  }


  if (!document) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Document Not Found</CardTitle>
                <CardDescription>This document could not be found in the current context.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-center text-muted-foreground py-10">
                    Please check if the document exists or has been deleted.
                </p>
            </CardContent>
        </Card>
    );
  }

  const openFlagDialog = (doc: AppDocument, flag: NonNullable<AppDocument['flag']>) => {
    if (!doc) return;
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

  const CurrentFlagIcon = document.flag ? flagConfig[document.flag].icon : null;
  const currentFlagLabel = document.flag ? flagConfig[document.flag].label : "None";
    
  return (
    <>
      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
        <div className="md:col-span-2 lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                {CurrentFlagIcon && <CurrentFlagIcon className={`h-6 w-6 ${flagConfig[document.flag!].color}`} />}
                {document.name}
              </CardTitle>
              <CardDescription>Document ID: {document.id}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-4">
                <Button asChild variant="outline" size="icon" className="h-10 w-10 rounded-full" disabled={!prevPage}>
                  <Link href={prevPage ? `/documents/${prevPage.id}` : '#'} scroll={false}>
                    <ArrowLeft className="h-5 w-5" />
                    <span className="sr-only">Previous Page</span>
                  </Link>
                </Button>
                <div className="relative group w-full max-w-3xl bg-muted rounded-lg flex items-center justify-center h-[80vh]">
                  <div
                    className="relative flex items-center justify-center w-full h-full"
                    style={{ overflow: 'auto' }} 
                    onMouseMove={handleMouseMove}
                    onMouseEnter={() => setIsLoupeVisible(true)}
                    onMouseLeave={() => setIsLoupeVisible(false)}
                  >
                    <Image
                      src={document.imageUrl || 'https://placehold.co/1200x1600.png'}
                      alt="Document placeholder"
                      data-ai-hint="document scan"
                      width={1200}
                      height={1600}
                      className="transition-transform duration-200 object-contain"
                      style={{ 
                        transform: `scale(${zoom})`,
                        maxWidth: '100%',
                        maxHeight: '100%',
                       }}
                      unoptimized
                    />
                    {loupeActive && isLoupeVisible && (
                        <div
                            className="absolute border-2 border-primary rounded-full shadow-lg pointer-events-none bg-no-repeat"
                            style={{
                                width: LOUPE_SIZE,
                                height: LOUPE_SIZE,
                                left: mousePosition.x,
                                top: mousePosition.y,
                                transform: 'translate(-50%, -50%)',
                                backgroundImage: `url(${document.imageUrl})`,
                                backgroundSize: `${100 * zoom * loupeZoom}%`,
                                backgroundPosition: `${(-mousePosition.x * loupeZoom) + (LOUPE_SIZE / 2)}px ${(-mousePosition.y * loupeZoom) + (LOUPE_SIZE / 2)}px`,
                            }}
                        />
                    )}
                  </div>
                </div>
                <Button asChild variant="outline" size="icon" className="h-10 w-10 rounded-full" disabled={!nextPage}>
                  <Link href={nextPage ? `/documents/${nextPage.id}` : '#'} scroll={false}>
                    <ArrowRight className="h-5 w-5" />
                    <span className="sr-only">Next Page</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-center gap-4 pt-4">
              <div className="flex items-center gap-2">
                <ZoomIn className="h-5 w-5 text-muted-foreground" />
                <Slider
                  min={0.25}
                  max={5}
                  step={0.25}
                  value={[zoom]}
                  onValueChange={(value) => setZoom(value[0])}
                  className="w-40"
                />
                <Badge variant="outline" className="w-16 justify-center">{(zoom * 100).toFixed(0)}%</Badge>
              </div>
              <Separator orientation="vertical" className="h-6 mx-2" />
              <div className="flex items-center space-x-2">
                <Switch 
                    id="loupe-mode" 
                    checked={loupeActive} 
                    onCheckedChange={(checked) => {
                        setLoupeActive(checked);
                        if (checked) {
                            setZoom(1);
                        }
                    }}
                />
                <Label htmlFor="loupe-mode">Magnifier</Label>
              </div>
              {loupeActive && (
                <div className="flex items-center gap-2">
                  <Slider
                    min={2}
                    max={10}
                    step={2}
                    value={[loupeZoom]}
                    onValueChange={(value) => setLoupeZoom(value[0])}
                    className="w-32"
                  />
                  <Badge variant="secondary" className="w-12 justify-center">{loupeZoom}x</Badge>
                </div>
              )}
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2"><History className="h-5 w-5"/> Audit Trail</CardTitle>
              <CardDescription>Complete history of document lifecycle events.</CardDescription>
            </CardHeader>
            <CardContent>
              {documentAuditLogs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documentAuditLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.action}</TableCell>
                        <TableCell className="text-muted-foreground">{log.details}</TableCell>
                        <TableCell>{log.user}</TableCell>
                        <TableCell>{new Date(log.date).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No audit trail available for this document.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1 lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Flagging</CardTitle>
              <CardDescription>Mark this document with a status. Errors will block workflow progression.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="destructive" className="w-full" onClick={() => openFlagDialog(document, 'error')}>
                <ShieldAlert className="mr-2 h-4 w-4" /> Mark with Error
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => openFlagDialog(document, 'warning')}>
                <AlertTriangle className="mr-2 h-4 w-4" /> Mark with Warning
              </Button>
              <Button variant="outline" className="w-full" onClick={() => openFlagDialog(document, 'info')}>
                <InfoIcon className="mr-2 h-4 w-4" /> Mark with Info
              </Button>
              {document.flag && (
                <Button variant="ghost" className="w-full" onClick={() => updateDocumentFlag(document.id, null, '')}>
                  <CircleX className="mr-2 h-4 w-4" /> Clear Flag
                </Button>
              )}
            </CardContent>
          </Card>

          {document.flag && document.flagComment && (
            <Card>
              <CardHeader className="flex-row items-center gap-2 pb-2">
                <MessageSquarePlus className="h-5 w-5"/>
                <CardTitle className="font-headline text-base">Flag Comment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{document.flagComment}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-center"><span>Status:</span><Badge variant="secondary">{document.status}</Badge></div>
              <Separator />
              <div className="flex justify-between items-center"><span>Flag:</span><Badge variant={document.flag === 'error' ? "destructive" : "outline"}>{currentFlagLabel}</Badge></div>
              <Separator />
              <div className="flex justify-between"><span>Client:</span><strong className="text-right">{document.client}</strong></div>
              <Separator />
              <div className="flex justify-between"><span>Doc Type:</span><strong className="text-right">{document.type}</strong></div>
              <Separator />
              <div className="flex justify-between"><span>Received:</span><strong className="text-right">{document.lastUpdated}</strong></div>
              <Separator />
              <div className="flex justify-between items-start"><span>Tags:</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {Array.isArray(document.tags) && document.tags.map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea placeholder="Add an optional comment..." />
              <Button className="w-full mt-2">Submit Comment</Button>
            </CardContent>
          </Card>
        </div>
      </div>
        
      <Dialog open={flagDialogState.open} onOpenChange={closeFlagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag Document: "{flagDialogState.docName}"</DialogTitle>
            <DialogDescription>
              Provide a comment for the flag. This will be visible to the team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="flag-comment-detail">Comment</Label>
            <Textarea
              id="flag-comment-detail"
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
    </>
  );
}

