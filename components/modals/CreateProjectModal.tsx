"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, X, UserPlus } from "lucide-react";
import { AddInternalProductModal } from "./AddInternalProductModal";

// Define types for the form data
interface Department {
  id: string;
  name: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
}

interface InternalProduct {
  id: string;
  name: string;
}

interface WorkspaceMember {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string;
  };
  role: string;
}

interface FormData {
  departments: Department[];
  clients: Client[];
  internalProducts: InternalProduct[];
  workspaceMembers: WorkspaceMember[];
}

interface CreateProjectModalProps {
  workspaceId: string;
  onProjectCreated?: (newProject: any) => void;
}

// SWR fetcher function
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function CreateProjectModal({
  workspaceId,
  onProjectCreated,
}: CreateProjectModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  // Form state
  const [projectName, setProjectName] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [isClientProject, setIsClientProject] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedInternalProductId, setSelectedInternalProductId] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<WorkspaceMember[]>([]);

  // Fetch form data using SWR
  const {
    data: formData,
    error,
    mutate,
  } = useSWR<FormData>(
    isOpen ? `/api/project-form-data?workspaceId=${workspaceId}` : null,
    fetcher
  );

  // Extract data from formData
  const departments = formData?.departments || [];
  const clients = formData?.clients || [];
  const internalProducts = formData?.internalProducts || [];
  const workspaceMembers = formData?.workspaceMembers || [];

  // Find workspace owner and current user
  const workspaceOwner = workspaceMembers.find((m) => m.role === "OWNER");
  const currentUser = workspaceMembers.find((m) => m.user.id === session?.user?.id);

  const resetForm = () => {
    setProjectName("");
    setSelectedDepartmentId("");
    setIsClientProject(false);
    setSelectedClientId("");
    setSelectedInternalProductId("");
    setSelectedMembers([]);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    setIsOpen(open);
  };

  const handleMemberSelect = (member: WorkspaceMember) => {
    // Don't allow adding the current user since they're automatically included
    if (member.user.id === session?.user?.id) return;
    
    if (!selectedMembers.some((m) => m.id === member.id)) {
      setSelectedMembers([...selectedMembers, member]);
    }
  };

  const handleMemberRemove = (memberId: string) => {
    setSelectedMembers(selectedMembers.filter((m) => m.id !== memberId));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!projectName || isLoading) return;
    
    if (!selectedDepartmentId) {
      toast.error("Please select a department for this project.");
      return;
    }
    if (isClientProject && !selectedClientId) {
      toast.error("Please select an external client.");
      return;
    }
    if (!isClientProject && !selectedInternalProductId) {
      toast.error("Please select an internal product.");
      return;
    }
    
    setIsLoading(true);
    
    // Get all member IDs including:
    // 1. Current user (will be lead and creator)
    // 2. Workspace owner (if different from current user)
    // 3. Selected members
    const memberIds = [
      session?.user?.id, // Current user is always included
      ...(workspaceOwner && workspaceOwner.user.id !== session?.user?.id ? [workspaceOwner.user.id] : []),
      ...selectedMembers.map(m => m.user.id)
    ].filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates
    
    const payload = {
      name: projectName,
      workspaceId,
      departmentId: selectedDepartmentId,
      isClientProject: isClientProject,
      clientId: isClientProject ? selectedClientId : null,
      internalProductId: !isClientProject ? selectedInternalProductId : null,
      memberIds: memberIds,
    };
    
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Handle specific error messages
        if (data.error && typeof data.error === 'string') {
          if (data.error.includes("already exists in this workspace")) {
            toast.error("A project with this name already exists in this workspace. Please choose a different name.");
          } else if (data.error.includes("Transaction timeout")) {
            toast.error("The request timed out. Please try again with fewer members.");
          } else {
            toast.error(data.error || "Failed to create project.");
          }
        } else if (data.error && Array.isArray(data.error)) {
          // Handle Zod validation errors
          const errorMessages = data.error.map((err: any) => err.message).join(", ");
          toast.error(`Validation failed: ${errorMessages}`);
        } else {
          toast.error("Failed to create project.");
        }
        setIsLoading(false);
        return;
      }
      
      toast.success(`Project "${data.project.name}" created successfully!`);
      handleOpenChange(false);
      
      if (onProjectCreated) {
        onProjectCreated(data.project);
      } else {
        router.refresh();
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => handleOpenChange(true)}>
        <Plus className="mr-2 h-4 w-4" />
        New Project
      </Button>

      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent className="sm:max-w-[600px] w-full px-4 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create a new project</SheetTitle>
            <SheetDescription>
              Fill in the details for your new project to get started.
            </SheetDescription>
          </SheetHeader>

          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md">
              Failed to load form data. Please try again.
            </div>
          )}

          {!formData ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 py-4">
              <div className="grid gap-4">
                {/* Project Name and Department */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="col-span-3"
                    placeholder="e.g., Video Creation"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="department" className="text-right">
                    Department
                  </Label>
                  <Select
                    onValueChange={setSelectedDepartmentId}
                    value={selectedDepartmentId}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Client Project Switch */}
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <Label htmlFor="is-client-project">
                      External Client Project
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Is this project for a paying client?
                    </p>
                  </div>
                  <Switch
                    id="is-client-project"
                    checked={isClientProject}
                    onCheckedChange={setIsClientProject}
                  />
                </div>
                
                {/* Conditional Client/Product Select */}
                {isClientProject ? (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="client" className="text-right">
                      Client
                    </Label>
                    <Select
                      onValueChange={setSelectedClientId}
                      value={selectedClientId}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="internal-product" className="text-right">
                      Product
                    </Label>
                    <div className="col-span-3 flex items-center gap-2">
                      <Select
                        onValueChange={setSelectedInternalProductId}
                        value={selectedInternalProductId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                        <SelectContent>
                          {internalProducts.map((prod) => (
                            <SelectItem key={prod.id} value={prod.id}>
                              {prod.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <AddInternalProductModal
                        onProductAdded={() => mutate()}
                        name=""
                      />
                    </div>
                  </div>
                )}
                
                {/* Project Members Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Project Members</Label>
                    <span className="text-sm text-muted-foreground">
                      {selectedMembers.length + 1} members
                      {/* +1 for current user who is always included */}
                    </span>
                  </div>
                  
                  {/* Current User (always included as lead and creator) */}
                  {currentUser && (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={currentUser.user.avatar || ""} />
                          <AvatarFallback>
                            {currentUser.user.name?.charAt(0).toUpperCase() || 
                             currentUser.user.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {currentUser.user.name || currentUser.user.email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Project Lead (You)
                          </p>
                        </div>
                      </div>
                      <Badge variant="default">Lead</Badge>
                    </div>
                  )}
                  
                  {/* Workspace Owner (if different from current user) */}
                  {workspaceOwner && workspaceOwner.user.id !== session?.user?.id && (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={workspaceOwner.user.avatar || ""} />
                          <AvatarFallback>
                            {workspaceOwner.user.name?.charAt(0).toUpperCase() || 
                             workspaceOwner.user.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {workspaceOwner.user.name || workspaceOwner.user.email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Workspace Owner
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">Owner</Badge>
                    </div>
                  )}
                  
                  {/* Selected Members */}
                  {selectedMembers.length > 0 && (
                    <div className="space-y-2">
                      {selectedMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.user.avatar || ""} />
                              <AvatarFallback>
                                {member.user.name?.charAt(0).toUpperCase() ||
                                  member.user.email.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {member.user.name || member.user.email}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {member.role}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMemberRemove(member.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Add Members */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Add Members</Label>
                    {workspaceMembers.filter(
                      (member) =>
                        // Filter out current user and already selected members
                        member.user.id !== session?.user?.id &&
                        !selectedMembers.some((m) => m.id === member.id)
                    ).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {workspaceMembers
                          .filter(
                            (member) =>
                              member.user.id !== session?.user?.id &&
                              !selectedMembers.some((m) => m.id === member.id)
                          )
                          .map((member) => (
                            <Button
                              key={member.id}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleMemberSelect(member)}
                              className="flex items-center gap-2"
                            >
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={member.user.avatar || ""} />
                                <AvatarFallback className="text-xs">
                                  {member.user.name?.charAt(0).toUpperCase() ||
                                    member.user.email.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate max-w-[100px]">
                                {member.user.name || member.user.email}
                              </span>
                              <UserPlus className="h-3 w-3" />
                            </Button>
                          ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        All workspace members are already added
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <SheetFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Project"}
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}