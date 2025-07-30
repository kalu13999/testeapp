

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
import { PlusCircle, X, ListPlus, PlayCircle, BookOpen, ChevronsUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { useAppContext } from "@/context/workflow-context"
import type { EnrichedBook } from "@/lib/data"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface ReadyForProcessingClientProps {
  stage: string;
  config: {
    title: string;
    description: string;
    emptyStateText: string;
    dataStatus?: string;
  };
}

export default function ReadyForProcessingClient({ config }: ReadyForProcessingClientProps) {
  const { books, startProcessingBatch, selectedProjectId, storages } = useAppContext();
  const [selection, setSelection] = React.useState<string[]>([]);
  const [multiSelection, setMultiSelection] = React.useState<string[]>([]);
  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({});
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([
    { id: 'name', desc: false }
  ]);
  const [selectedStorageId, setSelectedStorageId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (storages.length > 0 && !selectedStorageId) {
      setSelectedStorageId(storages[0].id);
    }
  }, [storages, selectedStorageId]);

  React.useEffect(() => {
    setSelection([]);
    setMultiSelection([]);
  }, [selectedStorageId]);


  const handleColumnFilterChange = (columnId: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [columnId]: value }));
  };

  const handleClearFilters = () => {
    setColumnFilters({});
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

  const availableBooks = React.useMemo(() => {
    let baseBooks = books.filter(book => book.status === config.dataStatus);
    
    if (selectedStorageId) {
      baseBooks = baseBooks.filter(book => book.storageName === storages.find(s => s.id === selectedStorageId)?.nome);
    } else {
      return [];
    }
    
    if (selectedProjectId) {
      baseBooks = baseBooks.filter(book => book.projectId === selectedProjectId);
    }
    
    let filtered = baseBooks;
    Object.entries(columnFilters).forEach(([columnId, value]) => {
      if (value) {
        filtered = filtered.filter(book => {
          const bookValue = book[columnId as keyof EnrichedBook];
          return String(bookValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    });
    
    if (sorting.length > 0) {
        filtered.sort((a, b) => {
            const s = sorting[0];
            const valA = a[s.id as keyof EnrichedBook];
            const valB = b[s.id as keyof EnrichedBook];

            let result = 0;
            if (typeof valA === 'number' && typeof valB === 'number') {
                result = valA - valB;
            } else {
                result = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
            }
            if (result !== 0) {
                return s.desc ? -result : result;
            }
            return 0;
        });
    }

    return filtered;
  }, [books, config.dataStatus, selectedProjectId, columnFilters, sorting, selectedStorageId, storages]);

  const selectedBooksInfo = React.useMemo(() => {
      return selection.map(id => books.find(b => b.id === id)).filter((b): b is EnrichedBook => !!b);
  }, [selection, books]);

  const totalSelectedPages = React.useMemo(() => {
    return selectedBooksInfo.reduce((sum, book) => sum + book.expectedDocuments, 0);
  }, [selectedBooksInfo]);
  
  const toggleSelection = (bookId: string) => {
    setSelection(prev => 
        prev.includes(bookId) ? prev.filter(id => id !== bookId) : [...prev, bookId]
    );
  }

  const handleStartProcess = () => {
    startProcessingBatch(selection);
    setSelection([]);
  }

  const handleAddMultiple = () => {
    setSelection(prev => [...new Set([...prev, ...multiSelection])]);
    setMultiSelection([]);
  }

  const toggleAllMultiSelection = () => {
    if (multiSelection.length === availableBooks.filter(b => !selection.includes(b.id)).length) {
      setMultiSelection([]);
    } else {
      setMultiSelection(availableBooks.filter(b => !selection.includes(b.id)).map(b => b.id));
    }
  }

  const availableForMultiSelectCount = availableBooks.filter(b => !selection.includes(b.id)).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>{config.title}</CardTitle>
                    <CardDescription>{config.description}</CardDescription>
                </div>
                 <Button 
                    variant="secondary" 
                    size="sm" 
                    disabled={multiSelection.length === 0}
                    onClick={handleAddMultiple}
                >
                    <ListPlus className="mr-2 h-4 w-4" />
                    Add to Batch
                </Button>
            </div>
            <div className="pt-4">
              <Label htmlFor="storage-select">Storage Location</Label>
               <Select value={selectedStorageId || ''} onValueChange={setSelectedStorageId}>
                  <SelectTrigger id="storage-select" className="w-[300px]">
                      <SelectValue placeholder="Select a storage..." />
                  </SelectTrigger>
                  <SelectContent>
                      {storages.map(storage => (
                          <SelectItem key={storage.id} value={storage.id}>{storage.nome}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                      <Checkbox
                        onCheckedChange={toggleAllMultiSelection}
                        checked={multiSelection.length > 0 && multiSelection.length === availableForMultiSelectCount}
                        disabled={availableForMultiSelectCount === 0}
                      />
                  </TableHead>
                  <TableHead className="w-[120px]">Action</TableHead>
                  <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('name')}>Book Name {getSortIndicator('name')}</div></TableHead>
                  <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('projectName')}>Project {getSortIndicator('projectName')}</div></TableHead>
                  <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={() => handleSort('storageName')}>Storage {getSortIndicator('storageName')}</div></TableHead>
                  <TableHead className="text-right"><div className="flex items-center justify-end gap-2 cursor-pointer select-none group" onClick={() => handleSort('expectedDocuments')}>Pages {getSortIndicator('expectedDocuments')}</div></TableHead>
                </TableRow>
                 <TableRow>
                    <TableHead />
                    <TableHead />
                    <TableHead>
                        <Input placeholder="Filter by name..." value={columnFilters['name'] || ''} onChange={(e) => handleColumnFilterChange('name', e.target.value)} className="h-8"/>
                    </TableHead>
                     <TableHead>
                        <Input placeholder="Filter by project..." value={columnFilters['projectName'] || ''} onChange={(e) => handleColumnFilterChange('projectName', e.target.value)} className="h-8"/>
                    </TableHead>
                     <TableHead>
                        <Input placeholder="Filter by storage..." value={columnFilters['storageName'] || ''} onChange={(e) => handleColumnFilterChange('storageName', e.target.value)} className="h-8"/>
                    </TableHead>
                    <TableHead className="text-right">
                        <div className="flex items-center justify-end gap-2">
                             <Input placeholder="Pages..." value={columnFilters['expectedDocuments'] || ''} onChange={(e) => handleColumnFilterChange('expectedDocuments', e.target.value)} className="h-8 w-24 text-right"/>
                             <Button variant="ghost" size="sm" onClick={handleClearFilters} disabled={Object.values(columnFilters).every(v => !v)}>Clear</Button>
                        </div>
                    </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableBooks.length > 0 ? (
                  availableBooks.map(book => {
                    const isSelected = selection.includes(book.id);
                    return (
                        <TableRow key={book.id} data-state={isSelected ? "selected" : ""}>
                          <TableCell>
                            <Checkbox
                              checked={multiSelection.includes(book.id)}
                              onCheckedChange={() => {
                                setMultiSelection(prev => 
                                  prev.includes(book.id) 
                                    ? prev.filter(id => id !== book.id)
                                    : [...prev, book.id]
                                );
                              }}
                              disabled={isSelected}
                            />
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              variant={isSelected ? "destructive" : "outline"}
                              onClick={() => toggleSelection(book.id)}
                              className="w-[100px]"
                            >
                              {isSelected ? (
                                <X className="mr-2 h-4 w-4" />
                              ) : (
                                <PlusCircle className="mr-2 h-4 w-4" />
                              )}
                              {isSelected ? 'Remove' : 'Add'}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">
                            <Link href={`/books/${book.id}`} className="hover:underline">{book.name}</Link>
                          </TableCell>
                          <TableCell>{book.projectName}</TableCell>
                          <TableCell>{book.storageName || 'N/A'}</TableCell>
                          <TableCell className="text-right">{book.expectedDocuments}</TableCell>
                        </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        <p>{!selectedStorageId ? "Please select a storage location to view books." : (Object.values(columnFilters).some(v=>v) ? "No books match your filters." : config.emptyStateText)}</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1 sticky top-20">
        <AnimatePresence>
        {selection.length > 0 && (
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
            >
                <Card className="bg-secondary/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ListPlus className="h-5 w-5"/>
                            Processing Batch
                        </CardTitle>
                        <CardDescription>
                            {selection.length} book(s) selected for processing.
                            Total pages: {totalSelectedPages.toLocaleString()}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                           {selectedBooksInfo.map(book => (
                               <div key={book.id} className="flex items-center justify-between p-2 rounded-md bg-background text-sm">
                                    <div>
                                        <p className="font-medium">{book.name}</p>
                                        <p className="text-xs text-muted-foreground">{book.projectName}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleSelection(book.id)}>
                                        <X className="h-4 w-4"/>
                                    </Button>
                               </div>
                           ))}
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                        <Button className="w-full" onClick={handleStartProcess}>
                            <PlayCircle className="mr-2 h-4 w-4" />
                            Start Processing Batch
                        </Button>
                         <Button variant="outline" className="w-full" onClick={() => setSelection([])}>
                            Clear Selection
                        </Button>
                    </CardFooter>
                </Card>
            </motion.div>
        )}
        </AnimatePresence>
         {selection.length === 0 && (
              <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-4 border-2 border-dashed rounded-lg">
                  <BookOpen className="h-12 w-12"/>
                  <h3 className="font-semibold">No Books Selected</h3>
                  <p className="text-sm">Add books from the table to create a new processing batch.</p>
              </div>
        )}
      </div>
    </div>
  )
}
