"use client";

import useSWR from "swr";
import { useMemo, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ProjectTable } from "@/components/kanban/project-table";
import { ProjectContext } from "@/context/project-context";
import {
  type Task,
  type ProjectMember,
  type User,
  type Project,
} from "@/app/generated/client";

type TaskWithAssignee = Task & {
  assignee: { id: string; name: string | null; avatar: string | null } | null;
};

type MemberWithUser = ProjectMember & { user: User };

interface PaginationMeta {
  page: number;
  limit: number;
  totalTasks: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

type BoardData = {
  project: Project & { members: MemberWithUser[] };
  tasks: TaskWithAssignee[];
  pagination: PaginationMeta;
};

interface ProjectBoardProps {
  projectId: string;
  currentUserId: string;
}

// ---- SWR Fetcher ----
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch project board data");
  return res.json();
};

export default function ProjectList({ projectId, currentUserId }: ProjectBoardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read `page` from URL
  const initialPage = Number(searchParams.get("page")) || 1;
  const [page, setPage] = useState(initialPage);
  const limit = 10; // can make dynamic later

  // Update URL when page changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.replace(`?${params.toString()}`);
  }, [page]);

  const {
    data: boardData,
    error,
    isLoading,
    mutate,
  } = useSWR<BoardData>(
    projectId ? `/api/projects/${projectId}/board-data?page=${page}&limit=${limit}` : null,
    fetcher
  );

  const contextValue = useMemo(() => {
    if (!boardData?.project) return null;
    return {
      workspaceId: boardData.project.workspaceId,
      projectId,
    };
  }, [boardData, projectId]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-foreground">
        Loading project board...
      </div>
    );
  }

  if (error || !boardData) {
    return (
      <div className="flex h-full items-center justify-center text-destructive">
        Failed to load project data.
      </div>
    );
  }

  const { tasks, pagination } = boardData;

  const handleNext = () => {
    if (pagination.hasNextPage) setPage((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (pagination.hasPrevPage) setPage((prev) => prev - 1);
  };

  return (
    <ProjectContext.Provider value={contextValue}>
      <div className="h-full flex flex-col bg-background text-foreground">
        <main className="flex-1 overflow-y-auto">
          <ProjectTable
            tasks={tasks}
            onTaskUpdate={() => mutate()}
            pagination={pagination}
            onNext={handleNext}
            onPrev={handlePrev}
          />
        </main>
      </div>
    </ProjectContext.Provider>
  );
}
