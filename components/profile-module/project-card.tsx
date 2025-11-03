"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import Link from "next/link";
type ProjectMember = {
  user: UserInfo;
};
interface Project {
  id: string;
  name: string;
  dueDate: string | number | Date;
  status: string;
  lead: UserInfo;
  isUseraMember: boolean;
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
    <Card className="hover:shadow-lg transition-shadow flex flex-col ">
      <div
        className="cursor-pointer flex-grow"
        onClick={() =>
          router.push(`/projects/${project.id}/board?workspaceId=${workspaceId}`)
        }
      >
        <div className="flex items-start justify-between ">
          <CardTitle className="flex items-center px-2  ">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex">
                    <Briefcase className="h-4 w-4 mr-2" />
                    <span className="font-semibold capitalize truncate w-64">
                      {project.name}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{project.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
        <CardContent className="flex-grow flex flex-col justify-end gap-4">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span className="font-semibold">Lead:</span>
            <UserAvatar user={project.lead} />
            <span className=" capitalize truncate">
              {project.lead?.name || "N/A"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <Badge
              variant={project.status === "ACTIVE" ? "success" : "secondary"}
            >
              {project.status}
            </Badge>
          </div>

          <div className=" flex flex-col gap-2">
            <p className="font-semibold ">Project Members</p>
            <AvatarGroup>
              {[
                ...project.members.slice(0, 9).map((member, index) => (
                  <Avatar className="w-10 h-10 cursor-pointer" key={index}>
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
                )),
                ...(project.isUseraMember
                  ? []
                  : [
                      <div
                        key="join-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/projects/${project.id}/edit`);
                        }}
                      >
                        <Avatar
                          className="w-10 h-10 cursor-pointer "
                          key="join-button"
                        >
                          <AvatarFallback className=" bg-primary dark:bg-secondary text-white">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <line x1="12" y1="5" x2="12" y2="19"></line>
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                          </AvatarFallback>
                          <AvatarGroupTooltip>
                            <p>Join Project</p>
                          </AvatarGroupTooltip>
                        </Avatar>
                      </div>,
                    ]),
              ]}
            </AvatarGroup>
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
