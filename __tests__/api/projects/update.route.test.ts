/**
 * @jest-environment node
 */
import { PATCH } from '@/app/api/data/projects/[projectId]/route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { ProjectStatus, Priority, ProjectRole } from '@/app/generated/client';
import { getServerSession } from 'next-auth';
import { hasUserRole } from '@/services/role-services/has-user-role.service';
import { projectMembership } from '@/services/role-services/has-user-project-role.service';

// --- MOCKS ---
jest.mock('@/lib/db', () => ({
  db: {
    project: { findUnique: jest.fn(), update: jest.fn() },
    projectMember: { 
      findUnique: jest.fn(), // Add this
      deleteMany: jest.fn(), 
      upsert: jest.fn() 
    },
    user: { findMany: jest.fn(), findUnique: jest.fn() },
    department: { findUnique: jest.fn() }
  },
}));

jest.mock('next-auth');
jest.mock('@/services/role-services/has-user-role.service');
jest.mock('@/services/activity-user/activity-user.service');
jest.mock('@/services/role-services/has-user-project-role.service'); // Add this

// --- TYPE ASSERTIONS FOR MOCKS ---
const mockedProjectFindUnique = db.project.findUnique as jest.Mock;
const mockedProjectUpdate = db.project.update as jest.Mock;
const mockedProjectMemberFindUnique = db.projectMember.findUnique as jest.Mock; // Add this
const mockedProjectMemberDeleteMany = db.projectMember.deleteMany as jest.Mock;
const mockedProjectMemberUpsert = db.projectMember.upsert as jest.Mock;
const mockedUserFindMany = db.user.findMany as jest.Mock;
const mockedUserFindUnique = db.user.findUnique as jest.Mock;
const mockedGetServerSession = getServerSession as jest.Mock;
const mockedHasUserRole = hasUserRole as jest.Mock;
const mockedProjectMembership = projectMembership as jest.Mock; // Add this

describe('PATCH /api/data/projects/[projectId]', () => {
  const mockProjectId = 'clwqcac2a0000356v9j4d5m3i';
  const mockUserId = 'clwqcac2a0003356v1a2b3c4d';
  
  const mockExistingProject = {
    id: mockProjectId,
    name: 'Original Name',
    description: 'Original description',
    status: ProjectStatus.ACTIVE,
    priority: Priority.MEDIUM,
    departmentId: 'clwqcac2a0001356v6q7g8h2k',
    workspaceId: 'clwqcac2a0002356v4n5b7f9d',
    createdBy: mockUserId,
    department: { name: 'Original Department' },
    creator: { name: 'Original Creator' },
    members: [
      { userId: 'clwqcac2a0004356vdeadbeef', role: ProjectRole.MEMBER },
      { userId: 'clwqcac2a0005356vbeefdead', role: ProjectRole.MEMBER },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServerSession.mockResolvedValue({ user: { id: mockUserId } });
    mockedHasUserRole.mockResolvedValue(true);
    mockedUserFindUnique.mockResolvedValue({ name: 'Test User' });
    mockedProjectMembership.mockResolvedValue(true); // Add this
  });

  const createMockRequest = (body: object) => {
    return new NextRequest(`http://localhost/api/data/projects/${mockProjectId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  };

  const mockParams = {
    params: Promise.resolve({ projectId: mockProjectId }),
  };

  it('should return 401 Unauthorized if no session is found', async () => {
    mockedGetServerSession.mockResolvedValue(null);
    const req = createMockRequest({ name: 'New Name' });
    const response = await PATCH(req, mockParams);
    expect(response.status).toBe(401);
  });

  it('should return 404 Not Found if the project does not exist', async () => {
    mockedProjectFindUnique.mockResolvedValue(null);
    const req = createMockRequest({ name: 'New Name' });
    const response = await PATCH(req, mockParams);
    expect(response.status).toBe(404);
  });

  it('should return 400 Bad Request for invalid input data', async () => {
    const req = createMockRequest({ name: 'A' });
    const response = await PATCH(req, mockParams);
    expect(response.status).toBe(400);
  });

  it('should return 403 Forbidden if user is not admin or project member', async () => {
    mockedHasUserRole.mockResolvedValue(false);
    mockedProjectMembership.mockResolvedValue(false);
    const req = createMockRequest({ name: 'New Name' });
    const response = await PATCH(req, mockParams);
    expect(response.status).toBe(403);
  });

  it('should successfully assign a new department', async () => {
    mockedProjectFindUnique.mockResolvedValue(mockExistingProject);
    mockedProjectUpdate.mockResolvedValue({});
    
    const newDepartmentId = 'clwqcac2a0006356v12345678';
    const req = createMockRequest({ departmentId: newDepartmentId });
    await PATCH(req, mockParams);

    expect(mockedProjectUpdate).toHaveBeenCalledWith({
      where: { id: mockProjectId },
      data: expect.objectContaining({
        department: { connect: { id: newDepartmentId } },
      }),
    });
  });

  it('should successfully update project members', async () => {
    mockedProjectFindUnique.mockResolvedValue(mockExistingProject);
    mockedProjectUpdate.mockResolvedValue({});
    mockedUserFindMany.mockResolvedValue([
        { id: 'clwqcac2a0004356vdeadbeef', name: 'User A'},
        { id: 'clwqcac2a0005356vbeefdead', name: 'User B'},
        { id: 'clwqcac2a0007356v98765432', name: 'User C'},
    ]);

    const newMembersPayload = [
      { userId: 'clwqcac2a0005356vbeefdead', role: ProjectRole.LEAD },   // Update user-B's role
      { userId: 'clwqcac2a0007356v98765432', role: ProjectRole.MEMBER }, // Add user-C
    ];

    const req = createMockRequest({ members: newMembersPayload });
    await PATCH(req, mockParams);

    expect(mockedProjectMemberDeleteMany).toHaveBeenCalledWith({
      where: { projectId: mockProjectId, userId: { in: ['clwqcac2a0004356vdeadbeef'] } },
    });

    expect(mockedProjectMemberUpsert).toHaveBeenCalledWith({
      where: { projectId_userId: { projectId: mockProjectId, userId: 'clwqcac2a0005356vbeefdead' } },
      update: { role: ProjectRole.LEAD },
      create: { projectId: mockProjectId, userId: 'clwqcac2a0005356vbeefdead', role: ProjectRole.LEAD },
    });

    expect(mockedProjectMemberUpsert).toHaveBeenCalledWith({
      where: { projectId_userId: { projectId: mockProjectId, userId: 'clwqcac2a0007356v98765432' } },
      update: { role: ProjectRole.MEMBER },
      create: { projectId: mockProjectId, userId: 'clwqcac2a0007356v98765432', role: ProjectRole.MEMBER },
    });
  });

  it('should return 500 on unexpected error', async () => {
  mockedProjectFindUnique.mockRejectedValueOnce(new Error('DB failure'));
  const req = createMockRequest({ name: 'Will fail' });
  const response = await PATCH(req, mockParams);
  expect(response.status).toBe(500);
});

});

