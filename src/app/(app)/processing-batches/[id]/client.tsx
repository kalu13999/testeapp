

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
import { Loader2, CheckCircle, XCircle, Clock, Book, FileText, Timer, Hourglass, Warehouse, Calendar, CheckSquare, GanttChartSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

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
    if (!batch) return { duration: 'In Progress', totalPages: 0, avgPerBook: 'N/A', avgPerPage: 'N/A', storageName: 'N/A' };
    
    const firstBook = items.length > 0 ? books.find(b => b.id === items[0].bookId) : null;
    const storageName = firstBook?.storageName || 'N/A';
    
    if(!batch.endTime) return { duration: 'In Progress', totalPages: 0, avgPerBook: 'N/A', avgPerPage: 'N/A', storageName };

    const start = new Date(batch.startTime);
    const end = new Date(batch.endTime);
    
    const totalDurationInSeconds = (end.getTime() - start.getTime()) / 1000;
    const hours = Math.floor(totalDurationInSeconds / 3600);
    const minutes = Math.floor((totalDurationInSeconds % 3600) / 60);
    const seconds = Math.floor(totalDurationInSeconds % 60);

    const durationParts = [];
    if (hours > 0) durationParts.push(`${hours}h`);
    if (minutes > 0) durationParts.push(`${minutes}m`);
    if (seconds > 0 || durationParts.length === 0) durationParts.push(`${seconds}s`);
    const duration = durationParts.join(' ');
    
    const totalPages = items.reduce((acc, item) => acc + (books.find(b => b.id === item.bookId)?.expectedDocuments || 0), 0);
    
    const avgPerBookSeconds = items.length > 0 ? totalDurationInSeconds / items.length : 0;
    const avgPerPageSeconds = totalPages > 0 ? totalDurationInSeconds / totalPages : 0;
    
    const formatAvg = (secs: number) => {
        if (secs < 1) return `${(secs * 1000).toFixed(0)}ms`;
        if (secs < 60) return `${secs.toFixed(2)}s`;
        const avgMinutes = Math.floor(secs / 60);
        const avgSeconds = Math.floor(secs % 60);
        return `${avgMinutes}m ${avgSeconds}s`;
    }
    
    return {
        duration,
        totalPages,
        avgPerBook: formatAvg(avgPerBookSeconds),
        avgPerPage: formatAvg(avgPerPageSeconds),
        storageName,
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
            <span>Detalhes do Lote em Processamento</span>
        </h1>
        <p className="text-muted-foreground">Informações detalhadas para o lote: {batch.id}</p>
      </div>

       <Card>
            <CardHeader>
                <CardTitle>Resumo do Lote</CardTitle>
            </CardHeader>
            <CardContent>
                 <div className="space-y-8">
                    {/* Group 1 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <DetailItem label="Status" icon={CheckSquare} value={<Badge className="text-base" variant={batch.status === 'Complete' ? 'default' : (batch.status === 'Failed' ? 'destructive' : 'secondary')}>{batch.status}</Badge>} />
                        <DetailItem label="Storage Location" icon={Warehouse} value={stats.storageName} />
                    </div>
                    <Separator />
                    {/* Group 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <DetailItem label="Start Time" icon={Calendar} value={format(new Date(batch.startTime), 'dd/MM/yyyy HH:mm')} />
                        <DetailItem label="End Time" icon={Calendar} value={batch.endTime ? format(new Date(batch.endTime), 'dd/MM/yyyy HH:mm') : '—'} />
                        <DetailItem label="Total Duration" icon={Timer} value={stats.duration} />
                    </div>
                    <Separator />
                    {/* Group 3 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <DetailItem label="Books in Batch" icon={Book} value={items.length} />
                        <DetailItem label="Avg. Time / Book" icon={Hourglass} value={stats.avgPerBook} />
                        <DetailItem label="Total Pages" icon={FileText} value={stats.totalPages.toLocaleString()} />
                        <DetailItem label="Avg. Time / Page" icon={Timer} value={stats.avgPerPage} />
                    </div>
                     <Separator />
                    {/* Progress */}
                    <div className="col-span-full">
                        <DetailItem label="Overall Progress" icon={GanttChartSquare} value={`${batch.progress || 0}%`} />
                        <Progress value={batch.progress || 0} className="mt-2 h-2" />
                    </div>
                </div>
                {batch.info && <><Separator className="my-4"/><DetailItem label="Info" value={<p className="text-sm font-normal text-foreground">{batch.info}</p>} /></>}
                {batch.obs && <><Separator className="my-4"/><DetailItem label="Observations" value={<p className="text-sm font-normal text-foreground">{batch.obs}</p>} /></>}
            </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle>Livros no Lote</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Livro</TableHead>
                <TableHead>Projeto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead className="text-right">Páginas</TableHead>
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
          <CardTitle>Logs de Processamento</CardTitle>
          <CardDescription>Fluxo de logs em tempo real para este lote.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-72 w-full rounded-md border">
            <div className="p-4 font-mono text-xs">
              {logs.length > 0 ? logs.map(log => (
                <p key={log.id}>
                  <span className="text-muted-foreground">{format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}</span>
                  <span className={`ml-2 font-semibold ${log.level === 'ERROR' ? 'text-destructive' : (log.level === 'WARN' ? 'text-orange-500' : 'text-primary')}`}>{log.level}</span>
                  <span className="ml-2">{log.message}</span>
                </p>
              )) : <p className="text-center">Nenhum registo encontrado para este lote ainda.</p>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
