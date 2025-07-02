
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClientDashboardPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Client Dashboard</CardTitle>
        <CardDescription>Summarizing pending validations and recent deliveries.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-center text-muted-foreground py-10">Client dashboard content coming soon!</p>
      </CardContent>
    </Card>
  );
}
