// Define all possible actions for consistency
export const ACTIVITY_ACTIONS = {
  // Project Actions
  CREATE_PROJECT: 'PROJECT_CREATE',
  UPDATE_PROJECT_NAME: 'PROJECT_UPDATE_NAME',
  DELETE_PROJECT: 'PROJECT_DELETE',
  
  // Task Actions
  CREATE_TASK: 'TASK_CREATE',
  UPDATE_TASK_STATUS: 'TASK_UPDATE_STATUS',
  DELETE_TASK: 'TASK_DELETE',
  
  // General Actions
  USER_LOGIN: 'USER_LOGIN',
} as const;

export type ActivityAction = typeof ACTIVITY_ACTIONS[keyof typeof ACTIVITY_ACTIONS];

/**
 * Checks if the action is related to a project.
 * @param action The action string to check.
 * @returns True if the action starts with 'PROJECT_'.
 */
export function isProjectAction(action: ActivityAction): boolean {
  return action.startsWith('PROJECT_');
}

/**
 * Checks if the action is related to a task.
 * @param action The action string to check.
 * @returns True if the action starts with 'TASK_'.
 */
export function isTaskAction(action: ActivityAction): boolean {
  return action.startsWith('TASK_');
}