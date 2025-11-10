'use client'

import { useState, useEffect, FormEvent } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import { User, Project, Workspace, Role, ProjectStatus, Priority, ProjectType } from '@/app/generated/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Edit, Users, FolderKanban, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

// --- Mock Fetcher for SWR ---
// Replace with your actual API calls
const fetcher = (url: string) => fetch(url).then(res => res.json());

// --- Helper for API calls ---
const api = {
  post: (url: string, data: any) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  patch: (url: string, data: any) => fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
};

// --- Main Admin Panel Component ---
export default function AdminPanelPage() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">Manage users, projects, and workspaces directly.</p>
      </header>
      {/* <Tabs defaultValue="users">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" />User Management</TabsTrigger>
          <TabsTrigger value="projects"><FolderKanban className="w-4 h-4 mr-2" />Project Management</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManagementTab />
        </TabsContent>
        <TabsContent value="projects">
          <ProjectManagementTab />
        </TabsContent>
      </Tabs> */}
    </div>
  );
}


// --- User Management Component ---
function UserManagementTab() {
  const { data: users, error: usersError, isLoading: usersLoading } = useSWR<User[]>('/api/admin/users', fetcher);
  const { data: workspaces } = useSWR<Workspace[]>('/api/admin/workspaces', fetcher);
  const { mutate } = useSWRConfig();
  
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleAddUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const promise = api.post('/api/admin/users', data).then(res => {
      if (!res.ok) throw new Error('Failed to create user.');
      return res.json();
    });

    toast.promise(promise, {
      loading: 'Creating user...',
      success: () => {
        mutate('/api/admin/users');
        setIsAddUserOpen(false);
        return 'User created and added to workspace successfully!';
      },
      error: 'Error creating user.',
    });
  };

  const handleEditUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser) return;
    const formData = new FormData(e.currentTarget);
    const data = { role: formData.get('role') };

    const promise = api.patch(`/api/admin/users/${selectedUser.id}`, data).then(res => {
      if (!res.ok) throw new Error('Failed to update user role.');
      return res.json();
    });

    toast.promise(promise, {
        loading: 'Updating user role...',
        success: () => {
            mutate('/api/admin/users');
            setIsEditUserOpen(false);
            return 'User role updated successfully!';
        },
        error: 'Error updating user role.',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Users</CardTitle>
        <CardDescription>Add new users to workspaces and manage their global roles.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="w-4 h-4 mr-2" /> Add New User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New User to Workspace</DialogTitle></DialogHeader>
            <form onSubmit={handleAddUser} className="space-y-4">
              <Input name="name" placeholder="Full Name" required />
              <Input name="email" type="email" placeholder="Email Address" required />
              <Input name="password" type="password" placeholder="Temporary Password" required />
              <Select name="role" required>
                <SelectTrigger><SelectValue placeholder="Select a global role" /></SelectTrigger>
                <SelectContent>
                  {Object.values(Role).map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select name="workspaceId" required>
                <SelectTrigger><SelectValue placeholder="Select a workspace to join" /></SelectTrigger>
                <SelectContent>
                  {workspaces?.map(ws => <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">Create User</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Global Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersLoading && <TableRow><TableCell colSpan={4}>Loading users...</TableCell></TableRow>}
            {users?.map(user => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell><span className="font-mono text-sm">{user.role}</span></TableCell>
                <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => { setSelectedUser(user); setIsEditUserOpen(true); }}>
                        <Edit className="w-4 h-4" />
                    </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {selectedUser && (
            <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Edit User Role: {selectedUser.name}</DialogTitle></DialogHeader>
                    <form onSubmit={handleEditUser} className="space-y-4">
                         <Select name="role" defaultValue={selectedUser.role} required>
                            <SelectTrigger><SelectValue placeholder="Select a global role" /></SelectTrigger>
                            <SelectContent>
                                {Object.values(Role).map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                            <Button type="submit">Save Changes</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        )}
      </CardContent>
    </Card>
  );
}

// --- Project Management Component ---
function ProjectManagementTab() {
  const { data: projects, isLoading: projectsLoading } = useSWR<Project[]>('/api/admin/projects', fetcher);
  const { mutate } = useSWRConfig();

  
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [dueDate, setDueDate] = useState<Date | undefined>();

  useEffect(() => {
    if (selectedProject?.dueDate) {
      setDueDate(new Date(selectedProject.dueDate));
    }
  }, [selectedProject]);
  
  const handleEditProject = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProject) return;

    const formData = new FormData(e.currentTarget);
    const data = {
        name: formData.get('name'),
        description: formData.get('description'),
        status: formData.get('status'),
        priority: formData.get('priority'),
        projectType: formData.get('projectType'),
        dueDate: dueDate ? dueDate.toISOString() : null,
    };
    
    const promise = api.patch(`/api/admin/projects/${selectedProject.id}`, data).then(res => {
      if (!res.ok) throw new Error('Failed to update project.');
      return res.json();
    });

    toast.promise(promise, {
        loading: 'Updating project...',
        success: () => {
            mutate('/api/admin/projects');
            setIsEditProjectOpen(false);
            return 'Project updated successfully!';
        },
        error: 'Error updating project.',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Projects</CardTitle>
        <CardDescription>Directly edit project details across all workspaces.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {projectsLoading && <TableRow><TableCell colSpan={4}>Loading projects...</TableCell></TableRow>}
                {projects?.map(project => (
                    <TableRow key={project.id}>
                        <TableCell>{project.name}</TableCell>
                        <TableCell><span className="font-mono text-sm">{project.status}</span></TableCell>
                        <TableCell>{project.dueDate ? format(new Date(project.dueDate), 'PPP') : 'N/A'}</TableCell>
                        <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => { setSelectedProject(project); setIsEditProjectOpen(true); }}>
                                <Edit className="w-4 h-4" />
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>

        {selectedProject && (
            <Dialog open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
                <DialogContent className="sm:max-w-[625px]">
                    <DialogHeader><DialogTitle>Edit Project: {selectedProject.name}</DialogTitle></DialogHeader>
                    <form onSubmit={handleEditProject} className="space-y-4">
                        <Input name="name" defaultValue={selectedProject.name} placeholder="Project Name" required />
                        <Textarea name="description" defaultValue={selectedProject.description || ''} placeholder="Project Description" />
                        <div className="grid grid-cols-2 gap-4">
                            <Select name="status" defaultValue={selectedProject.status} required>
                                <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                                <SelectContent>{Object.values(ProjectStatus).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select name="priority" defaultValue={selectedProject.priority} required>
                                <SelectTrigger><SelectValue placeholder="Select Priority" /></SelectTrigger>
                                <SelectContent>{Object.values(Priority).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select name="projectType" defaultValue={selectedProject.projectType} required>
                                <SelectTrigger><SelectValue placeholder="Select Project Type" /></SelectTrigger>
                                <SelectContent>{Object.values(ProjectType).map(pt => <SelectItem key={pt} value={pt}>{pt}</SelectItem>)}</SelectContent>
                            </Select>
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={"w-full justify-start text-left font-normal"}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dueDate ? format(dueDate, "PPP") : <span>Pick a due date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus/>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                            <Button type="submit">Save Project Changes</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        )}
      </CardContent>
    </Card>
  );
}