import { updateTaskOrder } from '@/services/task-service/task.service';
import { db } from '@/lib/db';
import { TaskStatus } from '@prisma/client';

jest.mock('@/lib/db', () => ({
  db: {
    $executeRawUnsafe: jest.fn(),
  },
}));

describe('Task Service: updateTaskOrder', () => {
  beforeEach(() => {
    (db.$executeRawUnsafe as jest.Mock).mockClear();
  });

  it('should call $executeRawUnsafe with a bulk update query', async () => {
    const tasksToUpdate = [
      { id: 'task-1', position: 1, status: TaskStatus.IN_PROGRESS },
      { id: 'task-2', position: 2, status: TaskStatus.DONE },
    ];

    await updateTaskOrder(tasksToUpdate);

    expect(db.$executeRawUnsafe).toHaveBeenCalledTimes(1);

    const calledQuery = (db.$executeRawUnsafe as jest.Mock).mock.calls[0][0] as string;

    // Check that the query contains all task IDs and CASE WHEN for positions and statuses
    expect(calledQuery).toContain('task-1');
    expect(calledQuery).toContain('task-2');
    expect(calledQuery).toContain('WHEN id = \'task-1\' THEN 1');
    expect(calledQuery).toContain(`WHEN id = 'task-2' THEN 2`);
    expect(calledQuery).toContain(`WHEN id = 'task-1' THEN 'IN_PROGRESS'`);
    expect(calledQuery).toContain(`WHEN id = 'task-2' THEN 'DONE'`);
  });
});
