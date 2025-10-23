"use client";

import useSWR from "swr";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  Clock,
  Star,
  CircleHelp,
  List,
  UserCheck,
  PlusCircle,
  LucideSquareMousePointer,
} from "lucide-react";
import { Task as PrismaTask } from "@prisma/client";
import { TaskFormDialog } from "@/components/modals/AddTaskDialog";
import { TaskFormData } from "@/lib/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import TaskTable from "./my-taskTable";

interface DashboardTask {
  id: string;
  title: string;
  status: PrismaTask["status"];
  projectId: string;
  workspaceId: string;
  project: {
    name: string;
  };
}

interface DepartmentGroup {
  departmentId: string;
  departmentName: string;
  tasks: DashboardTask[];
}

interface MyWorkData {
  user: { name: string };
  stats: { todo: number; inProgress: number; review: number; done: number };
  allTasks: DashboardTask[];
  clientTasks: DashboardTask[];
  departmentProjectGroups: DepartmentGroup[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MyWorkPage({ userId }: { userId: string }) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const {
    data: dashboardData,
    error: dashboardError,
    isLoading: isDashboardLoading,
    mutate,
  } = useSWR<MyWorkData>(`/api/users/${userId}/my-work`, fetcher);

  useEffect(() => {
    if (dashboardData) {
      if (dashboardData.allTasks?.length > 0) setActiveTab("all");
      else if (dashboardData.clientTasks?.length > 0) setActiveTab("client");
      else if (dashboardData.departmentProjectGroups?.length > 0)
        setActiveTab(dashboardData.departmentProjectGroups[0].departmentId);
    }
  }, [dashboardData]);

  const handleCreateTask = async (data: TaskFormData) => {
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.code === "VALIDATION_ERROR" && errorData.details) {
          const validationMessages = errorData.details
            .map((issue: any) => issue.message)
            .join("\n");
          toast.error(`Validation Failed:\n${validationMessages}`);
        } else {
          toast.error(errorData.message || "An unknown error occurred.");
        }
        return;
      }

      toast.success("Task created successfully!");
      mutate();
    } catch (error) {
      console.error("Failed to submit form:", error);
      toast.error("Could not connect to the server. Please check your network.");
    }
  };

  if (dashboardError)
    return <div>Failed to load your work dashboard. Please try again.</div>;
  if (isDashboardLoading || !dashboardData) return <PageLoader />;

  const { user, stats, allTasks, clientTasks, departmentProjectGroups } =
    dashboardData;

  const filterDoneTasks = (tasks: DashboardTask[]) =>
    tasks.filter((task) => task.status !== "DONE");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">My Tasks</h2>
        <div className="flex space-x-2">
          <Button
            className="mt-4 sm:mt-0"
            onClick={() => setIsDialogOpen(true)}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Task
          </Button>
          <Button
            className="mt-4 sm:mt-0"
            onClick={() => router.push(`all-user/${userId}`)}
          >
            <LucideSquareMousePointer className="mr-2 h-4 w-4" />
            Your Performance
          </Button>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={`My Tasks To Do`}
          value={stats.todo}
          icon={<CircleHelp className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard
          title="My In Progress"
          value={stats.inProgress}
          icon={<Clock className="h-5 w-5 text-blue-500" />}
        />
        <StatCard
          title="My In Review"
          value={stats.review}
          icon={<Star className="h-5 w-5 text-yellow-500" />}
        />
        <StatCard
          title="My Completed"
          value={stats.done}
          icon={<CheckCircle className="h-5 w-5 text-green-500" />}
        />
      </div>

      <Card className="shadow-md rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Task Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="w-full overflow-x-auto flex sm:justify-start gap-2 rounded-lg p-1 bg-muted">
              <TabsTrigger value="all">
                <List className="mr-2 h-4 w-4" /> All
              </TabsTrigger>
              <TabsTrigger value="client">
                <UserCheck className="mr-2 h-4 w-4" /> Client
              </TabsTrigger>
              {departmentProjectGroups.map((group) => (
                <TabsTrigger
                  key={group.departmentId}
                  value={group.departmentId}
                >
                  {group.departmentName}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <TaskTable tasks={filterDoneTasks(allTasks)} onRefresh={mutate} />
            </TabsContent>
            <TabsContent value="client" className="mt-4">
              <TaskTable tasks={filterDoneTasks(clientTasks)} onRefresh={mutate} />
            </TabsContent>
            {departmentProjectGroups.map((group) => (
              <TabsContent
                key={group.departmentId}
                value={group.departmentId}
                className="mt-4"
              >
                <TaskTable tasks={filterDoneTasks(group.tasks)} onRefresh={mutate} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <TaskFormDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleCreateTask}
      />
    </div>
  );
}

const StatCard = ({
  title,
  value,
  icon,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

const PageLoader = () => (
  <div className="container mx-auto p-8 space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-80" />
    </div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
    <Skeleton className="h-96 w-full" />
  </div>
);