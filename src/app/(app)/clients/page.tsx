
import { getClients } from "@/lib/data";
import ClientsClient from "./client";

export default async function ClientsPage() {
  const clients = await getClients();
  return <ClientsClient clients={clients} />;
}
