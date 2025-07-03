
"use client";

import React from 'react';
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from '@/context/workflow-context';
import { ShieldAlert, AlertTriangle, InfoIcon, CircleX, History } from "lucide-react";
import type { AppDocument } from '@/context/workflow-context';

const flagConfig = {
    error: { icon: ShieldAlert, color: "text-destructive", label: "Error" },
    warning: { icon: AlertTriangle, color: "text-accent-foreground", label: "Warning" },
    info: { icon: InfoIcon, color: "text-primary", label: "Info" },
};

export default function DocumentDetailClient({ docId }: { docId: string }) {
    const { documents, auditLogs, updateDocumentFlag } = useAppContext();
    
    const document = documents.find(doc => doc.id === docId);
    
    const firstLogDocId = auditLogs.length > 0 ? auditLogs[0].documentId : undefined;
    const documentAuditLog = firstLogDocId ? auditLogs.filter(log => log.documentId === firstLogDocId) : [];

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

    const CurrentFlagIcon = document.flag ? flagConfig[document.flag].icon : null;
    const currentFlagLabel = document.flag ? flagConfig[document.flag].label : "None";
    
    return (
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
                        <div className="space-y-4">
                           {documentAuditLog.length > 0 ? documentAuditLog.map((log, index) => (
                               <div key={log.id} className="flex items-start gap-4 relative">
                                  {index < documentAuditLog.length - 1 && <div className="absolute left-4 top-8 w-px h-full bg-border" />}
                                   <div className="flex-shrink-0 z-10">
                                       <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-background">
                                           <InfoIcon className="h-4 w-4 text-primary"/>
                                       </div>
                                   </div>
                                   <div className="flex-1 -mt-1">
                                       <p className="font-medium">{log.action} by <span className="text-primary">{log.user}</span></p>
                                       <p className="text-sm text-muted-foreground">{log.details}</p>
                                       <time className="text-xs text-muted-foreground">{log.date}</time>
                                   </div>
                               </div>
                           )) : (
                                <p className="text-sm text-muted-foreground">No audit trail available for this document.</p>
                           )}
                        </div>
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
                        <Button variant="destructive" className="w-full" onClick={() => updateDocumentFlag(document.id, 'error')}>
                            <ShieldAlert className="mr-2 h-4 w-4" /> Mark with Error
                        </Button>
                        <Button variant="secondary" className="w-full" onClick={() => updateDocumentFlag(document.id, 'warning')}>
                            <AlertTriangle className="mr-2 h-4 w-4" /> Mark with Warning
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => updateDocumentFlag(document.id, 'info')}>
                            <InfoIcon className="mr-2 h-4 w-4" /> Mark with Info
                        </Button>
                         {document.flag && (
                            <Button variant="ghost" className="w-full" onClick={() => updateDocumentFlag(document.id, null)}>
                               <CircleX className="mr-2 h-4 w-4" /> Clear Flag
                            </Button>
                        )}
                    </CardContent>
                </Card>
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
                                {document.tags.map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)}
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
    );
}
