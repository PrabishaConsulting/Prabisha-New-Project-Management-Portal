"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MoreHorizontal,
  Pencil,
  Briefcase,
  Delete,
  User2Icon as UserIcon,
} from "lucide-react";
import {
  AvatarGroup,
  AvatarGroupTooltip,
} from "@/components/ui/shadcn-io/avatar-group";
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
interface UserInfo {
  id: string;

  name: string | null;
  avatar: string | null;
}
export const ProjectCard = ({
  project,
  workspaceId,
  session,
  onDeleteClick,
}: {
  project: Project;
  workspaceId: string;
  session: any;
  onDeleteClick: (project: Project) => void;
}) => {
  const router = useRouter();
  const getInitials = (name = "") =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  return (
    <Card className="hover:shadow-lg transition-shadow flex flex-col">
      <div
        className="cursor-pointer flex-grow"
        onClick={() =>
          router.push(`/projects/${project.id}?workspaceId=${workspaceId}`)
        }
      >
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="flex items-center gap-3">
              <Briefcase className="h-6 w-6 text-primary" />
              <span className="font-semibold">{project.name}</span>
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => e.stopPropagation()}
                  className="h-8 w-8 flex-shrink-0"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem
                  onClick={() => router.push(`/projects/${project.id}/edit`)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDeleteClick(project)}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <Delete className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardDescription>
            {project.department
              ? `Dept: ${project.department.name}`
              : "No department"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col justify-end gap-4">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span className="font-semibold">Lead:</span>
            <UserAvatar user={project.lead} />
            <span>{project.lead?.name || "N/A"}</span>
          </div>
          <div className="flex items-center justify-between">
            <Badge
              variant={project.status === "ACTIVE" ? "success" : "secondary"}
            >
              {project.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Due: {new Date(project.dueDate).toLocaleDateString()}
            </span>
            <span>
              <AvatarGroup>
                  {project.members.slice(0, 6).map((member, index) => (
                    <Avatar className="w-8 h-8 cursor-pointer" key={index}>
                      <AvatarImage
                        className="object-cover"
                        src={member.user.avatar || ""}
                        alt={`${member.user.name}'s avatar`}
                      />
                      <AvatarFallback>
                        {getInitials(member.user?.name || "")}
                      </AvatarFallback>
                      <AvatarGroupTooltip>
                        <p>{member.user.name}</p>
                      </AvatarGroupTooltip>
                    </Avatar>
                  ))}
               
              </AvatarGroup>
            </span>
          </div>
        </CardContent>
      </div>
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
