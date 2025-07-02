
import { getDocuments } from "@/lib/data";
import DocumentsClient from "./client";

export default async function DocumentsPage() {
  const documents = await getDocuments();
  return <DocumentsClient documents={documents} />;
}
