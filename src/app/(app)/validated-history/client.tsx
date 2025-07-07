"use client"

import * as React from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAppContext } from "@/context/workflow-context";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, CheckCircle2, XCircle, History } from "lucide-react";

export default function ValidatedHistoryClient() {
    const { books, auditLogs, currentUser } = useAppContext();

    const validationHistory = React.useMemo(() => {
        if (!currentUser || !currentUser.clientId) return [];

        const clientBooks = books.filter(book => book.clientId === currentUser.clientId);

        const relevantBooks = clientBooks.filter(book =>
            ['Complete', 'Finalized', 'Client Rejected'].includes(book.status)
        );

        return relevantBooks.map(book => {
            const validationLog = auditLogs.find(log =>
                log.bookId === book.id && (log.action === 'Client Approval' || log.action === 'Client Rejection')
            );
            return {
                ...book,
                validationDate: validationLog ? new Date(validationLog.date).toLocaleDateString() : 'N/A',
                validationStatus: book.status === 'Client Rejected' ? 'Rejected' : 'Approved'
            };
        }).sort((a, b) => {
            if (a.validationDate === 'N/A') return 1;
            if (b.validationDate === 'N/A') return -1;
            return new Date(b.validationDate).getTime() - new Date(a.validationDate).getTime()
        });
    }, [books, auditLogs, currentUser]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Validated History</CardTitle>
                <CardDescription>History of all your approved and rejected document batches.</CardDescription>
            </CardHeader>
            <CardContent>
                {validationHistory.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Batch Name</TableHead>
                                <TableHead>Project</TableHead>
                                <TableHead>Outcome</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {validationHistory.map(book => (
                                <TableRow key={book.id}>
                                    <TableCell className="font-medium">
                                        <Link href={`/books/${book.id}`} className="hover:underline">{book.name}</Link>
                                    </TableCell>
                                    <TableCell>{book.projectName}</TableCell>
                                    <TableCell>
                                        {book.validationStatus === 'Approved' ? (
                                            <Badge variant="default" className="bg-green-600 hover:bg-green-600/90">
                                                <CheckCircle2 className="mr-2 h-4 w-4"/>
                                                Approved
                                            </Badge>
                                        ) : (
                                            <Badge variant="destructive">
                                                <XCircle className="mr-2 h-4 w-4"/>
                                                Rejected
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>{book.validationDate}</TableCell>
                                    <TableCell>
                                        {book.rejectionReason ? (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <Info className="h-5 w-5 text-muted-foreground" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{book.rejectionReason}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ) : '—'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center py-20 text-muted-foreground flex flex-col items-center gap-4">
                        <History className="h-16 w-16" />
                        <h3 className="text-xl font-semibold">No History Found</h3>
                        <p>You have no validated or rejected batches yet.</p>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <div className="text-xs text-muted-foreground">
                    Showing <strong>{validationHistory.length}</strong> validated batches.
                </div>
            </CardFooter>
        </Card>
    )
}
