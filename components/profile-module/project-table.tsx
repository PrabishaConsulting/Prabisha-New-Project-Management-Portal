// FILE: ./components/project-table.tsx

"use client";

import * as React from "react";
import { columns } from "./columns"; // 1. Import Project type and columns definition
import { ProjectDataTable } from "./project-data-table"; // 2. Import the data table component



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
  startDate: string | number | Date;
  dueDate: string | number | Date;
  status: string;
  projectCode: string;
  isUseraMember : boolean;
  lead: UserInfo;
  department?: { id: string; name: string };
  client?: { id: string; name: string };
  internalProduct?: { id: string; name: string };
  members: ProjectMember[];
  _count: {
    tasks: number;
  };
}

export const ProjectTable = ({
  projects,
  workspaceId,
  onDeleteClick,
}: {
  projects: Project[];
  workspaceId: string;
  onDeleteClick: (project: any) => void;
}) => {
  // 3. Generate the column definitions using your imported function.
  // We use React.useMemo to prevent re-creating the columns on every render, which is a performance best practice.
  const tableColumns = React.useMemo(
    () => columns(workspaceId, onDeleteClick),
    [workspaceId, onDeleteClick]
  );

  return (
    // 4. Render the data table, passing the columns and project data to it.
    <ProjectDataTable
      columns={tableColumns}
      data={projects}
      workspaceId={workspaceId}
    />
  );
};
