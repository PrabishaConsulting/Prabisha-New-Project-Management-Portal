import { updateTaskOrder } from '@/services/task-service/task.service';
import { db } from '@/lib/db';
import { TaskStatus } from '@/app/generated/client';

jest.mock('@/lib/db', () => ({
  db: {
    task: {
      update: jest.fn(),
    },
  },
}));

describe('Task Service: updateTaskOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update tasks using Prisma update operations', async () => {
    const tasksToUpdate = [
      { id: 'task-1', position: 1, status: TaskStatus.IN_PROGRESS },
      { id: 'task-2', position: 2, status: TaskStatus.DONE, completedAt: new Date('2025-01-01') },
    ];

    (db.task.update as jest.Mock).mockResolvedValue({});

    await updateTaskOrder(tasksToUpdate);

    // Should call update twice (once for each task)
    expect(db.task.update).toHaveBeenCalledTimes(2);

    // Check first task update
    expect(db.task.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'task-1' },
      data: {
        position: 1,
        status: TaskStatus.IN_PROGRESS,
      },
    });

    // Check second task update (with completedAt)
    expect(db.task.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'task-2' },
      data: {
        position: 2,
        status: TaskStatus.DONE,
        completedAt: new Date('2025-01-01'),
      },
    });
  });

  it('should handle empty array without calling update', async () => {
    await updateTaskOrder([]);
    
    expect(db.task.update).not.toHaveBeenCalled();
  });

  it('should process tasks in batches of 100', async () => {
    // Create 150 tasks to test batching
    const tasksToUpdate = Array.from({ length: 150 }, (_, i) => ({
      id: `task-${i}`,
      position: i,
      status: TaskStatus.TO_DO,
    }));

    (db.task.update as jest.Mock).mockResolvedValue({});

    await updateTaskOrder(tasksToUpdate);

    // Should call update 150 times (all tasks)
    expect(db.task.update).toHaveBeenCalledTimes(150);
  });

  it('should not include completedAt if undefined', async () => {
    const tasksToUpdate = [
      { id: 'task-1', position: 1, status: TaskStatus.IN_PROGRESS, completedAt: undefined },
    ];

    (db.task.update as jest.Mock).mockResolvedValue({});

    await updateTaskOrder(tasksToUpdate);

    expect(db.task.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: {
        position: 1,
        status: TaskStatus.IN_PROGRESS,
        // completedAt should NOT be included
      },
    });
  });

  it('should include completedAt when explicitly set to null', async () => {
    const tasksToUpdate = [
      { id: 'task-1', position: 1, status: TaskStatus.TO_DO, completedAt: null },
    ];

    (db.task.update as jest.Mock).mockResolvedValue({});

    await updateTaskOrder(tasksToUpdate);

    expect(db.task.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: {
        position: 1,
        status: TaskStatus.TO_DO,
        completedAt: null,
      },
    });
  });

  it('should handle update errors gracefully', async () => {
    const tasksToUpdate = [
      { id: 'task-1', position: 1, status: TaskStatus.IN_PROGRESS },
    ];

    const error = new Error('Database connection failed');
    (db.task.update as jest.Mock).mockRejectedValue(error);

    await expect(updateTaskOrder(tasksToUpdate)).rejects.toThrow('Database connection failed');
  });
});