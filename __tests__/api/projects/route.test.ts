/**
 * @jest-environment node
 */
import { POST } from '@/app/api/projects/route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { ProjectStatus, Priority } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { hasUserRole } from '@/services/role-services/has-user-role.service';
import { getUserByEmail } from '@/utils/helper-server-function';
import { createProjectInDb } from '@/services/project-service/create-project.service';
import { ProjectCreationError } from '@/utils/errors';

jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));
// --- MOCKS ---
jest.mock('@/lib/db', () => ({
  db: {
    project: { create: jest.fn() },
    user: { findUnique: jest.fn() },
    department: { findUnique: jest.fn() },
    workspace: { findUnique: jest.fn() },
  },
}));

jest.mock('@/services/role-services/has-user-role.service');
jest.mock('@/utils/helper-server-function');
jest.mock('@/services/project-service/create-project.service');

// --- TYPE ASSERTIONS FOR MOCKS ---
const mockedProjectCreate = db.project.create as jest.Mock;
const mockedUserFindUnique = db.user.findUnique as jest.Mock;
const mockedDepartmentFindUnique = db.department.findUnique as jest.Mock;
const mockedWorkspaceFindUnique = db.workspace.findUnique as jest.Mock;
const mockedGetServerSession = getServerSession as jest.Mock;
const mockedHasUserRole = hasUserRole as jest.Mock;
const mockedGetUserByEmail = getUserByEmail as jest.Mock;
const mockedCreateProjectInDb = createProjectInDb as jest.Mock;

describe('POST /api/projects', () => {
  const mockUserId = 'clwqcac2a0003356v1a2b3c4d';
  const mockWorkspaceId = 'clwqcac2a0002356v4n5b7f9d';
  const mockDepartmentId = 'clwqcac2a0001356v6q7g8h2k';
  const mockInternalProductId = 'clwqcac2a0000356v9j4d5m3i';
  
  const mockUser = {
    id: mockUserId,
    name: 'Test User',
    email: 'test@example.com',
    role: 'ADMIN',
  };

  const mockProjectPayload = {
    name: 'New Project',
    workspaceId: mockWorkspaceId,
    departmentId: mockDepartmentId,
    isClientProject: false,
    internalProductId: mockInternalProductId,
  };

  const mockCreatedProject = {
    id: 'clwqcac2a0000356v9j4d5m3j',
    name: 'New Project',
    workspaceId: mockWorkspaceId,
    departmentId: mockDepartmentId,
    isClientProject: false,
    internalProductId: mockInternalProductId,
    status: ProjectStatus.ACTIVE,
    priority: Priority.MEDIUM,
    dueDate: new Date().toString(),
    description: null,
    userId: mockUserId,
    createdAt: new Date().toString(),
    updatedAt: new Date().toString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    mockedGetUserByEmail.mockResolvedValue({ success: true, error: null, user: mockUser });
    mockedHasUserRole.mockResolvedValue(true);
    mockedUserFindUnique.mockResolvedValue(mockUser);
    mockedDepartmentFindUnique.mockResolvedValue({ id: mockDepartmentId, name: 'Test Department' });
    mockedWorkspaceFindUnique.mockResolvedValue({ id: mockWorkspaceId, name: 'Test Workspace' });
    mockedCreateProjectInDb.mockResolvedValue({ project: mockCreatedProject, creatorId: mockUserId });
  });

  const createMockRequest = (body: object) => {
    return new NextRequest('http://localhost/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  it('should return 401 Unauthorized if no session is found', async () => {
    mockedGetServerSession.mockResolvedValue(null);
    const req = createMockRequest(mockProjectPayload);
    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it('should return 404 Not Found if the user does not exist', async () => {
    mockedGetUserByEmail.mockResolvedValue({ success: false, error: 'User not found', user: null });
    const req = createMockRequest(mockProjectPayload);
    const response = await POST(req);
    expect(response.status).toBe(404);
  });

  it('should return 403 Forbidden if the user is not an admin', async () => {
    mockedHasUserRole.mockResolvedValue(false);
    const req = createMockRequest(mockProjectPayload);
    const response = await POST(req);
    expect(response.status).toBe(403);
  });

  it('should return 400 Bad Request for invalid input data', async () => {
    const req = createMockRequest({ name: 'A' }); // Invalid name
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('should return 400 Bad Request when the service throws a ProjectCreationError', async () => {
    const errorMessage = 'Project already exists';
    mockedCreateProjectInDb.mockRejectedValue(new ProjectCreationError(errorMessage));
    
    const req = createMockRequest(mockProjectPayload);
    const response = await POST(req);
    const body = await response.json();
    
    expect(response.status).toBe(400);
    expect(body.error).toBe(errorMessage);
  });

  it('should return 500 Internal Server Error for unexpected errors', async () => {
    mockedCreateProjectInDb.mockRejectedValue(new Error('Database error'));
    
    const req = createMockRequest(mockProjectPayload);
    const response = await POST(req);
    const body = await response.json();
    
    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal Server Error');
  });

  it('should successfully create a new project', async () => {
    const req = createMockRequest(mockProjectPayload);
    const response = await POST(req);
    const body = await response.json();
    
    expect(response.status).toBe(201);
    expect(body.project).toEqual(mockCreatedProject);
    expect(body.creator).toBe(mockUserId);
    
    // Verify that the service was called with the correct data
    expect(mockedCreateProjectInDb).toHaveBeenCalledWith(
      expect.objectContaining({
        name: mockProjectPayload.name,
        workspaceId: mockProjectPayload.workspaceId,
        departmentId: mockProjectPayload.departmentId,
        isClientProject: mockProjectPayload.isClientProject,
        internalProductId: mockProjectPayload.internalProductId,
        userId: mockUserId,
        memberIds: [mockUserId], // Include the expected memberIds array
        clientId: null, // Include clientId even for internal projects (it will be null)
      })
    );
  });

  it('should successfully create a client project', async () => {
    const clientProjectPayload = {
      ...mockProjectPayload,
      isClientProject: true,
      clientId: 'client-123',
      internalProductId: null,
    };
    
    const req = createMockRequest(clientProjectPayload);
    const response = await POST(req);
    
    expect(response.status).toBe(201);
    
    // Verify that the service was called with the correct data
    expect(mockedCreateProjectInDb).toHaveBeenCalledWith(
      expect.objectContaining({
        name: clientProjectPayload.name,
        workspaceId: clientProjectPayload.workspaceId,
        departmentId: clientProjectPayload.departmentId,
        isClientProject: clientProjectPayload.isClientProject,
        clientId: clientProjectPayload.clientId,
        internalProductId: clientProjectPayload.internalProductId,
        userId: mockUserId,
        memberIds: [mockUserId], // Include the expected memberIds array
      })
    );
  });

  it('should include memberIds in the payload when creating a project', async () => {
    const projectWithMembersPayload = {
      ...mockProjectPayload,
      memberIds: [mockUserId, 'user-456'],
    };
    
    const req = createMockRequest(projectWithMembersPayload);
    const response = await POST(req);
    
    expect(response.status).toBe(201);
    
    // Verify that the service was called with the correct data including memberIds
    expect(mockedCreateProjectInDb).toHaveBeenCalledWith(
      expect.objectContaining({
        name: projectWithMembersPayload.name,
        workspaceId: projectWithMembersPayload.workspaceId,
        departmentId: projectWithMembersPayload.departmentId,
        isClientProject: projectWithMembersPayload.isClientProject,
        internalProductId: projectWithMembersPayload.internalProductId,
        userId: mockUserId,
        memberIds: projectWithMembersPayload.memberIds, // Include the memberIds from the payload
        clientId: null, // Include clientId even for internal projects
      })
    );
  });

  it('should handle the error case properly without logging to console in tests', async () => {
    // Mock console.error to prevent it from showing in test output
    const originalConsoleError = console.error;
    console.error = jest.fn();
    
    mockedCreateProjectInDb.mockRejectedValue(new Error('Database error'));
    
    const req = createMockRequest(mockProjectPayload);
    const response = await POST(req);
    const body = await response.json();
    
    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal Server Error');
    expect(console.error).toHaveBeenCalledWith(
      "Failed to create project:",
      expect.any(Error)
    );
    
    // Restore console.error
    console.error = originalConsoleError;
  });
});