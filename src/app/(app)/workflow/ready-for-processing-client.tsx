
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
import { PlusCircle, X, ListPlus, PlayCircle, BookOpen } from "lucide-react"
import { useAppContext } from "@/context/workflow-context"
import type { EnrichedBook } from "@/lib/data"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { AnimatePresence, motion } from "framer-motion"
import { Checkbox } from "@/components/ui/checkbox"

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
  const { books, startProcessingBatch, selectedProjectId } = useAppContext();
  const [selection, setSelection] = React.useState<string[]>([]);
  const [multiSelection, setMultiSelection] = React.useState<string[]>([]);
  const [filter, setFilter] = React.useState("");

  const availableBooks = React.useMemo(() => {
    let baseBooks = books.filter(book => book.status === config.dataStatus);
    if (selectedProjectId) {
      baseBooks = baseBooks.filter(book => book.projectId === selectedProjectId);
    }
    
    if (filter) {
        baseBooks = baseBooks.filter(book => 
            book.name.toLowerCase().includes(filter.toLowerCase()) ||
            book.projectName.toLowerCase().includes(filter.toLowerCase())
        );
    }
    return baseBooks;
  }, [books, config.dataStatus, selectedProjectId, filter]);

  const selectedBooksInfo = React.useMemo(() => {
      return selection.map(id => books.find(b => b.id === id)).filter((b): b is EnrichedBook => !!b);
  }, [selection, books]);
  
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
            <CardTitle>{config.title}</CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex justify-between items-center mb-4">
                <Input 
                    placeholder="Filter books by name or project..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="max-w-sm"
                />
                <Button 
                    variant="secondary" 
                    size="sm" 
                    disabled={multiSelection.length === 0}
                    onClick={handleAddMultiple}
                >
                    <ListPlus className="mr-2 h-4 w-4" />
                    Add {multiSelection.length} Selected to Batch
                </Button>
             </div>
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
                  <TableHead className="w-[80px]">Action</TableHead>
                  <TableHead>Book Name</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Pages</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableBooks.length > 0 ? (
                  availableBooks.map(book => {
                    const isSelected = selection.includes(book.id);
                    return (
                        <TableRow key={book.id}>
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
                          <TableCell className="text-right">{book.expectedDocuments}</TableCell>
                        </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        <p>{config.emptyStateText}</p>
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
