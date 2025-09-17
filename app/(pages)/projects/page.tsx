"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import { useDebounce } from "use-debounce";
import axios from "axios";
import { toast } from "sonner";
import { ProjectCard } from "@/components/profile-module/project-card";
import { ProjectTable } from "@/components/profile-module/project-table";
// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

// Icons
import {
  Pencil,
  Briefcase,
  FolderKanban,
  LayoutGrid,
  List,
  User as UserIcon,
  Building,
  CheckCircle,
  AlertTriangle,
  MoreVertical,
  Trash2 as Delete,
} from "lucide-react";
import { CreateProjectModal } from "@/components/modals/CreateProjectModal";
import { DeleteProjectDialog } from "@/components/modals/DeleteProjectDialog";

// --- Types ---
type ViewType = "grid" | "table";

interface UserInfo {
  id : string

  name: string | null;
  avatar: string | null;
}
type ProjectMember = {
  user: UserInfo;
};
 interface Project {
  id: string;
  name: string;
  dueDate: string | number | Date;
  status: string;
  lead: UserInfo;
  department?: { id: string; name: string };
  client?: { id: string; name: string };
  internalProduct?: { id: string; name: string };
  members: ProjectMember[];
  _count: {
    tasks : number
  }
}

interface DepartmentStats {
  id: string;
  name: string;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
}

// Global fetcher for SWR
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error("An error occurred while fetching the data.");
    }
    return res.json();
  });

// --- Main Page Component ---
export default function ProjectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { mutate } = useSWRConfig();

  const [workspace, setWorkspace] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [view, setView] = useState<ViewType>("grid");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: "",
    status: "ALL",
    departmentId: "ALL",
  });
  const [debouncedSearch] = useDebounce(filters.search, 500);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // --- Data Fetching with SWR ---
  const { data: workspaceData, isLoading: isWorkspaceLoading } = useSWR(
    status === "authenticated" ? "/api/onboarding/check" : null,
    fetcher
  );


  const projectsApiUrl = useMemo(() => {
    if (!workspace) return null;
    const params = new URLSearchParams({
      workspaceId: workspace.id,
      page: page.toString(),
      limit: "12",
      search: debouncedSearch,
      status: filters.status,
      departmentId: filters.departmentId,

    });
    return `/api/data/projects?${params.toString()}`;
  }, [workspace, page, debouncedSearch, filters.status, filters.departmentId]);

  const {
    data: projectsData,
    error: projectsError,
    isLoading: isProjectsLoading,
  } = useSWR(projectsApiUrl, fetcher);

  const { data: departmentsData } = useSWR(
    workspace ? `/api/departments?workspaceId=${workspace.id}` : null,
    fetcher
  );
  const departments = departmentsData || [];

  const { data: departmentStats, isLoading: isStatsLoading } = useSWR(
    workspace ? `/api/stats/departments?workspaceId=${workspace.id}` : null,
    fetcher
  );

  // --- Effects ---
  useEffect(() => {
    const savedView = localStorage.getItem("projectView") as ViewType;
    if (savedView) setView(savedView);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/sign-in");
  }, [status, router]);

  useEffect(() => {
    if (workspaceData) {
      if (!workspaceData.workspaceId) {
        router.replace("/onboarding");
      } else {
        setWorkspace({
          id: workspaceData.workspaceId,
          name: workspaceData.workspaceName,
        });
      }
    }
  }, [workspaceData, router]);

  // --- Handlers ---
  const handleFilterChange = (key: string, value: string) => {
    setPage(1); // Reset to first page on any filter change
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSetView = (newView: ViewType) => {
    setView(newView);
    localStorage.setItem("projectView", newView);
  };

  const handleOpenDeleteDialog = (project: Project) => {
    setProjectToDelete(project);
  };

  const handleCloseDeleteDialog = () => {
    setProjectToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) {
      toast.error("No project selected for deletion.");
      return;
    }

    const promise = axios.delete(
      `/api/users/${session?.user?.id}/project/${projectToDelete.id}`
    );

    toast.promise(promise, {
      loading: "Deleting project...",
      success: () => {
        handleCloseDeleteDialog();
        mutate(projectsApiUrl); // Re-fetch projects list
        return `Project "${projectToDelete.name}" has been deleted.`;
      },
      error: (err) => {
        return err.response?.data?.message || "Failed to delete project.";
      },
    });

    await promise;
  };

  const projects = projectsData?.projects || [];
  const totalPages = projectsData?.totalPages || 1;

  if (isWorkspaceLoading || status === "loading") {
    return <DashboardLoader />;
  }

  if (!workspace) {
    return (
      <div className="flex items-center justify-center h-full text-center">
        <div>
          <h2 className="text-xl font-semibold">Verifying Workspace...</h2>
          <p className="text-muted-foreground">Please wait.</p>
        </div>
      </div>
    );
  }

  // --- Render ---
  return (
    <>
      {projectToDelete && (
        <DeleteProjectDialog
          isOpen={!!projectToDelete}
          onClose={handleCloseDeleteDialog}
          onConfirm={handleConfirmDelete}
          projectName={projectToDelete.name}
        />
      )}
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Projects</h1>
            <p className="text-muted-foreground mt-1">
              Manage all projects for {workspace.name}.
            </p>
          </div>
          <CreateProjectModal
            workspaceId={workspace.id}
            onProjectCreated={() => mutate(projectsApiUrl)}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="projects">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="projects">
              <Briefcase className="h-4 w-4 mr-2" /> Project Overview
            </TabsTrigger>
            <TabsTrigger value="departments">
              <Building className="h-4 w-4 mr-2" /> Department Performance
            </TabsTrigger>
          </TabsList>
          <TabsContent value="projects" className="space-y-4">
            <ProjectFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              departments={departments}
            />
            <div className="flex items-center justify-end">
              <Tabs
                defaultValue={view}
                onValueChange={(v) => handleSetView(v as ViewType)}
              >
                <TabsList>
                  <TabsTrigger value="grid">
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    Grid
                  </TabsTrigger>
                  <TabsTrigger value="table">
                    <List className="h-4 w-4 mr-2" />
                    Table
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {isProjectsLoading ? (
              view === "grid" ? (
                <ProjectGridLoader />
              ) : (
                <ProjectTableLoader />
              )
            ) : projectsError ? (
              <ErrorState message="Could not load projects." />
            ) : projects.length > 0 ? (
              <>
                {view === "grid" ? (
                  <ProjectGrid
                    projects={projects}
                    workspaceId={workspace.id}
                    session={session}
                    onDeleteClick={handleOpenDeleteDialog}
                  />
                ) : (
                  <ProjectTable
                    projects={projects}
                    workspaceId={workspace.id}
                    onDeleteClick={handleOpenDeleteDialog}
                  />
                )}
                <PaginationControls
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </>
            ) : (
              <EmptyState
                onProjectCreated={() => mutate(projectsApiUrl)}
                workspaceId={workspace.id}
              />
            )}
          </TabsContent>
          <TabsContent value="departments">
            {isStatsLoading ? (
              <ProjectTableLoader />
            ) : (
              <DepartmentStatsView stats={departmentStats} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

// --- Sub-Components ---

const ProjectFilters = ({
  filters,
  onFilterChange,
  departments,
}: {
  filters: { search: string; status: string; departmentId: string };
  onFilterChange: (key: string, value: string) => void;
  departments: { id: string; name: string }[];
}) => (
  <Card>
    <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
      <Input
        placeholder="Search by project name..."
        value={filters.search}
        onChange={(e) => onFilterChange("search", e.target.value)}
        className="flex-grow"
      />
      <div className="flex gap-4 w-full md:w-auto">
        <Select
          value={filters.status}
          onValueChange={(value) => onFilterChange("status", value)}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="ON_HOLD">On Hold</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.departmentId}
          onValueChange={(value) => onFilterChange("departmentId", value)}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter by department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Departments</SelectItem>
            {departments?.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </CardContent>
  </Card>
);

const DepartmentStatsView = ({ stats }: { stats: DepartmentStats[] }) => (
  <Card>
    <CardHeader>
      <CardTitle>Department Performance</CardTitle>
      <CardDescription>
        A summary of project distribution and performance across departments.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[140px]">Department</TableHead>
              <TableHead className="text-center">Total Task</TableHead>
              <TableHead className="text-center">Completed</TableHead>
              <TableHead className="text-center">Overdue</TableHead>
              <TableHead className="text-right min-w-[160px]">
                Completion Rate
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats?.map((dept) => (
              <TableRow key={dept.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{dept.name}</TableCell>
                <TableCell className="text-center">{dept.totalTasks}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle size={16} aria-hidden="true" />
                    <span>{dept.completedTasks}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2 text-red-600">
                    <AlertTriangle size={16} aria-hidden="true" />
                    <span>{dept.overdueTasks}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-3">
                    <span className="font-medium min-w-[40px]">
                      {dept.completionRate.toFixed(0)}%
                    </span>
                    <Progress
                      value={dept.completionRate}
                      className="w-20 h-2"
                      aria-label={`${
                        dept.name
                      } completion rate: ${dept.completionRate.toFixed(0)}%`}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
);

const ProjectGrid = ({
  projects,
  workspaceId,
  session,
  onDeleteClick,
}: {
  projects: Project[];
  workspaceId: string;
  session: any;
  onDeleteClick: (project: Project) => void;
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {projects.map((project) => (
      <ProjectCard
        key={project.id}
        project={project}
        workspaceId={workspaceId}
        session={session}
        onDeleteClick={onDeleteClick}
      />
    ))}
  </div>
);


const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => (
  <div className="flex items-center justify-center space-x-2 py-4">
    <Button
      variant="outline"
      size="sm"
      onClick={() => onPageChange(currentPage - 1)}
      disabled={currentPage <= 1}
    >
      Previous
    </Button>
    <span className="text-sm font-medium">
      Page {currentPage} of {totalPages}
    </span>
    <Button
      variant="outline"
      size="sm"
      onClick={() => onPageChange(currentPage + 1)}
      disabled={currentPage >= totalPages}
    >
      Next
    </Button>
  </div>
);

const EmptyState = ({
  workspaceId,
  onProjectCreated,
}: {
  workspaceId: string;
  onProjectCreated: () => void;
}) => (
  <div className="text-center py-16 border-2 border-dashed rounded-lg">
    <FolderKanban className="mx-auto h-12 w-12 text-gray-400" />
    <h3 className="mt-4 text-lg font-medium">
      No projects found for these filters
    </h3>
    <p className="mt-1 text-sm text-muted-foreground">
      Try adjusting your search or create a new project.
    </p>
    <div className="mt-6">
      <CreateProjectModal
        workspaceId={workspaceId}
        onProjectCreated={onProjectCreated}
      />
    </div>
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <Card className="text-center p-8 bg-destructive/10 border-destructive">
    <CardTitle className="text-destructive">An Error Occurred</CardTitle>
    <CardDescription className="text-destructive-foreground">
      {message}
    </CardDescription>
    <Button
      variant="destructive"
      className="mt-4"
      onClick={() => window.location.reload()}
    >
      Refresh Page
    </Button>
  </Card>
);

const DashboardLoader = () => (
  <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
    </div>
  </div>
);

const ProjectGridLoader = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {[...Array(6)].map((_, i) => (
      <Skeleton key={i} className="h-52 w-full" />
    ))}
  </div>
);

const ProjectTableLoader = () => (
  <div className="space-y-2 border rounded-md p-4">
    <Skeleton className="h-10 w-full" />
    {[...Array(4)].map((_, i) => (
      <Skeleton key={i} className="h-12 w-full" />
    ))}
  </div>
);
