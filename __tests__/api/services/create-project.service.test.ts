// __tests__/api/services/create-project.service.test.ts

/**
 * @jest-environment node
 */
import { db } from '@/lib/db';
import { createProjectInDb, ProjectCreationData } from '@/services/project-service/create-project.service';
import { getCurrentUser } from '@/utils/getcurrentUser';
import { logActivity } from '@/services/activity-user/activity-user.service';
import { ProjectCreationError } from '@/utils/errors';

// --- MOCKS ---
jest.mock('@/lib/db', () => ({
  db: {
    project: { findFirst: jest.fn() },
    $transaction: jest.fn(),
    activityLog: { create: jest.fn() },
  },
}));

// Mock the authentication utility and logger
jest.mock('@/utils/getcurrentUser');
jest.mock('@/services/activity-user/activity-user.service');

// --- TYPE-SAFE MOCK VARIABLES ---
const mockedTransaction = db.$transaction as jest.Mock;
const mockedProjectFindFirst = db.project.findFirst as jest.Mock;
const mockedGetCurrentUser = getCurrentUser as jest.Mock;
const mockedLogActivity = logActivity as jest.Mock;
const mockedActivityLogCreate = db.activityLog.create as jest.Mock;

describe('Project Service: createProjectInDb', () => {
  const baseProjectData: ProjectCreationData = {
    name: 'New Test Project',
    workspaceId: 'ws-123',
    userId: 'user-123',
    departmentId: 'dept-1',
    isClientProject: false,
    internalProductId: 'prod-abc',
    memberIds: ['user-123', 'user-456'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Before each test, simulate a logged-in user.
    mockedGetCurrentUser.mockResolvedValue({
      id: baseProjectData.userId,
      name: 'Test User'
    });
    // Mock the activity logger to succeed by default
    mockedActivityLogCreate.mockResolvedValue({ id: 'activity-log-id' });
  });

  it('should create an internal project and members in a transaction', async () => {
    mockedProjectFindFirst.mockResolvedValue(null);
    const newProject = { id: 'proj-1', ...baseProjectData };
    
    // Mock the transaction implementation
    mockedTransaction.mockImplementation(async (callback) => {
      const tx = { 
        project: { create: jest.fn().mockResolvedValue(newProject) }, 
        projectMember: { createMany: jest.fn().mockResolvedValue({}) } 
      };
      return await callback(tx);
    });

    const result = await createProjectInDb(baseProjectData);

    expect(mockedTransaction).toHaveBeenCalledTimes(1);
    expect(result.project).toEqual(newProject);
    expect(mockedActivityLogCreate).toHaveBeenCalled();
  });

  // --- Validation and Business Logic Failures ---

  it('should throw a ProjectCreationError if a client project is missing a clientId', async () => {
    const invalidData = { ...baseProjectData, isClientProject: true, clientId: undefined };
    
    await expect(createProjectInDb(invalidData)).rejects.toThrow(
        "A Client ID is required when creating a project for an external client."
    );
  });
  
  it('should throw a ProjectCreationError if an internal project is missing an internalProductId', async () => {
    const invalidData = { ...baseProjectData, isClientProject: false, internalProductId: undefined };
    
    await expect(createProjectInDb(invalidData)).rejects.toThrow(
        "An Internal Product ID is required when creating an internal project."
    );
  });

  // it('should throw a ProjectCreationError if the project name already exists', async () => {
  //   // Mock the db call to simulate an existing project
  //   mockedProjectFindFirst.mockResolvedValue({ id: 'existing-proj-id', name: baseProjectData.name });

  //   await expect(createProjectInDb(baseProjectData)).rejects.toThrow(
  //       "A project with this name already exists in this workspace. Please choose a different name."
  //   );
  //   expect(mockedTransaction).not.toHaveBeenCalled();
  //   expect(mockedActivityLogCreate).not.toHaveBeenCalled();
  // });

  // --- Database Error Failures ---

  it('should throw a ProjectCreationError on a Prisma unique constraint violation (P2002)', async () => {
    mockedProjectFindFirst.mockResolvedValue(null);
    const prismaError = { code: 'P2002', meta: { target: ['workspaceId', 'name'] } };
    mockedTransaction.mockRejectedValue(prismaError);

    await expect(createProjectInDb(baseProjectData)).rejects.toThrow(
        "A project with this name already exists in this workspace. Please choose a different name."
    );
  });
  
  it('should throw a ProjectCreationError on transaction timeout', async () => {
    mockedProjectFindFirst.mockResolvedValue(null);
    const timeoutError = { code: 'P2028' };
    mockedTransaction.mockRejectedValue(timeoutError);

    await expect(createProjectInDb(baseProjectData)).rejects.toThrow(
        "Transaction timeout. Please try again with fewer members or contact support."
    );
  });
  
  it('should throw a generic ProjectCreationError for unexpected database errors', async () => {
    mockedProjectFindFirst.mockResolvedValue(null);
    mockedTransaction.mockRejectedValue(new Error("Database connection lost"));

    await expect(createProjectInDb(baseProjectData)).rejects.toThrow(
        "Could not save the project due to an unexpected error."
    );
  });

  it('should not throw if activity logging fails', async () => {
    mockedProjectFindFirst.mockResolvedValue(null);
    const newProject = { id: 'proj-1', ...baseProjectData };
    
    // Mock the transaction to succeed
    mockedTransaction.mockImplementation(async (callback) => {
      const tx = { 
        project: { create: jest.fn().mockResolvedValue(newProject) }, 
        projectMember: { createMany: jest.fn().mockResolvedValue({}) } 
      };
      return await callback(tx);
    });

    // Mock activity logging to fail
    const logError = new Error("Failed to log activity");
    mockedActivityLogCreate.mockRejectedValue(logError);

    // The function should not throw even if activity logging fails
    const result = await createProjectInDb(baseProjectData);

    expect(mockedTransaction).toHaveBeenCalledTimes(1);
    expect(result.project).toEqual(newProject);
    expect(mockedActivityLogCreate).toHaveBeenCalled();
  });
});