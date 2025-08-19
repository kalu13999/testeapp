
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
import { BarChart2, BookCheck, ChevronsUpDown, ArrowUp, ArrowDown, HelpCircle, Save, Info, BookUp, FileStack } from "lucide-react"
import { useAppContext } from "@/context/workflow-context"
import { Input } from "@/components/ui/input"
import { type ProjectStorage, type EnrichedBook } from "@/lib/data"
import { useToast } from "@/hooks/use-toast"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { subDays, format, isSameDay, startOfDay } from 'date-fns'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

type EditableAssociation = ProjectStorage & {
  projectName: string;
  storageName: string;
}

const getStatusBadgeVariant = (status: string) => {
    switch (status) {
        case 'Complete': case 'Finalized': case 'Archived': return 'default';
        case 'In Processing': case 'Scanning Started': case 'Indexing Started': case 'Checking Started': return 'secondary';
        case 'Client Rejected': return 'destructive';
        default: return 'outline';
    }
}

export default function DistributionHubClient() {
  const { allProjects, storages, updateProjectStorage, selectedProjectId } = useAppContext();
  const { toast } = useToast();

  const [editableData, setEditableData] = React.useState<EditableAssociation[]>([]);
  const [dirtyRows, setDirtyRows] = React.useState<Set<string>>(new Set());
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({});
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([{ id: 'projectName', desc: false }]);
  const [dialogState, setDialogState] = React.useState<{ open: boolean, title: string, items: EnrichedBook[] }>({ open: false, title: '', items: [] });
  const [dialogFilter, setDialogFilter] = React.useState('');

  React.useEffect(() => {
    if (!allProjects || !storages) return;

    let relevantProjectStorages: EditableAssociation[] = [];
    
    if (selectedProjectId) {
      const project = allProjects.find(p => p.id === selectedProjectId);
      if (project && project.storages) {
        relevantProjectStorages = project.storages.map(s => ({
            ...s,
            projectName: project.name,
            storageName: storages.find(st => st.id === s.storageId)?.nome || 'Unknown Storage'
        }));
      }
    } else {
        relevantProjectStorages = allProjects.flatMap(p => 
            (p.storages || []).map(s => ({
                ...s,
                projectName: p.name,
                storageName: storages.find(st => st.id === s.storageId)?.nome || 'Unknown Storage'
            }))
        );
    }
    
    setEditableData(relevantProjectStorages);
    setDirtyRows(new Set());
  }, [allProjects, storages, selectedProjectId]);

  const productivityStats = React.useMemo(() => {
    const relevantBooks = selectedProjectId
      ? allProjects.find(p => p.id === selectedProjectId)?.books || []
      : allProjects.flatMap(p => p.books);

    const completedScans = (relevantBooks || []).filter(book => !!book.scanEndTime);
    
    const scansToday = completedScans.filter(book => isSameDay(new Date(book.scanEndTime!), new Date()));
    const pagesToday = scansToday.reduce((sum, book) => sum + (book.expectedDocuments || 0), 0);
    const booksToday = scansToday.length;
    
    const booksReadyToDistribute = relevantBooks.filter(book => book.status === 'Scanning Started' && !!book.scanEndTime);
    const pagesReadyToDistribute = booksReadyToDistribute.reduce((sum, book) => sum + (book.expectedDocuments || 0), 0);

    const sevenDaysAgo = startOfDay(subDays(new Date(), 6));
    const last7DaysScans = completedScans.filter(book => new Date(book.scanEndTime!) >= sevenDaysAgo);
    
    const pagesByDay = Array.from({ length: 7 }, (_, i) => {
      const day = subDays(new Date(), i);
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayScans = last7DaysScans.filter(book => format(new Date(book.scanEndTime!), 'yyyy-MM-dd') === dayStr);
      return {
        date: format(day, 'MMM d'),
        pages: dayScans.reduce((sum, book) => sum + (book.expectedDocuments || 0), 0)
      };
    }).reverse();

    return { 
      pagesToday, 
      booksToday, 
      scansToday,
      pagesByDay,
      booksReadyToDistribute,
      pagesReadyToDistribute,
    };
  }, [allProjects, selectedProjectId]);
  
  const chartConfig = { pages: { label: "Pages", color: "hsl(var(--primary))" } } satisfies ChartConfig;

  const handleInputChange = (projectId: string, storageId: number, field: keyof ProjectStorage, value: string) => {
    const numericValue = Number(value);
    if (isNaN(numericValue)) return;
    
    setEditableData(prevData =>
      prevData.map(row =>
        row.projectId === projectId && row.storageId === storageId
          ? { ...row, [field]: numericValue }
          : row
      )
    );
    setDirtyRows(prev => new Set(prev).add(`${projectId}-${storageId}`));
  };

  const handleSaveChanges = async () => {
    const updates = Array.from(dirtyRows).map(key => {
      const [projectId, storageId] = key.split('-');
      return editableData.find(d => d.projectId === projectId && d.storageId === Number(storageId));
    }).filter((item): item is EditableAssociation => !!item);
    
    await Promise.all(updates.map(item => updateProjectStorage(item)));

    setDirtyRows(new Set());
    toast({ title: "Changes Saved", description: "All distribution rules have been updated." });
  };
  
  const handleSort = (columnId: string) => {
    setSorting(currentSorting => {
      if (currentSorting.length > 0 && currentSorting[0].id === columnId) {
        return [{ id: columnId, desc: !currentSorting[0].desc }];
      }
      return [{ id: columnId, desc: false }];
    });
  };

  const getSortIndicator = (columnId: string) => {
    const sort = sorting.find(s => s.id === columnId);
    if (!sort) return <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-0 group-hover:opacity-50" />;
    return sort.desc ? <ArrowDown className="h-4 w-4 shrink-0" /> : <ArrowUp className="h-4 w-4 shrink-0" />;
  };

  const sortedAndFilteredData = React.useMemo(() => {
    let filtered = [...editableData];
    Object.entries(columnFilters).forEach(([columnId, value]) => {
      if (value) {
        filtered = filtered.filter(item => {
          const itemValue = item[columnId as keyof EditableAssociation];
          return String(itemValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    });
    
    if (sorting.length > 0) {
      filtered.sort((a, b) => {
        const s = sorting[0];
        const valA = a[s.id as keyof EditableAssociation];
        const valB = b[s.id as keyof EditableAssociation];
        const result = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
        return s.desc ? -result : result;
      });
    }

    return filtered;
  }, [editableData, columnFilters, sorting]);

  const handleKpiClick = (title: string, items: EnrichedBook[]) => {
    if (!items || items.length === 0) return;
    setDialogFilter('');
    setDialogState({ open: true, title, items });
  }

  const filteredDialogItems = React.useMemo(() => {
    if (!dialogFilter) return dialogState.items;
    const query = dialogFilter.toLowerCase();
    return dialogState.items.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.projectName.toLowerCase().includes(query) ||
      p.status.toLowerCase().includes(query)
    );
  }, [dialogState.items, dialogFilter]);

  return (
    <>
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Distribution Hub</h1>
        <p className="text-muted-foreground">Monitor daily scanning productivity and adjust workload distribution rules.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Pages Scanned Today</CardTitle><BarChart2 className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{productivityStats.pagesToday.toLocaleString()}</div></CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleKpiClick('Books Scanned Today', productivityStats.scansToday)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Books Scanned Today</CardTitle><BookCheck className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{productivityStats.booksToday.toLocaleString()}</div></CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleKpiClick('Books Ready to Distribute', productivityStats.booksReadyToDistribute)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Books Ready to Distribute</CardTitle><BookUp className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{productivityStats.booksReadyToDistribute.length}</div></CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleKpiClick('Pages Ready to Distribute', productivityStats.booksReadyToDistribute)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Pages Ready to Distribute</CardTitle><FileStack className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{productivityStats.pagesReadyToDistribute.toLocaleString()}</div></CardContent>
        </Card>
      </div>

       <Card>
          <CardHeader>
              <CardTitle>Daily Scanning Productivity (Last 7 Days)</CardTitle>
              <CardDescription>Total pages from books that completed the scanning phase per day.</CardDescription>
          </CardHeader>
          <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <BarChart data={productivityStats.pagesByDay} margin={{ top: 20 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltipContent />} />
                      <Bar dataKey="pages" fill="var(--color-pages)" radius={4} />
                  </BarChart>
              </ChartContainer>
          </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <Card className="lg:col-span-2">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Distribution Rules</CardTitle>
                        <CardDescription>
                            {selectedProjectId 
                                ? "Adjust distribution rules for the selected project."
                                : "Adjust global distribution rules. Select a project to see its specific rules."
                            }
                        </CardDescription>
                    </div>
                    <Button onClick={handleSaveChanges} disabled={dirtyRows.size === 0}>
                        <Save className="mr-2 h-4 w-4"/>
                        Save Changes {dirtyRows.size > 0 && `(${dirtyRows.size})`}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('projectName')}>Project {getSortIndicator('projectName')}</div></TableHead>
                            <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('storageName')}>Storage {getSortIndicator('storageName')}</div></TableHead>
                            <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('peso')}>Weight {getSortIndicator('peso')}</div></TableHead>
                            <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('minimo_diario_fixo')}>Fixed Min {getSortIndicator('minimo_diario_fixo')}</div></TableHead>
                            <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('percentual_minimo_diario')}>% Min {getSortIndicator('percentual_minimo_diario')}</div></TableHead>
                        </TableRow>
                         <TableRow>
                          <TableHead><Input placeholder="Filter project..." value={columnFilters['projectName'] || ''} onChange={e => setColumnFilters(p => ({...p, projectName: e.target.value}))} className="h-8"/></TableHead>
                          <TableHead><Input placeholder="Filter storage..." value={columnFilters['storageName'] || ''} onChange={e => setColumnFilters(p => ({...p, storageName: e.target.value}))} className="h-8"/></TableHead>
                          <TableHead colSpan={3} />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedAndFilteredData.length > 0 ? sortedAndFilteredData.map((item) => (
                            <TableRow key={`${item.projectId}-${item.storageId}`}>
                                <TableCell className="font-medium">{item.projectName}</TableCell>
                                <TableCell>{item.storageName}</TableCell>
                                <TableCell><Input type="number" value={item.peso} onChange={(e) => handleInputChange(item.projectId, item.storageId, 'peso', e.target.value)} className="w-20 h-8"/></TableCell>
                                <TableCell><Input type="number" value={item.minimo_diario_fixo} onChange={(e) => handleInputChange(item.projectId, item.storageId, 'minimo_diario_fixo', e.target.value)} className="w-24 h-8"/></TableCell>
                                <TableCell><Input type="number" value={item.percentual_minimo_diario} onChange={(e) => handleInputChange(item.projectId, item.storageId, 'percentual_minimo_diario', e.target.value)} className="w-24 h-8"/></TableCell>
                            </TableRow>
                        )) : (
                           <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No distribution rules found for the selected project.
                            </TableCell>
                           </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <Card className="lg:col-span-1 sticky top-20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><HelpCircle className="h-5 w-5"/>How Distribution Works</CardTitle>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible defaultValue="item-1">
                    <AccordionItem value="item-1">
                        <AccordionTrigger className="text-base">Distribution Priority</AccordionTrigger>
                        <AccordionContent className="text-sm space-y-2">
                           <p>The system prioritizes filling fixed minimums first. If a storage location is below its <strong className="text-foreground">Daily Fixed Minimum</strong> of pages, it will receive books until that number is met.</p>
                           <p>After all fixed minimums are met, the system then considers the <strong className="text-foreground">Daily Percent Minimum</strong> to balance distribution across storages.</p>
                        </AccordionContent>
                    </AccordionItem>
                     <AccordionItem value="item-2">
                        <AccordionTrigger className="text-base">Distribution Weight</AccordionTrigger>
                        <AccordionContent className="text-sm">
                           Once all minimums are satisfied, the <strong className="text-foreground">Weight</strong> value is used. Storages with a higher weight will receive proportionally more books. For example, a storage with a weight of 2 will receive twice as many books as one with a weight of 1.
                        </AccordionContent>
                    </AccordionItem>
                     <AccordionItem value="item-3">
                        <AccordionTrigger className="text-base">Example Scenario</AccordionTrigger>
                        <AccordionContent className="text-sm space-y-2">
                            <p><strong>Storage A:</strong> Fixed Min: 1000, Weight: 1</p>
                            <p><strong>Storage B:</strong> Fixed Min: 500, Weight: 2</p>
                            <p>The system will first send 1000 pages to Storage A and 500 to Storage B. After that, for every 3 books distributed, Storage A will get 1 and Storage B will get 2.</p>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
      </div>
    </div>
    <Dialog open={dialogState.open} onOpenChange={(open) => { if (!open) setDialogFilter(''); setDialogState(prev => ({ ...prev, open })); }}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>{dialogState.title}</DialogTitle>
                <DialogDescription>Showing {filteredDialogItems.length} of {dialogState.items.length} books.</DialogDescription>
            </DialogHeader>
            <div className="py-2">
                <Input 
                    placeholder="Filter books..."
                    value={dialogFilter}
                    onChange={(e) => setDialogFilter(e.target.value)}
                />
            </div>
            <div className="max-h-[60vh] overflow-y-auto pr-4">
                 <Table>
                    <TableHeader>
                      <TableRow>
                          <TableHead>Book</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredDialogItems.length > 0 ? filteredDialogItems.map(book => (
                            <TableRow key={book.id}>
                                <TableCell><Link href={`/books/${book.id}`} className="hover:underline font-medium">{book.name}</Link></TableCell>
                                <TableCell>{book.projectName}</TableCell>
                                <TableCell>{book.clientName}</TableCell>
                                <TableCell><Badge variant={getStatusBadgeVariant(book.status)}>{book.status}</Badge></TableCell>
                            </TableRow>
                        )) : (
                           <TableRow>
                              <TableCell colSpan={4} className="h-24 text-center">
                                  No items match the filter.
                              </TableCell>
                           </TableRow>
                        )}
                    </TableBody>
                 </Table>
            </div>
        </DialogContent>
    </Dialog>
    </>
  )
}
