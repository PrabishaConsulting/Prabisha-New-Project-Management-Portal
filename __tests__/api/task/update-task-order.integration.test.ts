import { POST } from '@/app/api/tasks/update-order/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { ProjectRole, TaskStatus, User, Project, Workspace } from '@/app/generated/client';

// We ONLY mock the external dependency: next-auth's session retrieval
jest.mock('next-auth');
const mockGetServerSession = getServerSession as jest.Mock;

describe('API Integration Test: POST /api/tasks/update-order', () => {

  // Disconnect from the database after all tests in this file are complete
  afterAll(async () => {
    await db.$disconnect();
  });

  // --- Test Case 1: The "Happy Path" ---
  it('should succeed when a LEAD user updates a task', async () => {
    let workspaceId: string | null = null;
    let userId: string | null = null;
    
    try {
      // --- Arrange: Create all necessary data in the database ---
      const user = await db.user.create({ 
        data: { email: `lead-integration-${Date.now()}@example.com`, name: 'Lead User' } 
      });
      userId = user.id;

      const workspace = await db.workspace.create({
        data: { name: 'Integration Test Workspace', ownerId: user.id }
      });
      workspaceId = workspace.id;
      
      const project = await db.project.create({ 
        data: { name: 'Integration Project', createdBy: user.id, workspaceId: workspace.id } 
      });
      
      await db.projectMember.create({ 
        data: { projectId: project.id, userId: user.id, role: ProjectRole.LEAD } 
      });

      const task = await db.task.create({ 
        data: { 
          title: 'Integration Task', 
          position: 0, 
          status: TaskStatus.TO_DO, 
          projectId: project.id, 
          reporterId: user.id 
        } 
      });

      mockGetServerSession.mockResolvedValue({ user: { id: user.id } });

      const requestBody = {
        tasks: [{ id: task.id, position: 1, status: TaskStatus.DONE }],
        projectId: project.id,
      };

      const request = new NextRequest('http://localhost/api/tasks/update-order', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      // --- Act: Call the API endpoint ---
      const response = await POST(request);
      
      // --- Assert ---
      expect(response.status).toBe(200);

      const updatedTask = await db.task.findUnique({ where: { id: task.id } });
      expect(updatedTask?.status).toBe(TaskStatus.DONE);
      expect(updatedTask?.position).toBe(1);

    } finally {
      // --- Cleanup: Delete the top-level records ---
      if (workspaceId) await db.workspace.delete({ where: { id: workspaceId } }).catch(console.error);
      if (userId) await db.user.delete({ where: { id: userId } }).catch(console.error);
    }
  });

  // --- Test Case 2: The "Failure Path" ---
  it('should return a 403 Forbidden error for a non-project member', async () => {
    let workspaceId: string | null = null;
    let ownerId: string | null = null;
    let nonMemberId: string | null = null;
    
    try {
        const owner = await db.user.create({ data: { email: `owner-integration-${Date.now()}@example.com` , name: 'Owner User' }});
        ownerId = owner.id;
        const nonMember = await db.user.create({ data: { email: `non-member-integration-${Date.now()}@example.com` , name: 'Non-Member User' }});
        nonMemberId = nonMember.id;

        const workspace = await db.workspace.create({ data: { name: 'Auth Integration Workspace', ownerId: owner.id }});
        workspaceId = workspace.id;
        const project = await db.project.create({ data: { name: 'Auth Integration Project', createdBy: owner.id, workspaceId: workspace.id }});
        const task = await db.task.create({ data: { title: 'Auth Test Task', position: 0, projectId: project.id, reporterId: owner.id }});

        mockGetServerSession.mockResolvedValue({ user: { id: nonMember.id } });

        const requestBody = {
            tasks: [{ id: task.id, position: 1, status: TaskStatus.DONE }],
            projectId: project.id,
        };

        const request = new NextRequest('http://localhost/api/tasks/update-order', {
            method: 'POST',
            body: JSON.stringify(requestBody),
        });

        const response = await POST(request);

        expect(response.status).toBe(403);
        const responseBody = await response.json();
        expect(responseBody.error).toBe('You are not a member of this project.');
        
    } finally {
        if (workspaceId) await db.workspace.delete({ where: { id: workspaceId } }).catch(console.error);
        if (ownerId) await db.user.delete({ where: { id: ownerId } }).catch(console.error);
        if (nonMemberId) await db.user.delete({ where: { id: nonMemberId } }).catch(console.error);
    }
  });
});