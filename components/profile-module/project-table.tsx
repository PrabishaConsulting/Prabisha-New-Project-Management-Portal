"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Pencil,
  Delete,
  User2Icon as UserIcon,
  MoreVertical,
} from "lucide-react";

import { useRouter } from "next/navigation";
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
  onDeleteClick: (project: Project) => void;
}) => {
  const router = useRouter();

  return (
    <Card className=" ">
      <Table className=" ">
        <TableHeader>
          <TableRow>
            <TableHead  >Id</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Task No</TableHead>
            <TableHead className="hidden md:table-cell">Client Name</TableHead>
            <TableHead className="hidden md:table-cell">Department</TableHead>
            <TableHead>Lead</TableHead>
            <TableHead className="hidden lg:table-cell">Due Date</TableHead>
            <TableHead className="text-right">Status</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id}>
              <TableCell
                onClick={() =>
                  router.push(
                    `/projects/${project.id}?workspaceId=${workspaceId}`
                  )
                }
                // Use a max-width for flexibility and add truncate
                className="max-w-2xs font-medium cursor-pointer hover:underline capitalize truncate"
              >
                {project.id.toString().slice(-4)}
              </TableCell>
              <TableCell
                onClick={() =>
                  router.push(
                    `/projects/${project.id}?workspaceId=${workspaceId}`
                  )
                }
                // Use a max-width for flexibility and add truncate
                className="max-w-3xs font-medium cursor-pointer hover:underline capitalize truncate"
              >
                {project.name}
              </TableCell>
              <TableCell
                onClick={() =>
                  router.push(
                    `/projects/${project.id}?workspaceId=${workspaceId}`
                  )
                }
                className="font-medium  cursor-pointer hover:underline"
              >
                {project._count.tasks}
              </TableCell>
              <TableCell
                onClick={() =>
                  router.push(
                    `/projects/${project.id}?workspaceId=${workspaceId}`
                  )
                }
                className="font-medium cursor-pointer hover:underline"
              >
                {project.internalProduct?.name || project.client?.name || "N/A"}
              </TableCell>
              <TableCell
                onClick={() =>
                  router.push(
                    `/projects/${project.id}?workspaceId=${workspaceId}`
                  )
                }
                className="hidden md:table-cell cursor-pointer"
              >
                {project.department?.name || "N/A"}
              </TableCell>
              <TableCell
                onClick={() =>
                  router.push(
                    `/projects/${project.id}?workspaceId=${workspaceId}`
                  )
                }
                className="cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <UserAvatar user={project.lead} />
                  <span className="font-medium">
                    {project.lead?.name || "N/A"}
                  </span>
                </div>
              </TableCell>
              <TableCell
                onClick={() =>
                  router.push(
                    `/projects/${project.id}?workspaceId=${workspaceId}`
                  )
                }
                className="hidden lg:table-cell text-muted-foreground cursor-pointer"
              >
                {new Date(project.dueDate).toLocaleDateString()}
              </TableCell>
              <TableCell
                onClick={() =>
                  router.push(
                    `/projects/${project.id}?workspaceId=${workspaceId}`
                  )
                }
                className="text-right cursor-pointer"
              >
                <Badge
                  variant={
                    project.status === "ACTIVE" ? "success" : "secondary"
                  }
                >
                  {project.status}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => e.stopPropagation()}
                      className="h-8 w-8"
                    >
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Open project menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(`/projects/${project.id}/edit`)
                      }
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDeleteClick(project)}
                      className="text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                      <Delete className="mr-2 h-4 w-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};

const UserAvatar = ({ user }: { user: UserInfo | null }) => {
  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "";
  return (
    <Avatar className="h-6 w-6">
      <AvatarImage
        className="object-cover"
        src={user?.avatar || undefined}
        alt={user?.name || ""}
      />
      <AvatarFallback>
        {initials || <UserIcon className="h-4 w-4" />}
      </AvatarFallback>
    </Avatar>
  );
};
