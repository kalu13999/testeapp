
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AppProvider } from "@/context/workflow-context";
import { getClients, getEnrichedAuditLogs, getEnrichedBooks, getEnrichedDocuments, getEnrichedProjects, getPermissions, getProcessingLogs, getRoles, getUsers } from "@/lib/data";

export const metadata: Metadata = {
  title: "FlowVault",
  description: "Document management and workflow automation.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [clients, users, projects, books, documents, auditLogs, processingLogs, permissions, roles] = await Promise.all([
    getClients(),
    getUsers(),
    getEnrichedProjects(),
    getEnrichedBooks(),
    getEnrichedDocuments(),
    getEnrichedAuditLogs(),
    getProcessingLogs(),
    getPermissions(),
    getRoles(),
  ]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <AppProvider
          initialClients={clients}
          initialUsers={users}
          initialProjects={projects}
          initialBooks={books}
          initialDocuments={documents}
          initialAuditLogs={auditLogs}
          initialProcessingLogs={processingLogs}
          initialPermissions={permissions}
          initialRoles={roles}
        >
          {children}
          <Toaster />
        </AppProvider>
      </body>
    </html>
  );
}
