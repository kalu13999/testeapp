
import { getBooks } from "@/lib/data";
import DocumentsClient from "./client";

export default async function DocumentsPage() {
  // We still fetch initial data for filters, but the client component will use the context for the book list.
  const books = await getBooks();
  const projectNames = [...new Set(books.map(b => b.projectName))].sort();
  const clientNames = [...new Set(books.map(b => b.clientName))].sort();

  return <DocumentsClient clients={clientNames} projects={projectNames} />;
}
