import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Check, Send, ThumbsDown, ThumbsUp, X, ZoomIn, ZoomOut, History } from "lucide-react";

const auditLog = [
    { action: "Created", user: "system", date: "2023-10-25 08:00", details: "Request received from Innovate Corp" },
    { action: "Received", user: "operator-1", date: "2023-10-25 09:15", details: "Physical document confirmed" },
    { action: "Scanned", user: "operator-1", date: "2023-10-25 10:30", details: "Scan successful" },
    { action: "Indexed", user: "operator-2", date: "2023-10-25 11:45", details: "Metadata applied" },
    { action: "Processing", user: "system", date: "2023-10-25 14:00", details: "OCR script initiated" },
    { action: "QC Pending", user: "system", date: "2023-10-26 09:00", details: "Ready for Quality Control" },
];

export default function DocumentDetailPage({ params }: { params: { id: string } }) {
    return (
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
            <div className="md:col-span-2 lg:col-span-3 space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                       <div>
                         <CardTitle className="font-headline">Document Preview: {params.id}</CardTitle>
                         <CardDescription>Invoice for Innovate Corp</CardDescription>
                       </div>
                       <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon"><ZoomIn className="h-4 w-4" /></Button>
                            <Button variant="outline" size="icon"><ZoomOut className="h-4 w-4" /></Button>
                       </div>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-muted rounded-lg aspect-[3/4] overflow-hidden flex items-center justify-center">
                             <Image
                                src="https://placehold.co/1200x1600.png"
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
                           {auditLog.map((log, index) => (
                               <div key={index} className="flex items-start gap-4 relative">
                                  {index < auditLog.length - 1 && <div className="absolute left-4 top-8 w-px h-full bg-border" />}
                                   <div className="flex-shrink-0 z-10">
                                       <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-background">
                                           <Check className="h-4 w-4 text-primary"/>
                                       </div>
                                   </div>
                                   <div className="flex-1 -mt-1">
                                       <p className="font-medium">{log.action} by <span className="text-primary">{log.user}</span></p>
                                       <p className="text-sm text-muted-foreground">{log.details}</p>
                                       <time className="text-xs text-muted-foreground">{log.date}</time>
                                   </div>
                               </div>
                           ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="md:col-span-1 lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button className="w-full"><ThumbsUp className="mr-2 h-4 w-4" /> Approve</Button>
                        <Button variant="destructive" className="w-full"><ThumbsDown className="mr-2 h-4 w-4" /> Reject</Button>
                        <Button variant="outline" className="w-full"><Send className="mr-2 h-4 w-4" /> Send to Next Stage</Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Metadata</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex justify-between items-center"><span>Status:</span><Badge variant="secondary">QC Pending</Badge></div>
                        <Separator />
                        <div className="flex justify-between"><span>Client:</span><strong className="text-right">Innovate Corp</strong></div>
                        <Separator />
                        <div className="flex justify-between"><span>Doc Type:</span><strong className="text-right">Invoice</strong></div>
                         <Separator />
                        <div className="flex justify-between"><span>Received:</span><strong className="text-right">2023-10-25</strong></div>
                         <Separator />
                         <div className="flex justify-between items-start"><span>Tags:</span>
                            <div className="flex flex-wrap gap-1 justify-end">
                                <Badge variant="outline">Urgent</Badge>
                                <Badge variant="outline">Q4</Badge>
                            </div>
                         </div>
                    </CardContent>
                </Card>
                <Card>
                     <CardHeader>
                        <CardTitle className="font-headline">Comments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Textarea placeholder="Add an optional comment for rejection or feedback..." />
                        <Button className="w-full mt-2">Submit Comment</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
