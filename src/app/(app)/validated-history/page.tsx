
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ValidatedHistoryPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Validated History</CardTitle>
        <CardDescription>History of all approved and validated document batches.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-center text-muted-foreground py-10">Validated history interface coming soon!</p>
      </CardContent>
    </Card>
  );
}
