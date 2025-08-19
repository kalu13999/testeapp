
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
import { BarChart2, BookCheck, ChevronsUpDown, ArrowUp, ArrowDown, HelpCircle, Save, Info } from "lucide-react"
import { useAppContext } from "@/context/workflow-context"
import { Input } from "@/components/ui/input"
import { type ProjectStorage, type EnrichedBook } from "@/lib/data"
import { useToast } from "@/hooks/use-toast"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { subDays, format, isSameDay, startOfDay } from 'date-fns'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"


type EditableAssociation = ProjectStorage & {
  projectName: string;
  storageName: string;
}

export default function DistributionHubClient() {
  const { transferLogs, projectStorages, allProjects, storages, updateProjectStorage, selectedProjectId, books } = useAppContext();
  const { toast } = useToast();

  const [editableData, setEditableData] = React.useState<EditableAssociation[]>([]);
  const [dirtyRows, setDirtyRows] = React.useState<Set<string>>(new Set());
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({});
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([{ id: 'projectName', desc: false }]);

  React.useEffect(() => {
    let relevantProjectStorages = projectStorages || [];
    if (selectedProjectId) {
      relevantProjectStorages = relevantProjectStorages.filter(ps => ps.projectId === selectedProjectId);
    }
    
    const enrichedData = relevantProjectStorages.map(ps => {
      const project = allProjects.find(p => p.id === ps.projectId);
      const storage = storages.find(s => s.id === ps.storageId);
      return {
        ...ps,
        projectName: project?.name || 'Unknown Project',
        storageName: storage?.nome || 'Unknown Storage',
      };
    });
    setEditableData(enrichedData);
    setDirtyRows(new Set()); // Clear dirty state on project change
  }, [projectStorages, allProjects, storages, selectedProjectId]);

  const productivityStats = React.useMemo(() => {
    const projectBookIds = selectedProjectId 
        ? new Set(books.filter(b => b.projectId === selectedProjectId).map(b => b.id))
        : null;

    const relevantLogs = (transferLogs || []).filter(log => 
        !projectBookIds || projectBookIds.has(log.bookId)
    );

    const today = startOfDay(new Date());
    const logsToday = relevantLogs.filter(log => isSameDay(new Date(log.data_fim), today));
    
    const pagesToday = logsToday.reduce((sum, log) => sum + log.total_tifs, 0);
    const booksToday = new Set(logsToday.map(log => log.bookId)).size;

    const sevenDaysAgo = startOfDay(subDays(today, 6));
    const last7DaysLogs = relevantLogs.filter(log => new Date(log.data_fim) >= sevenDaysAgo);
    
    const pagesByDay = Array.from({ length: 7 }, (_, i) => {
        const day = subDays(today, i);
        const dayLogs = last7DaysLogs.filter(log => isSameDay(new Date(log.data_fim), day));
        return {
            date: format(day, 'MMM d'),
            pages: dayLogs.reduce((sum, log) => sum + log.total_tifs, 0)
        };
    }).reverse();

    return { pagesToday, booksToday, pagesByDay };
  }, [transferLogs, selectedProjectId, books]);
  
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

  return (
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Books Completed Today</CardTitle><BookCheck className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{productivityStats.booksToday.toLocaleString()}</div></CardContent>
        </Card>
      </div>

       <Card>
          <CardHeader>
              <CardTitle>Daily Scanning Productivity (Last 7 Days)</CardTitle>
              <CardDescription>Total pages scanned per day for the selected scope.</CardDescription>
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
  )
}
