"use client";

import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "./EmptyState";
import { toast } from "sonner";
import { useTaskTimer } from "@/hooks/useTaskTimer";
import StatusSelector from "../../projects/user-work/[userId]/_components/StatusSelector";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardTask {
  id: string;
  title: string;
  status: "TO_DO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  projectId: string;
  workspaceId: string;
  project: {
    name: string;
  };
}

interface TaskTableProps {
  tasks: DashboardTask[];
  onRefresh: () => void;
}

const TaskTable = ({ tasks, onRefresh }: TaskTableProps) => {
  const { 
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    formatTime,
    getTimerForTask,
    getDisplayTimeForTask,
  } = useTaskTimer();
  
  if (!tasks || tasks.length === 0) return <EmptyState/>;

  const handleStartTimer = (task: DashboardTask) => {
    startTimer(task.id, task.title);
    toast.success("Timer started", {
      description: `Tracking time for: ${task.title}`,
    });
  };

  const handlePauseTimer = (taskId: string) => {
    pauseTimer(taskId);
    toast.info("Timer paused", {
      description: "Click play to resume",
    });
  };

  const handleResumeTimer = (taskId: string) => {
    resumeTimer(taskId);
    toast.success("Timer resumed");
  };

  const handleStopTimer = async (task: DashboardTask) => {
    const elapsed = await stopTimer(task.id);
    const minutes = Math.round(elapsed / 60);
    toast.success("Timer stopped & saved", {
      description: `Logged ${minutes} minute${minutes !== 1 ? 's' : ''} (${formatTime(elapsed)})`,
    });
    // Refresh to show updated actualMinutes
    onRefresh();
  };

  const formatPauseTime = (pausedAt: number) => {
    const date = new Date(pausedAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="rounded-lg border bg-card">
      <Table className=" w-full">
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b">
            <TableHead className="w-[45%] font-semibold">Task</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Timer</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const timer = getTimerForTask(task.id);
            const displayTime = getDisplayTimeForTask(task.id);
            
            return (
              <TableRow key={task.id} className="group">
                <TableCell className="py-4">
                  <Link
                    href={`/projects/${task.projectId}/task/${task.id}?workspaceId=${task.workspaceId}`}
                    className="block"
                  >
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate max-w-md">
                      {task.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {task.project.name}
                    </p>
                  </Link>
                </TableCell>

                <TableCell className="py-4">
                  <StatusSelector 
                    task={task} 
                    onUpdate={onRefresh}
                  />
                </TableCell>
                
                <TableCell className="py-4 w-60">
                  {timer ? (
                    <Card className={cn(
                      "p-3 transition-all duration-200 border-2 w-72",
                      timer.isRunning && "border-primary/30 bg-primary/5",
                      timer.isPaused && "border-yellow-500/30 bg-yellow-500/5"
                    )}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Status Indicator */}
                          <div className="">
                            {timer.isRunning && (
                              <div className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                              </div>
                            )}
                            {timer.isPaused && (
                              <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse"></div>
                            )}
                          </div>
                          
                          {/* Time and Title */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="text-lg font-mono font-bold tabular-nums tracking-tight">
                                {formatTime(displayTime)}
                              </span>
                              <Badge 
                                variant="secondary" 
                                className="text-[10px] px-1.5 py-0 h-4"
                              >
                                {timer.isRunning ? "RUNNING" : "PAUSED"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground  truncate mt-0.5">
                              {timer.taskTitle}
                            </p>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {timer.isRunning ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePauseTimer(task.id)}
                              className="h-9 w-9 hover:bg-yellow-500/10 hover:text-yellow-600"
                              title="Pause timer"
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleResumeTimer(task.id)}
                              className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
                              title="Resume timer"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStopTimer(task)}
                            className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive"
                            title="Stop and save timer"
                          >
                            <Square className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Paused Info */}
                      {timer.isPaused && timer.pausedAt && (
                        <div className="mt-2 pt-2 border-t flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Paused at {formatPauseTime(timer.pausedAt)}
                          </span>
                        </div>
                      )}
                    </Card>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartTimer(task)}
                      className="h-9 gap-2 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all"
                    >
                      <Play className="h-4 w-4" />
                      Start Timer
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default TaskTable;