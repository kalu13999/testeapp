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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Send, PackageSearch } from "lucide-react"
import { useAppContext } from "@/context/workflow-context"
import { EnrichedBook } from "@/context/workflow-context"
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


export default function ShipmentsClient() {
  const { books, currentUser, handleMarkAsShipped } = useAppContext();
  const [selection, setSelection] = React.useState<string[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);

  const pendingBooks = React.useMemo(() => {
    if (currentUser?.role !== 'Client') return [];
    // The books from context are already pre-filtered for the client user
    return books.filter(book => book.status === 'Pending');
  }, [books, currentUser]);

  const handleConfirmShipment = () => {
    if (selection.length > 0) {
      handleMarkAsShipped(selection);
      setSelection([]);
    }
    setIsConfirmOpen(false);
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
              <Button 
                disabled={selection.length === 0}
                onClick={() => setIsConfirmOpen(true)}
              >
                <Send className="mr-2 h-4 w-4" />
                Mark {selection.length > 0 ? selection.length : ''} Book(s) as Shipped
              </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pendingBooks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                      <Checkbox
                          checked={pendingBooks.length > 0 && selection.length === pendingBooks.length}
                          onCheckedChange={(checked) => setSelection(checked ? pendingBooks.map(item => item.id) : [])}
                          aria-label="Select all"
                      />
                  </TableHead>
                  <TableHead>Book Name</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-center">Expected Pages</TableHead>
                  <TableHead>Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingBooks.map((book, index) => (
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
            Showing <strong>{pendingBooks.length}</strong> pending books
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
