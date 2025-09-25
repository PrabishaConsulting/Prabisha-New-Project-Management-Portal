'use client';

import { Task, ProjectMember, User, TaskStatus, Priority } from "@prisma/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';

type TaskWithAssignee = Task & { assignee: { id: string; name: string | null; avatar: string | null } | null };

interface ProjectTableProps {
    tasks: TaskWithAssignee[];
    onTaskUpdate: (taskId: string, data: Partial<Task>) => void;
}

const statusOrder = [TaskStatus.TO_DO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.DONE];
const priorityStyles: Record<Priority, string> = {
    URGENT: "bg-red-600", HIGH: "bg-orange-500", MEDIUM: "bg-yellow-500", LOW: "bg-sky-500",
};

export function ProjectTable({ tasks, onTaskUpdate }: ProjectTableProps) {
    const sortedTasks = [...tasks].sort((a, b) => {
        const statusComparison = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
        if (statusComparison !== 0) return statusComparison;
        return a.position - b.position;
    });

    return (
        <div className="border rounded-lg bg-card">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-muted/50">
                        <TableHead className="w-[40%]">Task</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Assignee</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedTasks.length > 0 ? (
                        sortedTasks.map((task) => (
                            <TableRow key={task.id} className="border-border hover:bg-muted/80">
                                <TableCell className="font-medium text-foreground">{task.title}</TableCell>
                                <TableCell>
                                    <Select 
                                        defaultValue={task.status} 
                                        onValueChange={(newStatus) => onTaskUpdate(task.id, { status: newStatus as TaskStatus })}
                                    >
                                        <SelectTrigger className="w-[140px] h-8 text-xs focus:ring-primary">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statusOrder.map(status => (
                                                <SelectItem key={status} value={status}>
                                                    {status.replace('_', ' ')}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className={cn("text-white", priorityStyles[task.priority])}>
                                        {task.priority}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {task.assignee ? (
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage className='object-cover' src={task.assignee.avatar || ''} alt={task.assignee.name || ''} />
                                                <AvatarFallback>{task.assignee.name?.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-muted-foreground">{task.assignee.name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground">Unassigned</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {task.dueDate ? format(new Date(task.dueDate), 'PP') : '–'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem>View Details</DropdownMenuItem>
                                            <DropdownMenuItem>Edit Task</DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">Delete Task</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                No tasks found for this project.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}