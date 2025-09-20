"use client";

import { useMemo } from "react";
import { User, Department } from "@prisma/client";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, ListTodo, PieChart, Star, Gauge, AlertTriangle } from "lucide-react";
// --- 1. IMPORT BOTH CHARTS ---
import { PerformanceBarChart } from "./performance-bar-chart"; 
import { PerformanceRadarChart } from "./performance-radar-chart"; 
import { SafeTask } from "../page";

type FullUser = Omit<User, "assignedTasks"> & {
  assignedTasks: SafeTask[];
  department: Department | null;
};

interface UserPerformanceClientProps {
  user: FullUser;
}

const StatCard = ({ icon, title, value, description }: { icon: React.ReactNode; title: string; value: string | number; description: string; }) => (
  <Card>
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

export const UserPerformanceClient = ({ user }: UserPerformanceClientProps) => {
  const stats = useMemo(() => {
    const totalTasks = user.assignedTasks.length;
    const pendingTasks = user.assignedTasks.filter(t => t.status === "TODO" || t.status === "IN_PROGRESS").length;
    const completedTasks = user.assignedTasks.filter(t => t.status === "DONE" || t.status === "REVIEW").length;
    const overdueTasks = user.assignedTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && !["DONE", "REVIEW"].includes(t.status)).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    let score = completionRate;
    score -= overdueTasks * 5;
    const performanceScore = Math.max(0, Math.min(100, Math.round(score)));

    const highPriority = user.assignedTasks.filter(t => t.priority === 'HIGH').length;
    const mediumPriority = user.assignedTasks.filter(t => t.priority === 'MEDIUM').length;
    const lowPriority = user.assignedTasks.filter(t => t.priority === 'LOW').length;

    return { totalTasks, pendingTasks, completedTasks, completionRate, performanceScore, overdueTasks, highPriority, mediumPriority, lowPriority };
  }, [user.assignedTasks]);

  // Data for the Bar Chart
  const barChartData = [
    { name: "Low", total: stats.lowPriority },
    { name: "Medium", total: stats.mediumPriority },
    { name: "High", total: stats.highPriority },
  ];

  // Data for the Radar Chart
  const radarChartData = [
    { subject: "Completed", value: stats.completedTasks, fullMark: stats.totalTasks },
    { subject: "Pending", value: stats.pendingTasks, fullMark: stats.totalTasks },
    { subject: "Overdue", value: stats.overdueTasks, fullMark: stats.totalTasks },
    { subject: "High", value: stats.highPriority, fullMark: stats.totalTasks },
  ];

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      {/* Header and Stat Cards remain the same */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center space-x-4"
      >
        <Avatar className="h-16 w-16">
          <AvatarImage src={user.avatar || undefined} />
          <AvatarFallback>{user.name?.split(" ").map(n => n[0]).join("")}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
          <p className="text-muted-foreground">{user.department?.name ? `${user.role} - ${user.department.name}` : user.role}</p>
        </div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* ... Stat cards section ... */}
         <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="md:col-span-1"
        >
          <Card className="bg-primary/5 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Performance Score
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-6xl font-bold text-primary">{stats.performanceScore}<span className="text-2xl text-muted-foreground">/100</span></p>
              <p className="text-xs text-muted-foreground mt-2">Based on completion rate and overdue tasks</p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div 
          className="md:col-span-2 grid grid-cols-2 gap-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
          }}
        >
          <motion.div variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}>
            <StatCard icon={<PieChart className="h-4 w-4 text-muted-foreground" />} title="Total Tasks" value={stats.totalTasks} description="All assigned tasks" />
          </motion.div>
          <motion.div variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}>
            <StatCard icon={<Star className="h-4 w-4 text-muted-foreground" />} title="Completion Rate" value={`${stats.completionRate}%`} description={`${stats.completedTasks} tasks completed`} />
          </motion.div>
          <motion.div variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}>
            <StatCard icon={<ListTodo className="h-4 w-4 text-muted-foreground" />} title="Pending Tasks" value={stats.pendingTasks} description="To Do & In Progress" />
          </motion.div>
          <motion.div variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}>
            <StatCard icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />} title="Overdue Tasks" value={stats.overdueTasks} description="Tasks past their due date" />
          </motion.div>
        </motion.div>
      </div>

      {/* --- 2. UPDATED LAYOUT FOR BOTH CHARTS --- */}
    <motion.div
        className="grid gap-6 lg:grid-cols-2"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.4 } }
        }}
      >
        {/* Bar Chart Card */}
        <motion.div variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}>
          <Card>
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
        <motion.div variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}>
          <Card>
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
    </div>
  );
};