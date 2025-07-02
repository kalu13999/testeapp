
import { getDocuments, getClients } from "@/lib/data";
import DocumentsClient from "./client";

export default async function DocumentsPage() {
  const [documents, clients] = await Promise.all([
    getDocuments(),
    getClients(),
  ]);

  const uniqueStatuses = [...new Set(documents.map(doc => doc.status))].sort();
  const clientNames = clients.map(c => c.name).sort();

  return <DocumentsClient documents={documents} clients={clientNames} statuses={uniqueStatuses} />;
}
