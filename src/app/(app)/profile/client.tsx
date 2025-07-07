
"use client"

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from '@/context/workflow-context';
import { BookCheck, Clock, History, User, Files } from 'lucide-react';
import { EnrichedBook, EnrichedAuditLog } from '@/context/workflow-context';
import Link from 'next/link';

const getInitials = (name: string) => {
    if (!name) return "";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

const completionActions = [
    'Scanning Finished', 'Initial QC Complete', 'Processing Completed', 
    'Client Approval', 'Book Archived', 'Assigned for QC' // Indexing completion
];

export default function ProfileClient() {
    const { currentUser, books, auditLogs } = useAppContext();

    const userStats = React.useMemo(() => {
        if (!currentUser) return { tasksInQueue: 0, tasksToday: 0, myQueue: [], myHistory: [] };

        const myQueue = books.filter(book => 
            (currentUser.role === 'Scanning' && book.scannerUserId === currentUser.id && book.status === 'Scanning Started') ||
            (currentUser.role === 'Indexing' && book.indexerUserId === currentUser.id && book.status === 'Indexing Started') ||
            (currentUser.role === 'QC Specialist' && book.qcUserId === currentUser.id && book.status === 'Checking Started')
        );

        const myHistory = auditLogs
            .filter(log => log.userId === currentUser.id)
            .slice(0, 15);
        
        const today = new Date().toISOString().slice(0, 10);
        const tasksToday = auditLogs.filter(log => 
            log.userId === currentUser.id && 
            log.date.startsWith(today) && 
            completionActions.includes(log.action)
        ).length;

        return {
            tasksInQueue: myQueue.length,
            tasksToday,
            myQueue,
            myHistory,
        }
    }, [currentUser, books, auditLogs]);

    if (!currentUser) {
        return (
            <div className="flex items-center justify-center h-full">
                <p>Loading user profile...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-1">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <Avatar className="h-20 w-20">
                            {currentUser.avatar && <AvatarImage src={currentUser.avatar} alt={currentUser.name} data-ai-hint="person avatar"/>}
                            <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-2xl font-bold">{currentUser.name}</CardTitle>
                            <CardDescription>{currentUser.jobTitle}</CardDescription>
                             <Badge variant="secondary" className="mt-2">{currentUser.role}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        <p>{currentUser.department} Department</p>
                        <p>{currentUser.email}</p>
                    </CardContent>
                </Card>
                <div className="md:col-span-2 grid grid-cols-2 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Tasks in My Queue</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{userStats.tasksInQueue}</div>
                            <p className="text-xs text-muted-foreground">Books currently assigned to you</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Tasks Completed Today</CardTitle>
                            <BookCheck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{userStats.tasksToday}</div>
                            <p className="text-xs text-muted-foreground">Number of books processed today</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2"><Files className="h-5 w-5"/> My Queue</CardTitle>
                        <CardDescription>All books and tasks currently assigned to you for action.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Book Name</TableHead>
                                    <TableHead>Project</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Assigned On</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {userStats.myQueue.length > 0 ? userStats.myQueue.map(book => (
                                    <TableRow key={book.id}>
                                        <TableCell className="font-medium">
                                            <Link href={`/books/${book.id}`} className="hover:underline">{book.name}</Link>
                                        </TableCell>
                                        <TableCell>{book.projectName}</TableCell>
                                        <TableCell><Badge variant="secondary">{book.status}</Badge></TableCell>
                                        <TableCell>{new Date(book.scanStartTime || book.indexingStartTime || book.qcStartTime || Date.now()).toLocaleDateString()}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">You have no tasks in your queue.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                     <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2"><History className="h-5 w-5"/> My Recent Activity</CardTitle>
                        <CardDescription>Your last 15 actions recorded in the system.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Details</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {userStats.myHistory.length > 0 ? userStats.myHistory.map(log => (
                                     <TableRow key={log.id}>
                                        <TableCell className="font-medium">{log.action}</TableCell>
                                        <TableCell className="text-muted-foreground">{log.details}</TableCell>
                                        <TableCell>{new Date(log.date).toLocaleString()}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">No recent activity found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
