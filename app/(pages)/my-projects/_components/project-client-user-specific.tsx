"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import { useDebounce } from "use-debounce";
import axios from "axios";
import { toast } from "sonner";

// Component Imports
import { ProjectCard } from "@/components/profile-module/project-card";
import { ProjectTable } from "@/components/profile-module/project-table";
import { CreateProjectModal } from "@/components/modals/CreateProjectModal";
import { DeleteProjectDialog } from "@/components/modals/DeleteProjectDialog";

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

// Icons
import { Briefcase, Building, CheckCircle, AlertTriangle, FolderKanban, LayoutGrid, List } from "lucide-react";

// --- Types ---
type ViewType = "grid" | "table";

interface UserInfo {
  id: string;
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
  isUseraMember : boolean;
  internalProduct?: { id: string; name: string };
  members: ProjectMember[];
  _count: {
    tasks: number;
  };
}

// Global fetcher for SWR
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error("An error occurred while fetching the data.");
    }
    return res.json();
  });

// --- Main Page Component with Suspense ---
export default function ProjectPage({ activeWorkspaceId } : {activeWorkspaceId: string}) {
  return (
    // useSearchParams requires a Suspense boundary in Next.js App Router
    <Suspense fallback={<DashboardLoader />}>
      <ProjectPageContent activeWorkspaceId={activeWorkspaceId} />
    </Suspense>
  );
}

// --- Content Component with Core Logic ---
function ProjectPageContent( {activeWorkspaceId} : {activeWorkspaceId: string}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutate } = useSWRConfig();

  // --- State Initialization from URL Search Params ---
  const [view, setView] = useState<ViewType>("grid");
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || "",
    status: searchParams.get('status') || "ALL",
    departmentId: searchParams.get('departmentId') || "ALL",
  });
  const [debouncedSearch] = useDebounce(filters.search, 500);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // --- Data Fetching with SWR ---


  const projectsApiUrl = useMemo(() => {
    const params = new URLSearchParams({
      workspaceId: activeWorkspaceId,
      page: page.toString(),
      limit: "12",
      search: debouncedSearch,
      status: filters.status,
      departmentId: filters.departmentId,
    });
    return `/api/data/user-projects?${params.toString()}`;
  }, [ page, debouncedSearch, filters.status, filters.departmentId]);

  const {
    data: projectsData,
    error: projectsError,
    isLoading: isProjectsLoading,
  } = useSWR(projectsApiUrl, fetcher, { keepPreviousData: true });

  const { data: departmentsData } = useSWR(
    `/api/departments`,
    fetcher
  );
  const departments = departmentsData || [];


 const groupedProjects = useMemo(() => {
    const projects = projectsData?.projects || [];
    
    // Group projects by user role
    const leadProjects = projects.filter((p: { currentUserRole: string; }) => p.currentUserRole === 'LEAD');
    const creatorProjects = projects.filter((p: { currentUserRole: string; }) => p.currentUserRole === 'CREATOR');
    const memberProjects = projects.filter((p: { currentUserRole: string; }) => p.currentUserRole === 'MEMBER');
    
    return {
      lead: leadProjects,
      creator: creatorProjects,
      member: memberProjects
    };
  }, [projectsData]);


  // --- Effects ---

  // Effect to update URL when page or filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (filters.status !== 'ALL') params.set('status', filters.status);
    if (filters.departmentId !== 'ALL') params.set('departmentId', filters.departmentId);

    // Using replace to avoid adding to browser history for filter changes
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [page, debouncedSearch, filters, router]);

  useEffect(() => {
    const savedView = localStorage.getItem("projectView") as ViewType;
    if (savedView) setView(savedView);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/sign-in");
  }, [status, router]);


  // --- Handlers ---
  const handleFilterChange = (key: string, value: string) => {
    setPage(1); // Reset to first page on any filter change
    setFilters((prev) => ({ ...prev, [key]: value }));
  };
  
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
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




  if (!activeWorkspaceId) {
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
          <h1 className="text-xl font-bold">My Projects</h1>
          <CreateProjectModal
            workspaceId={activeWorkspaceId}
            onProjectCreated={() => mutate(projectsApiUrl)}
          />
        </div>

        {/* Filters and View Toggle */}
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

        {isProjectsLoading && projects.length === 0 ? (
          view === "grid" ? (
            <ProjectGridLoader />
          ) : (
            <ProjectTableLoader />
          )
        ) : projectsError ? (
          <ErrorState message="Could not load projects." />
        ) : projects.length > 0 ? (
          <>
            {/* Projects by Role Sections */}
            <div className="space-y-8">
              {/* Lead Projects Section */}
              {groupedProjects.lead.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <h2 className="text-lg font-semibold">Projects you lead</h2>
                    <span className="text-sm text-muted-foreground">({groupedProjects.lead.length})</span>
                  </div>
                  {view === "grid" ? (
                    <ProjectGrid
                      projects={groupedProjects.lead}
                      workspaceId={activeWorkspaceId}
                      session={session}
                      onDeleteClick={handleOpenDeleteDialog}
                    />
                  ) : (
                    <ProjectTable
                      projects={groupedProjects.lead}
                      workspaceId={activeWorkspaceId}
                      onDeleteClick={handleOpenDeleteDialog}
                    />
                  )}
                </div>
              )}

              {/* Creator Projects Section */}
              {groupedProjects.creator.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <h2 className="text-lg font-semibold">Your Projects</h2>
                    <span className="text-sm text-muted-foreground">({groupedProjects.creator.length})</span>
                  </div>
                  {view === "grid" ? (
                    <ProjectGrid
                      projects={groupedProjects.creator}
                      workspaceId={activeWorkspaceId}
                      session={session}
                      onDeleteClick={handleOpenDeleteDialog}
                    />
                  ) : (
                    <ProjectTable
                      projects={groupedProjects.creator}
                      workspaceId={activeWorkspaceId}
                      onDeleteClick={handleOpenDeleteDialog}
                    />
                  )}
                </div>
              )}

              {/* Member Projects Section */}
              {groupedProjects.member.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <h2 className="text-lg font-semibold">Projects you're a member of</h2>
                    <span className="text-sm text-muted-foreground">({groupedProjects.member.length})</span>
                  </div>
                  {view === "grid" ? (
                    <ProjectGrid
                      projects={groupedProjects.member}
                      workspaceId={activeWorkspaceId}
                      session={session}
                      onDeleteClick={handleOpenDeleteDialog}
                    />
                  ) : (
                    <ProjectTable
                      projects={groupedProjects.member}
                      workspaceId={activeWorkspaceId}
                      onDeleteClick={handleOpenDeleteDialog}
                    />
                  )}
                </div>
              )}
            </div>

            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        ) : (
          <EmptyState
            onProjectCreated={() => mutate(projectsApiUrl)}
            workspaceId={activeWorkspaceId}
          />
        )}
      </div>
    </>
  );

}


// --- Sub-Components (Unchanged) ---

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