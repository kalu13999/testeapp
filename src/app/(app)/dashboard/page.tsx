
import DashboardClient from "./client";

export default async function DashboardPage() {
    // The client component now fetches its own data from the context.
    return <DashboardClient />
}
