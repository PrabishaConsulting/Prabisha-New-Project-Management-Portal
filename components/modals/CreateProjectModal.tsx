"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus } from "lucide-react";
import { AddInternalProductModal } from "./AddInternalProductModal"; // --- NEW --- Import the new modal

// --- UPDATED --- Define types for all fetched data
interface Department {
  id: string;
  name: string;
}

interface Client {
  id: string;
  name: string;
}

interface InternalProduct {
  id: string;
  name: string;
}

interface CreateProjectModalProps {
  workspaceId: string;
  onProjectCreated?: (newProject: any) => void;
}

export function CreateProjectModal({
  workspaceId,
  onProjectCreated,
}: CreateProjectModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // --- UPDATED --- State for form fields
  const [projectName, setProjectName] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [isClientProject, setIsClientProject] = useState(false); // Renamed for clarity
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedInternalProductId, setSelectedInternalProductId] = useState(""); // --- NEW ---

  // --- UPDATED --- State for data fetched from API
  const [departments, setDepartments] = useState<Department[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [internalProducts, setInternalProducts] = useState<InternalProduct[]>([]); // --- NEW ---

  // --- UPDATED --- Fetch all data when modal opens
  const fetchData = async () => {
    try {
      // --- NEW --- Fetch internal products alongside other data
      const [deptRes, clientRes, internalProductRes] = await Promise.all([
        fetch("/api/departments"),
        fetch("/api/get/users?userType=CLIENT"),
        fetch("/api/internal-products"), // Assumes you create this API endpoint
      ]);

      if (!deptRes.ok || !clientRes.ok || !internalProductRes.ok) {
        throw new Error("Failed to load required data for the form.");
      }

      const departmentsData = await deptRes.json();
      const usersData = await clientRes.json();
      const internalProductsData = await internalProductRes.json(); // --- NEW ---

      setDepartments(departmentsData || []);
      setClients(usersData || []);
      setInternalProducts(internalProductsData || []); // --- NEW ---
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch initial data.");
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // --- UPDATED --- Reset all relevant form fields
  const resetForm = () => {
    setProjectName("");
    setSelectedDepartmentId("");
    setIsClientProject(false);
    setSelectedClientId("");
    setSelectedInternalProductId(""); // --- NEW ---
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    setIsOpen(open);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!projectName || isLoading) return;
    
    // --- UPDATED --- Validation logic
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
    
    // --- UPDATED --- Construct the payload for the backend
    const payload = {
      name: projectName,
      workspaceId,
      departmentId: selectedDepartmentId,
      isClientProject: isClientProject,
      clientId: isClientProject ? selectedClientId : null,
      internalProductId: !isClientProject ? selectedInternalProductId : null,
    };
    console.log(payload);
    toast.promise(
      fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create project.");
        }
        return response.json();
      }),
      {
        loading: "Creating project...",
        success: (data) => {
          handleOpenChange(false);
          if (onProjectCreated) {
            onProjectCreated(data.project);
          } else {
            router.refresh();
          }
          setIsLoading(false);
          return `Project "${data.project.name}" created successfully!`;
        },
        error: (err) => {
          setIsLoading(false);
          return err.message;
        },
      }
    );
  };

  return (
    <>
      <Button onClick={() => handleOpenChange(true)}>
        <Plus className="mr-2 h-4 w-4" />
        New Project
      </Button>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create a new project</DialogTitle>
            <DialogDescription>
              Fill in the details for your new project to get started.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Project Name and Department (No changes) */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="col-span-3" placeholder="e.g., Video Creation" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="department" className="text-right">Department</Label>
                <Select onValueChange={setSelectedDepartmentId} value={selectedDepartmentId}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Select a department" /></SelectTrigger>
                  <SelectContent>{departments.map((dept) => (<SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>

              {/* --- UPDATED --- Client Project Switch */}
              <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <Label htmlFor="is-client-project">External Client Project</Label>
                  <p className="text-xs text-muted-foreground">
                    Is this project for a paying client?
                  </p>
                </div>
                <Switch id="is-client-project" checked={isClientProject} onCheckedChange={setIsClientProject} />
              </div>

              {/* --- UPDATED --- Conditional Client/Product Select */}
              {isClientProject ? (
                // Show External Clients Dropdown
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="client" className="text-right">Client</Label>
                  <Select onValueChange={setSelectedClientId} value={selectedClientId}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder="Select a client" /></SelectTrigger>
                    <SelectContent>{clients.map((client) => (<SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              ) : (
                // Show Internal Products Dropdown
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="internal-product" className="text-right">Client</Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <Select onValueChange={setSelectedInternalProductId} value={selectedInternalProductId}>
                      <SelectTrigger><SelectValue placeholder="Select a product" /></SelectTrigger>
                      <SelectContent>{internalProducts.map((prod) => (<SelectItem key={prod.id} value={prod.id}>{prod.name}</SelectItem>))}</SelectContent>
                    </Select>
                    {/* --- NEW --- Button to open the "Add Product" modal */}
                    <AddInternalProductModal onProductAdded={fetchData}  name=""/>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? "Creating..." : "Create Project"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}