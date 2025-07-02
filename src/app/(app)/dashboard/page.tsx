
import { getDashboardData } from "@/lib/data"
import DashboardClient from "./client";

export default async function DashboardPage() {
    const { kpiData, chartData, recentActivities } = await getDashboardData();
    
    return <DashboardClient kpiData={kpiData} chartData={chartData} recentActivities={recentActivities} />
}
