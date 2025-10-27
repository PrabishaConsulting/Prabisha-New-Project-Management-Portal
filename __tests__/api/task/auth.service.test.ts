import { authorizeProjectMember, AuthorizationError } from '@/services/task-service/auth.service';
import { db } from '@/lib/db';
import { ProjectRole } from '@/app/generated/client';

// The mock setup is correct.
jest.mock('@/lib/db', () => ({
  db: {
    projectMember: {
      findUnique: jest.fn(),
    },
  },
}));

// We remove the overly broad 'mockedDb' cast here.

describe('Authorization Service: authorizeProjectMember', () => {
  const userId = 'user-123';
  const projectId = 'proj-xyz';

  beforeEach(() => {
    // This is a more robust way to reset mocks
    (db.projectMember.findUnique as jest.Mock).mockClear();
  });

  it("should return the user's role if they are a project member", async () => {
    const mockMember = {
      id: 'member-id',
      userId: userId,
      projectId: projectId,
      role: ProjectRole.LEAD,
      assignedAt: new Date(),
    };

    // ✨ FIX: Cast the specific method as a jest.Mock before using mock functions.
    (db.projectMember.findUnique as jest.Mock).mockResolvedValue(mockMember);

    await expect(authorizeProjectMember(userId, projectId)).resolves.toBe(ProjectRole.LEAD);
  });

  it('should throw an AuthorizationError if the user is not a project member', async () => {
    // ✨ FIX: Cast the specific method as a jest.Mock.
    (db.projectMember.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(authorizeProjectMember(userId, projectId)).rejects.toThrow(
      new AuthorizationError('You are not a member of this project.')
    );
  });
});