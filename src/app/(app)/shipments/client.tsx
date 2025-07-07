
"use client"

import * as React from "react"
import * as XLSX from 'xlsx';
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
import { Send, PackageSearch, ChevronsUpDown, ArrowUp, ArrowDown, Download } from "lucide-react"
import { useAppContext, EnrichedBook } from "@/context/workflow-context"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export default function ShipmentsClient() {
  const { books, handleMarkAsShipped } = useAppContext();
  const [selection, setSelection] = React.useState<string[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const { toast } = useToast();
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([
    { id: 'name', desc: false }
  ]);
  
  const handleSort = (columnId: string, isShift: boolean) => {
    setSorting(currentSorting => {
        const existingSortIndex = currentSorting.findIndex(s => s.id === columnId);

        if (isShift) {
            let newSorting = [...currentSorting];
            if (existingSortIndex > -1) {
                if (newSorting[existingSortIndex].desc) {
                    newSorting.splice(existingSortIndex, 1);
                } else {
                    newSorting[existingSortIndex].desc = true;
                }
            } else {
                newSorting.push({ id: columnId, desc: false });
            }
            return newSorting;
        } else {
            if (currentSorting.length === 1 && currentSorting[0].id === columnId) {
                if (currentSorting[0].desc) {
                    return [];
                }
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
    
    return (
        <div className="flex items-center gap-1">
            {icon}
            {sorting.length > 1 && (
                <span className="text-xs font-bold text-muted-foreground">{sortIndex + 1}</span>
            )}
        </div>
    );
  }

  const globalSearch = (item: object, query: string) => {
    if (!query) return true;
    const lowerCaseQuery = query.toLowerCase();

    for (const key in item) {
        if (Object.prototype.hasOwnProperty.call(item, key)) {
            const value = item[key as keyof typeof item];
            if (typeof value === 'string' || typeof value === 'number') {
                if (String(value).toLowerCase().includes(lowerCaseQuery)) {
                    return true;
                }
            }
        }
    }
    return false;
  };
  
  const sortedAndFilteredBooks = React.useMemo(() => {
    let filtered = books
      .filter(book => book.status === 'Pending')
      .filter(book => globalSearch(book, query));
      
    if (sorting.length > 0) {
        filtered.sort((a, b) => {
            for (const s of sorting) {
                const key = s.id as keyof EnrichedBook;
                const valA = a[key] ?? (key === 'priority' ? 'Medium' : '');
                const valB = b[key] ?? (key === 'priority' ? 'Medium' : '');

                let result = 0;
                if (key === 'priority') {
                    const order = { 'High': 0, 'Medium': 1, 'Low': 2 };
                    result = order[valA as 'High' | 'Medium' | 'Low'] - order[valB as 'High' | 'Medium' | 'Low'];
                } else if (typeof valA === 'number' && typeof valB === 'number') {
                    result = valA - valB;
                } else {
                    result = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
                }

                if (result !== 0) {
                    return s.desc ? -result : result;
                }
            }
            return 0;
        });
    }

    return filtered;

  }, [books, query, sorting]);

  const selectedBooks = React.useMemo(() => {
    return sortedAndFilteredBooks.filter(book => selection.includes(book.id));
  }, [sortedAndFilteredBooks, selection]);

  const handleConfirmShipment = () => {
    if (selection.length > 0) {
      handleMarkAsShipped(selection);
      setSelection([]);
    }
    setIsConfirmOpen(false);
  }

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const exportJSON = (data: EnrichedBook[]) => {
    if (data.length === 0) return;
    const jsonString = JSON.stringify(data, null, 2);
    downloadFile(jsonString, 'shipment_export.json', 'application/json');
    toast({ title: "Export Successful", description: `${data.length} books exported as JSON.` });
  }

  const exportCSV = (data: EnrichedBook[]) => {
    if (data.length === 0) return;
    const headers = ['id', 'name', 'projectName', 'expectedDocuments', 'priority'];
    const csvContent = [
        headers.join(','),
        ...data.map(book => 
            headers.map(header => {
                let value = book[header as keyof EnrichedBook] ?? '';
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');
    downloadFile(csvContent, 'shipment_export.csv', 'text/csv;charset=utf-8;');
    toast({ title: "Export Successful", description: `${data.length} books exported as CSV.` });
  }

  const exportXLSX = (data: EnrichedBook[]) => {
    if (data.length === 0) return;
    const exportableData = data.map(({ id, name, projectName, expectedDocuments, priority }) => ({ id, name, projectName, expectedDocuments, priority }));
    const worksheet = XLSX.utils.json_to_sheet(exportableData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Shipment");
    XLSX.writeFile(workbook, "shipment_export.xlsx");
    toast({ title: "Export Successful", description: `${data.length} books exported as XLSX.` });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
              <div>
                  <CardTitle className="font-headline">Prepare Shipment</CardTitle>
                  <CardDescription>Select the books you are sending to us and mark them as shipped.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="h-9 gap-1">
                            <Download className="h-3.5 w-3.5" />
                            <span>Export</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Export Selected ({selection.length})</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => exportXLSX(selectedBooks)} disabled={selection.length === 0}>Export as XLSX</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => exportJSON(selectedBooks)} disabled={selection.length === 0}>Export as JSON</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => exportCSV(selectedBooks)} disabled={selection.length === 0}>Export as CSV</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button 
                    disabled={selection.length === 0}
                    onClick={() => setIsConfirmOpen(true)}
                >
                    <Send className="mr-2 h-4 w-4" />
                    Mark {selection.length > 0 ? selection.length : ''} Book(s) as Shipped
                </Button>
              </div>
          </div>
          <div className="pt-4">
              <Input
                placeholder="Search all columns..."
                className="max-w-sm"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
          </div>
        </CardHeader>
        <CardContent>
          {sortedAndFilteredBooks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                      <Checkbox
                          checked={sortedAndFilteredBooks.length > 0 && selection.length === sortedAndFilteredBooks.length}
                          onCheckedChange={(checked) => setSelection(checked ? sortedAndFilteredBooks.map(item => item.id) : [])}
                          aria-label="Select all"
                      />
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('name', e.shiftKey)}>
                      Book Name {getSortIndicator('name')}
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('projectName', e.shiftKey)}>
                      Project {getSortIndicator('projectName')}
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('expectedDocuments', e.shiftKey)}>
                      Expected Pages {getSortIndicator('expectedDocuments')}
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('priority', e.shiftKey)}>
                      Priority {getSortIndicator('priority')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAndFilteredBooks.map((book, index) => (
                    <TableRow key={book.id} data-state={selection.includes(book.id) && "selected"}>
                    <TableCell>
                        <Checkbox
                            checked={selection.includes(book.id)}
                            onCheckedChange={(checked) => setSelection(
                                checked ? [...selection, book.id] : selection.filter((id) => id !== book.id)
                            )}
                            aria-label={`Select row ${index + 1}`}
                        />
                    </TableCell>
                    <TableCell className="font-medium">{book.name}</TableCell>
                    <TableCell>{book.projectName}</TableCell>
                    <TableCell className="text-center">{book.expectedDocuments}</TableCell>
                    <TableCell>{book.priority || "Medium"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-20 text-muted-foreground flex flex-col items-center gap-4">
                <PackageSearch className="h-16 w-16" />
                <h3 className="text-xl font-semibold">All Caught Up!</h3>
                <p>You have no pending books to ship.</p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            {selection.length > 0 ? `${selection.length} book(s) selected.` : `Showing ${sortedAndFilteredBooks.length} pending books.`}
          </div>
        </CardFooter>
      </Card>
      
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Shipment</AlertDialogTitle>
                <AlertDialogDescription>
                    You are about to mark {selection.length} book(s) as shipped. Our team will be notified to expect their arrival. Are you sure?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmShipment}>Confirm and Ship</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
