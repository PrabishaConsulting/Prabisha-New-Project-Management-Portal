export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: 'ADMIN' | 'MANAGER' | 'MEMBER'
  createdAt: Date
  updatedAt: Date
}

export interface Department {
  id     : String   
  name    :String  
  project : Project[]
  users  : User[]

}
export interface Workspace {
  id: string
  name: string
  description?: string
  ownerId: string
  createdAt: Date
  updatedAt: Date
  owner: User
  members: WorkspaceMember[]
  projects: Project[]
}

export interface WorkspaceMember {
  id: string
  workspaceId: string
  userId: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  joinedAt: Date
  workspace: Workspace
  user: User
}

export interface Project {
  lead: any
  id: string
  name: string
  description?: string
  workspaceId: string
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  startDate?: Date
  dueDate?: Date
  createdBy: string
  createdAt: Date
  updatedAt: Date
  workspace: Workspace
  departments: Department[]
  creator: User
  members: ProjectMember[]
  tasks: Task[]
  activityLogs: ActivityLog[]
}

export interface ProjectMember {
  id: string
  projectId: string
  userId: string
  role: 'LEAD' | 'MEMBER'
  assignedAt: Date
  project: Project
  user: User
}


export interface Task {
  id: string
  title: string
  description?: string
  columnId: string
  projectId: string
  assigneeId?: string
  reporterId: string
  position: number
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'TO_DO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
  estimatedHours?: number
  actualHours: number
  startDate?: Date
  dueDate?: Date
  createdAt: Date
  updatedAt: Date
  project: Project
  assignee?: User
  reporter: User
  comments: TaskComment[]
  timeEntries: TimeEntry[]
  attachments: TaskAttachment[]
  activityLogs: ActivityLog[]
}

export interface TaskComment {
  id: string
  taskId: string
  userId: string
  content: string
  createdAt: Date
  updatedAt: Date
  task: Task
  user: User
}

export interface TimeEntry {
  id: string
  taskId: string
  userId: string
  description?: string
  hours: number
  date: Date
  createdAt: Date
  updatedAt: Date
  task: Task
  user: User
}

export interface TaskAttachment {
  id: string
  taskId: string
  userId: string
  filename: string
  url: string
  fileSize?: number
  mimeType?: string
  uploadedAt: Date
  task: Task
  user: User
}

export interface ActivityLog {
  id: string
  userId: string
  projectId: string
  taskId?: string
  action: string
  description?: string
  metadata?: any
  createdAt: Date
  user: User
  project: Project
  task?: Task
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TaskStatus {
  TO_DO = 'TO_DO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE',
}

export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
export type Role = 'ADMIN' | 'MANAGER' | 'MEMBER'
export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER'
export type ProjectRole = 'LEAD' | 'MEMBER' 