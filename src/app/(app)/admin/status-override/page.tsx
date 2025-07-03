import { getDocumentStatuses } from "@/lib/data";
import StatusOverrideClient from "./client";

export default async function StatusOverridePage() {
    const statuses = await getDocumentStatuses();
    return <StatusOverrideClient allStatuses={statuses} />;
}
