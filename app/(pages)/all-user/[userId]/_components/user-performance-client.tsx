"use client";

import { useState, useMemo } from "react";
import { User, Department } from "@prisma/client";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  ListTodo,
  PieChart,
  Star,
  Gauge,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { PerformanceBarChart } from "./performance-bar-chart";
import { PerformanceRadarChart } from "./performance-radar-chart";
import { SafeTask } from "../page";
import Link from "next/link";

type FullUser = Omit<User, "assignedTasks"> & {
  assignedTasks: SafeTask[];
  department: Department | null;
};

interface UserPerformanceClientProps {
  user: FullUser;
}

const StatCard = ({
  icon,
  title,
  value,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  description: string;
}) => (
  <Card className="cursor-pointer hover:shadow-md transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

// New component for displaying task lists with expandable functionality
const TaskListCard = ({
  title,
  icon,
  tasks,
  isOverdue = false,
  isExpanded,
  onToggle,
}: {
  title: string;
  icon: React.ReactNode;
  tasks: SafeTask[];
  isOverdue?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) => (
  <Card
    className={`cursor-pointer transition-all duration-300 ${
      isExpanded ? "md:col-span-2" : ""
    } ${isOverdue ? "border-destructive/50" : ""}`}
  >
    <CardHeader onClick={onToggle} className="pb-3">
      <CardTitle className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          {title}
          <Badge variant={isOverdue ? "destructive" : "secondary"}>
            {tasks.length}
          </Badge>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5" />
        ) : (
          <ChevronDown className="h-5 w-5" />
        )}
      </CardTitle>
    </CardHeader>
    <CardContent>
      {tasks.length === 0 ? (
        <p className="text-muted-foreground text-sm">No tasks</p>
      ) : (
        <div className="space-y-3">
          {tasks.slice(0, isExpanded ? tasks.length : 3).map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground">
                    {task.dueDate
                      ? `Due: ${new Date(task.dueDate).toLocaleDateString()}`
                      : "No due date"}
                  </p>
                  <Badge
                    variant={isOverdue ? "destructive" : "outline"}
                    className="text-xs"
                  >
                    {task.priority}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isOverdue && (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                )}
                <Link
                  href={`/projects/${task.projectId}/task/${task.id}?workspaceId=cme1bv47a0002js04h223pd0s`}
                >
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
          {!isExpanded && tasks.length > 3 && (
            <div className="text-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="text-xs"
              >
                View all {tasks.length} tasks
              </Button>
            </div>
          )}
        </div>
      )}
    </CardContent>
  </Card>
);

export const UserPerformanceClient = ({ user }: UserPerformanceClientProps) => {
  const [expandedCard, setExpandedCard] = useState<
    "pending" | "overdue" | null
  >(null);

  const stats = useMemo(() => {
    const totalTasks = user.assignedTasks.length;
    const pendingTasks = user.assignedTasks.filter(
      (t) => t.status === "TODO" || t.status === "IN_PROGRESS"
    ).length;
    const completedTasks = user.assignedTasks.filter(
      (t) => t.status === "DONE" || t.status === "REVIEW"
    ).length;
    const overdueTasks = user.assignedTasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) < new Date() &&
        !["DONE", "REVIEW"].includes(t.status)
    ).length;
    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    let score = completionRate;
    score -= overdueTasks * 5;
    const performanceScore = Math.max(0, Math.min(100, Math.round(score)));

    const highPriority = user.assignedTasks.filter(
      (t) => t.priority === "HIGH"
    ).length;
    const mediumPriority = user.assignedTasks.filter(
      (t) => t.priority === "MEDIUM"
    ).length;
    const lowPriority = user.assignedTasks.filter(
      (t) => t.priority === "LOW"
    ).length;

    return {
      totalTasks,
      pendingTasks,
      completedTasks,
      completionRate,
      performanceScore,
      overdueTasks,
      highPriority,
      mediumPriority,
      lowPriority,
    };
  }, [user.assignedTasks]);

  // Get actual task objects for pending and overdue
  const pendingTasks = useMemo(
    () =>
      user.assignedTasks.filter(
        (t) => t.status === "TODO" || t.status === "IN_PROGRESS"
      ),
    [user.assignedTasks]
  );

  const overdueTasks = useMemo(
    () =>
      user.assignedTasks.filter(
        (t) =>
          t.dueDate &&
          new Date(t.dueDate) < new Date() &&
          !["DONE", "REVIEW"].includes(t.status)
      ),
    [user.assignedTasks]
  );

  // Data for the Bar Chart
  const barChartData = [
    { name: "Low", total: stats.lowPriority },
    { name: "Medium", total: stats.mediumPriority },
    { name: "High", total: stats.highPriority },
  ];

  // Data for the Radar Chart
  const radarChartData = [
    {
      subject: "Completed",
      value: stats.completedTasks,
      fullMark: stats.totalTasks,
    },
    {
      subject: "Pending",
      value: stats.pendingTasks,
      fullMark: stats.totalTasks,
    },
    {
      subject: "Overdue",
      value: stats.overdueTasks,
      fullMark: stats.totalTasks,
    },
    { subject: "High", value: stats.highPriority, fullMark: stats.totalTasks },
  ];

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      {/* Header and Stat Cards */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center space-x-4"
      >
        <Avatar className="h-16 w-16">
          <AvatarImage src={user.avatar || undefined} />
          <AvatarFallback>
            {user.name
              ?.split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
          <p className="text-muted-foreground">
            {user.department?.name
              ? `${user.role} - ${user.department.name}`
              : user.role}
          </p>
        </div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Performance Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="md:col-span-1"
        >
          <Card className="bg-primary/5 h-full cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Performance Score
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-6xl font-bold text-primary">
                {stats.performanceScore}
                <span className="text-2xl text-muted-foreground">/100</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Based on completion rate and overdue tasks
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stat Cards Grid */}
        <motion.div
          className="md:col-span-2 grid grid-cols-2 gap-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.1, delayChildren: 0.2 },
            },
          }}
        >
          <motion.div
            variants={{
              hidden: { y: 20, opacity: 0 },
              visible: { y: 0, opacity: 1 },
            }}
          >
            <StatCard
              icon={<PieChart className="h-4 w-4 text-primary" />}
              title="Total Tasks"
              value={stats.totalTasks}
              description="All assigned tasks"
            />
          </motion.div>
          <motion.div
            variants={{
              hidden: { y: 20, opacity: 0 },
              visible: { y: 0, opacity: 1 },
            }}
          >
            <StatCard
              icon={<Star className="h-4 w-4 text-secondary" />}
              title="Completion Rate"
              value={`${stats.completionRate}%`}
              description={`${stats.completedTasks} tasks completed`}
            />
          </motion.div>
          <motion.div
            variants={{
              hidden: { y: 20, opacity: 0 },
              visible: { y: 0, opacity: 1 },
            }}
          >
            <StatCard
              icon={<ListTodo className="h-4 w-4 text-amber-500" />}
              title="Pending Tasks"
              value={stats.pendingTasks}
              description="To Do & In Progress"
            />
          </motion.div>
          <motion.div
            variants={{
              hidden: { y: 20, opacity: 0 },
              visible: { y: 0, opacity: 1 },
            }}
          >
            <StatCard
              icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
              title="Overdue Tasks"
              value={stats.overdueTasks}
              description="Tasks past their due date"
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Charts Section */}
      <motion.div
        className="grid gap-6 lg:grid-cols-2"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.2, delayChildren: 0.4 },
          },
        }}
      >
        {/* Bar Chart Card */}
        <motion.div
          variants={{
            hidden: { y: 20, opacity: 0 },
            visible: { y: 0, opacity: 1 },
          }}
        >
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Task Priority Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[350px] p-6">
              <PerformanceBarChart data={barChartData} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Radar Chart Card */}
        <motion.div
          variants={{
            hidden: { y: 20, opacity: 0 },
            visible: { y: 0, opacity: 1 },
          }}
        >
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[350px] p-6">
              <PerformanceRadarChart data={radarChartData} />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Task Lists Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Task Management</h2>

        <motion.div
          className={`grid gap-6 ${
            expandedCard ? "md:grid-cols-1" : "md:grid-cols-2"
          }`}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.2, delayChildren: 0.6 },
            },
          }}
        >
          {/* Pending Tasks Card */}
          <motion.div
            variants={{
              hidden: { y: 20, opacity: 0 },
              visible: { y: 0, opacity: 1 },
            }}
          >
            <TaskListCard
              title="Pending Tasks"
              icon={<Clock className="h-5 w-5 text-amber-500" />}
              tasks={pendingTasks}
              isExpanded={expandedCard === "pending"}
              onToggle={() =>
                setExpandedCard(expandedCard === "pending" ? null : "pending")
              }
            />
          </motion.div>

          {/* Overdue Tasks Card */}
          <motion.div
            variants={{
              hidden: { y: 20, opacity: 0 },
              visible: { y: 0, opacity: 1 },
            }}
          >
            <TaskListCard
              title="Overdue Tasks"
              icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
              tasks={overdueTasks}
              isOverdue={true}
              isExpanded={expandedCard === "overdue"}
              onToggle={() =>
                setExpandedCard(expandedCard === "overdue" ? null : "overdue")
              }
            />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
