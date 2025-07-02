
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function FinalizedPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Finalized Documents</CardTitle>
        <CardDescription>Documents that have completed the client validation phase.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-center text-muted-foreground py-10">Finalized documents interface coming soon!</p>
      </CardContent>
    </Card>
  );
}
