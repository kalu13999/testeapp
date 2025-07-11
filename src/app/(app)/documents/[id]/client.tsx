
"use client";

import React from 'react';
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from '@/context/workflow-context';
import { ShieldAlert, AlertTriangle, InfoIcon, CircleX, History, MessageSquareQuote, ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import type { AppDocument, EnrichedAuditLog } from '@/context/workflow-context';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

const flagConfig = {
    error: { icon: ShieldAlert, color: "text-destructive", label: "Error" },
    warning: { icon: AlertTriangle, color: "text-orange-500", label: "Warning" },
    info: { icon: InfoIcon, color: "text-primary", label: "Info" },
};

export default function DocumentDetailClient({ docId }: { docId: string }) {
    const { documents, auditLogs, updateDocumentFlag } = useAppContext();
    const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([
        { id: 'date', desc: true }
    ]);
    
    const document = documents.find(doc => doc.id === docId);

    const [flagDialogState, setFlagDialogState] = React.useState<{
        open: boolean;
        flag: AppDocument['flag'];
        comment: string;
    }>({ open: false, flag: null, comment: '' });
    
    const documentAuditLogs = React.useMemo(() => {
        let logs = auditLogs.filter(log => log.documentId === docId);
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
    }, [auditLogs, docId, sorting]);

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


    if (!document) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Document Not Found</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground py-10">
                        The document you are looking for could not be found. It may have been moved or does not exist in the current workflow state.
                    </p>
                </CardContent>
            </Card>
        )
    }

    const openFlagDialog = (flag: NonNullable<AppDocument['flag']>) => {
        if (!document) return;
        setFlagDialogState({
            open: true,
            flag: flag,
            comment: document.flagComment || '',
        });
    };

    const closeFlagDialog = () => {
        setFlagDialogState({ open: false, flag: null, comment: '' });
    };

    const handleFlagSubmit = () => {
        if (document && flagDialogState.flag) {
            updateDocumentFlag(document.id, flagDialogState.flag, flagDialogState.comment);
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
                        <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="font-headline flex items-center gap-2">
                                {CurrentFlagIcon && <CurrentFlagIcon className={`h-6 w-6 ${flagConfig[document.flag!].color}`} />}
                                {document.name}
                            </CardTitle>
                            <CardDescription>Document ID: {document.id}</CardDescription>
                        </div>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-muted rounded-lg aspect-[3/4] overflow-hidden flex items-center justify-center">
                                <Image
                                    src={document.imageUrl ? document.imageUrl.replace('/400x550/', '/1200x1600/') : 'https://placehold.co/1200x1600.png'}
                                    alt="Document placeholder"
                                    data-ai-hint="document scan"
                                    width={1200}
                                    height={1600}
                                    className="object-contain w-full h-full p-4"
                                />
                            </div>
                        </CardContent>
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
                                            <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('action', e.shiftKey)}>Action {getSortIndicator('action')}</div></TableHead>
                                            <TableHead>Details</TableHead>
                                            <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('user', e.shiftKey)}>User {getSortIndicator('user')}</div></TableHead>
                                            <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('date', e.shiftKey)}>Date {getSortIndicator('date')}</div></TableHead>
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
                            <Button variant="destructive" className="w-full" onClick={() => openFlagDialog('error')}>
                                <ShieldAlert className="mr-2 h-4 w-4" /> Mark with Error
                            </Button>
                            <Button variant="secondary" className="w-full" onClick={() => openFlagDialog('warning')}>
                                <AlertTriangle className="mr-2 h-4 w-4" /> Mark with Warning
                            </Button>
                            <Button variant="outline" className="w-full" onClick={() => openFlagDialog('info')}>
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
                                <MessageSquareQuote className="h-5 w-5"/>
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
