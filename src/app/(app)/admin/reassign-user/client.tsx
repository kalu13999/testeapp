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
import { Sliders, ArrowUp, ArrowDown, ChevronsUpDown, UserCog } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { type EnrichedBook, type User } from "@/lib/data"
import { useAppContext } from "@/context/workflow-context"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge"

const ITEMS_PER_PAGE = 100;
const ASSIGNABLE_STATUSES = ['To Scan', 'Scanning Started', 'To Indexing', 'Indexing Started', 'To Checking', 'Checking Started'];
type AssignmentRole = 'scanner' | 'indexer' | 'qc';

export default function ReassignUserClient() {
  const { books, users, reassignUser, permissions } = useAppContext();
  const [dialogState, setDialogState] = React.useState<{ open: boolean; book?: EnrichedBook, role?: AssignmentRole }>({ open: false });
  const [newUserId, setNewUserId] = React.useState('');
  const { toast } = useToast();

  const [columnFilters, setColumnFilters] = React.useState<{ [key: string]: string }>({});
  const [currentPage, setCurrentPage] = React.useState(1);
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([
    { id: 'name', desc: false }
  ]);
  
  const handleColumnFilterChange = (columnId: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [columnId]: value }));
    setCurrentPage(1);
  };
  
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
                if (currentSorting[0].desc) { return []; }
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
            {sorting.length > 1 && (<span className="text-xs font-bold text-muted-foreground">{sortIndex + 1}</span>)}
        </div>
    );
  }

  const handleClearFilters = () => {
    setColumnFilters({});
    setCurrentPage(1);
  };
  
  /*const assignableBooks = React.useMemo(() => {
    return books
      .filter(book => ASSIGNABLE_STATUSES.includes(book.status))
      .map(book => {
        const scannerName = users.find(u => u.id === book.scannerUserId)?.name;
        const indexerName = users.find(u => u.id === book.indexerUserId)?.name;
        const qcName = users.find(u => u.id === book.qcUserId)?.name;
        return { ...book, scannerName, indexerName, qcName };
      });
  }, [books, users]);*/



  const [assignableBooks, setAssignableBooks] = React.useState<(EnrichedBook & {
    scannerName?: string;
    indexerName?: string;
    qcName?: string;
  })[]>([]);

  React.useEffect(() => {
    const enriched = books
      .filter(book => ASSIGNABLE_STATUSES.includes(book.status))
      .map(book => {
        const scannerName = users.find(u => u.id === book.scannerUserId)?.name;
        const indexerName = users.find(u => u.id === book.indexerUserId)?.name;
        const qcName = users.find(u => u.id === book.qcUserId)?.name;
        return { ...book, scannerName, indexerName, qcName };
      });

    setAssignableBooks(enriched);
  }, [books, users]);


    const sortedAndFilteredBooks = React.useMemo(() => {
    let filtered = assignableBooks;
    Object.entries(columnFilters).forEach(([columnId, value]) => {
      if (value) {
        filtered = filtered.filter(book => {
          const bookValue = book[columnId as keyof typeof book];
          return String(bookValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    if (sorting.length > 0) {
        filtered.sort((a, b) => {
            for (const s of sorting) {
                const key = s.id as keyof typeof a;
                const valA = a[key];
                const valB = b[key];
                let result = 0;
                if (valA === null || valA === undefined) result = -1;
                else if (valB === null || valB === undefined) result = 1;
                else if (typeof valA === 'number' && typeof valB === 'number') {
                    result = valA - valB;
                } else {
                    result = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
                }
                if (result !== 0) return s.desc ? -result : result;
            }
            return 0;
        });
    }

    return filtered;
  }, [assignableBooks, columnFilters, sorting]);

  /*const [sortedAndFilteredBooks, setSortedAndFilteredBooks] = React.useState<typeof assignableBooks>([]);

  React.useEffect(() => {
    let filtered = assignableBooks;

    Object.entries(columnFilters).forEach(([columnId, value]) => {
      if (value) {
        filtered = filtered.filter(book => {
          const bookValue = book[columnId as keyof typeof book];
          return String(bookValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    if (sorting.length > 0) {
      filtered = [...filtered].sort((a, b) => {
        for (const s of sorting) {
          const key = s.id as keyof typeof a;
          const valA = a[key];
          const valB = b[key];

          let result = 0;
          if (valA === null || valA === undefined) result = -1;
          else if (valB === null || valB === undefined) result = 1;
          else if (typeof valA === 'number' && typeof valB === 'number') {
            result = valA - valB;
          } else {
            result = String(valA).localeCompare(String(valB), undefined, {
              numeric: true,
              sensitivity: 'base',
            });
          }

          if (result !== 0) return s.desc ? -result : result;
        }
        return 0;
      });
    }

    setSortedAndFilteredBooks(filtered);
  }, [assignableBooks, columnFilters, sorting]);*/


  const totalPages = Math.ceil(sortedAndFilteredBooks.length / ITEMS_PER_PAGE);
  const paginatedBooks = sortedAndFilteredBooks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const PaginationNav = () => {
    if (totalPages <= 1) return null;
    const pageNumbers: number[] = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
        for (let i = 1; i <= totalPages; i++) { pageNumbers.push(i); }
    } else {
        pageNumbers.push(1);
        if (currentPage > 3) { pageNumbers.push(-1); }
        let start = Math.max(2, currentPage - 1);
        let end = Math.min(totalPages - 1, currentPage + 1);
        if (currentPage <= 2) { end = 3; }
        if (currentPage >= totalPages - 1) { start = totalPages - 2; }
        for (let i = start; i <= end; i++) { pageNumbers.push(i); }
        if (currentPage < totalPages - 2) { pageNumbers.push(-1); }
        pageNumbers.push(totalPages);
    }
    
    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}/></PaginationItem>
          {pageNumbers.map((num, i) => num === -1 ? <PaginationItem key={`ellipsis-${i}`}><PaginationEllipsis /></PaginationItem> : <PaginationItem key={num}><PaginationLink href="#" isActive={currentPage === num} onClick={(e) => { e.preventDefault(); setCurrentPage(num); }}>{num}</PaginationLink></PaginationItem>)}
          <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}/></PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  }

  const openDialog = (book: EnrichedBook) => {
    let role: AssignmentRole | undefined;
    if (['To Scan', 'Scanning Started'].includes(book.status)) role = 'scanner';
    else if (['To Indexing', 'Indexing Started'].includes(book.status)) role = 'indexer';
    else if (['To Checking', 'Checking Started'].includes(book.status)) role = 'qc';
    
    if (role) {
      setDialogState({ open: true, book, role });
      setNewUserId('');
    }
  }

  const closeDialog = () => {
    setDialogState({ open: false, book: undefined, role: undefined })
    setNewUserId('');
  }

  const handleSave = () => {
    if (dialogState.book && dialogState.role && newUserId) {
      reassignUser(dialogState.book.id, newUserId, dialogState.role);
      closeDialog();
    }
  }
  
  const getAssignableUsers = (role: AssignmentRole, projectId: string) => {
      const permissionMap = {
        scanner: '/workflow/to-scan',
        indexer: '/workflow/to-indexing',
        qc: '/workflow/to-checking',
      };
      const requiredPermission = permissionMap[role];
      return users.filter(user => {
        if (user.role === 'Admin') return false; // Exclude admins
        const userPermissions = permissions[user.role] || [];
        const hasPermission = userPermissions.includes('*') || userPermissions.includes(requiredPermission);
        const hasProjectAccess = !user.projectIds || user.projectIds.length === 0 || user.projectIds.includes(projectId);
        return hasPermission && hasProjectAccess;
      });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Reatribuição de Utilizador</h1>
          <p className="text-muted-foreground">Altere o utilizador atribuído aos livros que se encontram atualmente numa fila pessoal.</p>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('name', e.shiftKey)}>Nome do Livro {getSortIndicator('name')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('projectName', e.shiftKey)}>Projeto {getSortIndicator('projectName')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('status', e.shiftKey)}>Estado {getSortIndicator('status')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('scannerName', e.shiftKey)}>Digitalizador {getSortIndicator('scannerName')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('indexerName', e.shiftKey)}>Indexador {getSortIndicator('indexerName')}</div></TableHead>
                <TableHead><div className="flex items-center gap-2 cursor-pointer select-none group" onClick={(e) => handleSort('qcName', e.shiftKey)}>Especialista QC {getSortIndicator('qcName')}</div></TableHead>
                <TableHead className="w-[150px] text-right">Ações</TableHead>
              </TableRow>
              <TableRow>
                <TableHead><Input placeholder="Filtrar nome..." value={columnFilters['name'] || ''} onChange={(e) => handleColumnFilterChange('name', e.target.value)} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filtrar projeto..." value={columnFilters['projectName'] || ''} onChange={(e) => handleColumnFilterChange('projectName', e.target.value)} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filtrar estado..." value={columnFilters['status'] || ''} onChange={(e) => handleColumnFilterChange('status', e.target.value)} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filtrar digitalizador..." value={columnFilters['scannerName'] || ''} onChange={(e) => handleColumnFilterChange('scannerName', e.target.value)} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filtrar indexador..." value={columnFilters['indexerName'] || ''} onChange={(e) => handleColumnFilterChange('indexerName', e.target.value)} className="h-8"/></TableHead>
                <TableHead><Input placeholder="Filtrar QC..." value={columnFilters['qcName'] || ''} onChange={(e) => handleColumnFilterChange('qcName', e.target.value)} className="h-8"/></TableHead>
                <TableHead className="text-right"><Button variant="ghost" size="sm" onClick={handleClearFilters} disabled={Object.values(columnFilters).every(v => !v)}>Limpar Filtros</Button></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBooks.length > 0 ? paginatedBooks.map((book) => (
                <TableRow key={book.id}>
                  <TableCell className="font-medium"><Link href={`/books/${book.id}`} className="hover:underline">{book.name}</Link></TableCell>
                  <TableCell>{book.projectName}</TableCell>
                  <TableCell><Badge variant="secondary">{book.status}</Badge></TableCell>
                  <TableCell>{book.scannerName || '—'}</TableCell>
                  <TableCell>{book.indexerName || '—'}</TableCell>
                  <TableCell>{book.qcName || '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="secondary" size="sm" onClick={() => openDialog(book)}>
                        <UserCog className="mr-2 h-4 w-4" />
                        Reatribuir
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                 <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Não existem livros atualmente num estado que permita a reatribuição de utilizador.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
               {`A mostrar ${paginatedBooks.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-${(currentPage - 1) * ITEMS_PER_PAGE + paginatedBooks.length} de ${sortedAndFilteredBooks.length} livros atribuíveis`}
            </div>
            <PaginationNav />
        </CardFooter>
      </Card>

      {dialogState.open && dialogState.book && dialogState.role && (
        <Dialog open={dialogState.open} onOpenChange={closeDialog}>
            <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>Reatribuir {dialogState.role === 'scanner' ? 'digitalizador' : dialogState.role === 'indexer' ? 'indexador' : 'QC'} para: {dialogState.book?.name}</DialogTitle>
                <DialogDescription>
                Selecione um novo utilizador para assumir esta tarefa. O livro será movido para a fila desse utilizador.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="new-user">Novo Utilizador</Label>
                    <Select value={newUserId} onValueChange={setNewUserId}>
                        <SelectTrigger id="new-user">
                            <SelectValue placeholder={`Selecione um novo ${dialogState.role === 'scanner' ? 'digitalizador' : dialogState.role === 'indexer' ? 'indexador' : 'QC'}`} />
                        </SelectTrigger>
                        <SelectContent>
                            {getAssignableUsers(dialogState.role, dialogState.book!.projectId).map(user => (
                                <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
                <Button onClick={handleSave} disabled={!newUserId}>
                Confirmar e Reatribuir
                </Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
