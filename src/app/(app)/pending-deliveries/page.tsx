
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PendingDeliveriesPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Pending Deliveries</CardTitle>
        <CardDescription>Documents awaiting your approval.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-center text-muted-foreground py-10">Pending deliveries interface coming soon!</p>
      </CardContent>
    </Card>
  );
}
