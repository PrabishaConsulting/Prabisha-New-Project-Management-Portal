"use client";

import useSWR, { mutate } from "swr";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button"; // --- NEW: Import Button ---
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusSelector from "@/app/(pages)/projects/user-work/[userId]/_components/StatusSelector";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  Clock,
  FolderKanban,
  Star,
  CircleHelp,
  List,
  UserCheck,
  PlusCircle,
  LucideSquareMousePointer,
  User2,
} from "lucide-react";
import Link from "next/link";
import { Task as PrismaTask } from "@prisma/client";
import { TaskFormDialog } from "@/components/modals/AddTaskDialog"; // --- NEW: Import the dialog ---
import { Project, User } from "@/types"; // --- NEW: Import types for the dialog ---
import { TaskFormData } from "@/lib/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// --- Types for the main dashboard API response ---
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

// --- NEW: Type for the form context API response ---
interface FormContextData {
  projects: Project[]; // This is the detailed Project type with members and columns
  currentUser: User;
}

// --- API Fetcher ---
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// --- Main Page Component ---
export default function MyWorkPage({ userId }: { userId: string }) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const router = useRouter();

  // --- NEW: State for controlling the dialog visibility ---
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // --- SWR Hook for the main dashboard data ---
  const {
    data: dashboardData,
    error: dashboardError,
    isLoading: isDashboardLoading,
    mutate,
  } = useSWR<MyWorkData>(`/api/users/${userId}/my-work`, fetcher);

  // --- NEW: A separate SWR hook to fetch data needed ONLY for the form ---

  useEffect(() => {
    if (dashboardData) {
      if (dashboardData.allTasks?.length > 0) setActiveTab("all");
      else if (dashboardData.clientTasks?.length > 0) setActiveTab("client");
      else if (dashboardData.departmentProjectGroups?.length > 0)
        setActiveTab(dashboardData.departmentProjectGroups[0].departmentId);
    }
  }, [dashboardData]);

  // --- NEW: The function to handle task creation ---
  const handleCreateTask = async (data: TaskFormData) => {

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      // If the response is not OK, handle the structured error
      if (!response.ok) {
        // Parse the JSON error payload from the API
        const errorData = await response.json();

        // Handle Zod validation errors specifically for a better UX
        if (errorData.code === "VALIDATION_ERROR" && errorData.details) {
          // Combine all validation messages into a single string
          const validationMessages = errorData.details
            .map((issue: any) => issue.message)
            .join("\n");
          toast.error(`Validation Failed:\n${validationMessages}`);
        } else {
          // Handle other server errors (e.g., AppError, UNEXPECTED_ERROR)
          toast.error(errorData.message || "An unknown error occurred.");
        }
        return; // Stop execution
      }

      // --- Success Case ---
      toast.success("Task created successfully!");
      mutate(); // Re-fetch SWR data
    } catch (error) {
      // This catches network errors or if the server is down
      console.error("Failed to submit form:", error);
      toast.error(
        "Could not connect to the server. Please check your network."
      );
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
  {/* Header with Title & Add Task Button */}
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
    <h2 className="text-2xl font-semibold tracking-tight">My Tasks</h2>
    <div className=" ">

    {/* <Button
      className="mt-4 mr-4 sm:mt-0"
      onClick={() => router.push(`/clients/new`)}
    >
      <User2 className="mr-2 h-4 w-4" />
      Add Client
    </Button> */}
    <Button
      className="mt-4 mr-4 sm:mt-0"
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
      Your Performence
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

  {/* Card with Tabs */}
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
        {/* Tab List */}
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

        {/* Tab Contents */}
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

  {/* Dialog */}
  <TaskFormDialog
    isOpen={isDialogOpen}
    onOpenChange={setIsDialogOpen}
    onSubmit={handleCreateTask}
  />
</div>

  );
}
const TaskTable = ({
  tasks,
  onRefresh,
}: {
  tasks: DashboardTask[];
  onRefresh: () => void;
}) => {
  // Your existing component code
  if (!tasks || tasks.length === 0) return <EmptyState />;

const handleRefresh = () => {
    onRefresh(); // This calls SWR's 'mutate' function
    toast.success("Task status updated!");
  };
  return (
    <Table className=" w-full">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[60%]">Task Name</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TableRow key={task.id}>
            <TableCell>
              <Link
                href={`/projects/${task.projectId}/task/${task.id}?workspaceId=${task.workspaceId}`}
                className="group"
              >
                <p className="font-medium capitalize group-hover:underline truncate w-72">
                  {task.title}
                </p>
                <p className="text-sm text-muted-foreground group-hover:underline">
                  Project: {task.project.name}
                </p>
              </Link>
            </TableCell>

            <TableCell>
              {" "}
              <StatusSelector task={task} onUpdate={handleRefresh} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
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
const EmptyState = () => (
  <div className="text-center py-16 border-2 border-dashed rounded-lg">
    <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground" />
    <h3 className="mt-4 text-lg font-medium">No Active Tasks Here</h3>
    <p className="mt-1 text-sm text-muted-foreground">
      Looks like you're all caught up in this category!
    </p>
  </div>
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