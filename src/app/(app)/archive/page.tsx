
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ArchivePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Archived Documents</CardTitle>
        <CardDescription>All long-term storage documents can be found here.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-center text-muted-foreground py-10">Archive interface coming soon!</p>
      </CardContent>
    </Card>
  );
}
