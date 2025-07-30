
"use client"

import * as React from "react"
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAppContext } from "@/context/workflow-context";
import { Loader2, CheckCircle, XCircle, Clock, Book, FileText, Timer, Hourglass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, formatDistance } from "date-fns";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface BatchDetailClientProps {
  batchId: string;
}

const DetailItem = ({ label, value, icon: Icon }: { label: string; value: React.ReactNode, icon?: React.ElementType }) => (
  <div className="flex flex-col space-y-1">
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {Icon && <Icon className="h-4 w-4" />}
        <span>{label}</span>
    </div>
    <div className="font-medium text-base pl-6">{value}</div>
  </div>
);

export default function BatchDetailClient({ batchId }: BatchDetailClientProps) {
  const { processingBatches, processingBatchItems, processingLogs, books } = useAppContext();
  
  const batch = React.useMemo(() => {
    return processingBatches.find(b => b.id === batchId);
  }, [processingBatches, batchId]);

  const items = React.useMemo(() => {
    return processingBatchItems.filter(item => item.batchId === batchId);
  }, [processingBatchItems, batchId]);
  
  const logs = React.useMemo(() => {
      return processingLogs.filter(log => log.batchId === batchId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [processingLogs, batchId]);

  const stats = React.useMemo(() => {
    if (!batch || !batch.endTime) return { duration: 'In Progress', totalPages: 0, avgPerBook: 'N/A', avgPerPage: 'N/A' };
    
    const start = new Date(batch.startTime);
    const end = new Date(batch.endTime);
    const duration = formatDistance(end, start);
    
    const totalPages = items.reduce((acc, item) => acc + (books.find(b => b.id === item.bookId)?.expectedDocuments || 0), 0);
    const totalDurationInSeconds = (end.getTime() - start.getTime()) / 1000;
    
    const avgPerBookSeconds = items.length > 0 ? totalDurationInSeconds / items.length : 0;
    const avgPerPageSeconds = totalPages > 0 ? totalDurationInSeconds / totalPages : 0;
    
    const formatAvg = (seconds: number) => {
        if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
        if (seconds < 60) return `${seconds.toFixed(2)}s`;
        return formatDistance(new Date(0), new Date(seconds * 1000));
    }
    
    return {
        duration,
        totalPages,
        avgPerBook: formatAvg(avgPerBookSeconds),
        avgPerPage: formatAvg(avgPerPageSeconds)
    }

  }, [batch, items, books]);

  if (!batch) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Batch Not Found</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-center text-muted-foreground py-10">
                    The processing batch you are looking for could not be found.
                </p>
            </CardContent>
        </Card>
    );
  }
  
  const getStatusInfo = (status: 'In Progress' | 'Complete' | 'Failed') => {
      switch (status) {
          case 'In Progress': return { icon: Loader2, color: 'text-primary', className: 'animate-spin' };
          case 'Complete': return { icon: CheckCircle, color: 'text-green-600' };
          case 'Failed': return { icon: XCircle, color: 'text-destructive' };
          default: return { icon: Clock, color: 'text-muted-foreground' };
      }
  }
  const StatusIcon = getStatusInfo(batch.status).icon;
  const statusColor = getStatusInfo(batch.status).color;
  const statusAnimation = getStatusInfo(batch.status).className;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center gap-3">
            <StatusIcon className={`h-8 w-8 ${statusColor} ${statusAnimation}`} />
            <span>Processing Batch Details</span>
        </h1>
        <p className="text-muted-foreground">Detailed information for batch: {batch.id}</p>
      </div>

       <Card>
            <CardHeader>
                <CardTitle>Batch Summary</CardTitle>
            </CardHeader>
            <CardContent>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
                    <DetailItem label="Status" value={<Badge className="text-base" variant={batch.status === 'Complete' ? 'default' : (batch.status === 'Failed' ? 'destructive' : 'secondary')}>{batch.status}</Badge>} />
                    <DetailItem label="Start Time" value={format(new Date(batch.startTime), 'PPP p')} />
                    <DetailItem label="End Time" value={batch.endTime ? format(new Date(batch.endTime), 'PPP p') : '—'} />
                    <DetailItem label="Total Duration" value={stats.duration} />
                    
                    <DetailItem label="Books in Batch" value={items.length} icon={Book} />
                    <DetailItem label="Total Pages" value={stats.totalPages.toLocaleString()} icon={FileText} />
                    <DetailItem label="Avg. Time / Book" value={stats.avgPerBook} icon={Hourglass} />
                    <DetailItem label="Avg. Time / Page" value={stats.avgPerPage} icon={Timer} />

                    <div className="col-span-full">
                        <DetailItem label="Overall Progress" value={`${batch.progress || 0}%`} />
                        <Progress value={batch.progress || 0} className="mt-2 h-2" />
                    </div>
                </div>
                {batch.info && <><Separator className="my-4"/><DetailItem label="Info" value={<p className="text-sm font-normal text-foreground">{batch.info}</p>} /></>}
                {batch.obs && <><Separator className="my-4"/><DetailItem label="Observations" value={<p className="text-sm font-normal text-foreground">{batch.obs}</p>} /></>}
            </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle>Books in Batch</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead className="text-right">Pages</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => {
                const book = books.find(b => b.id === item.bookId);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {book ? <Link href={`/books/${book.id}`} className="hover:underline">{book.name}</Link> : item.bookId}
                    </TableCell>
                    <TableCell>{book?.projectName || '—'}</TableCell>
                    <TableCell><Badge variant="secondary">{item.status}</Badge></TableCell>
                    <TableCell>{item.itemStartTime ? format(new Date(item.itemStartTime), 'p') : '—'}</TableCell>
                    <TableCell>{item.itemEndTime ? format(new Date(item.itemEndTime), 'p') : '—'}</TableCell>
                    <TableCell className="text-right">{book?.expectedDocuments.toLocaleString() || '—'}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Processing Logs</CardTitle>
          <CardDescription>Real-time log stream for this batch.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-72 w-full rounded-md border">
            <div className="p-4 font-mono text-xs">
              {logs.length > 0 ? logs.map(log => (
                <p key={log.id}>
                  <span className="text-muted-foreground">{format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss.SSS')}</span>
                  <span className={`ml-2 font-semibold ${log.level === 'ERROR' ? 'text-destructive' : (log.level === 'WARN' ? 'text-orange-500' : 'text-primary')}`}>{log.level}</span>
                  <span className="ml-2">{log.message}</span>
                </p>
              )) : <p className="text-center">No log entries for this batch yet.</p>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
