
import { getBooks } from "@/lib/data";
import DocumentsClient from "./client";

export default async function DocumentsPage() {
  const books = await getBooks();

  // For filters, we'll get unique project and client names from the books data
  const projectNames = [...new Set(books.map(b => b.projectName))].sort();
  const clientNames = [...new Set(books.map(b => b.clientName))].sort();

  return <DocumentsClient books={books} clients={clientNames} projects={projectNames} />;
}
