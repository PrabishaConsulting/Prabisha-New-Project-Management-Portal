// Define all possible actions for consistency and easy tracking
export const ACTIVITY_ACTIONS = {
  // Project Actions
  CREATE_PROJECT: 'PROJECT_CREATE',
  UPDATE_PROJECT: 'PROJECT_UPDATE',
  UPDATE_PROJECT_NAME: 'PROJECT_UPDATE_NAME',
  UPDATE_PROJECT_STATUS: 'PROJECT_UPDATE_STATUS',
  UPDATE_PROJECT_DESCRIPTION: 'PROJECT_UPDATE_DESCRIPTION',
  DELETE_PROJECT: 'PROJECT_DELETE',
  ARCHIVE_PROJECT: 'PROJECT_ARCHIVE',
  RESTORE_PROJECT: 'PROJECT_RESTORE',
  
  // Task Actions
  CREATE_TASK: 'TASK_CREATE',
  UPDATE_TASK: 'TASK_UPDATE',
  UPDATE_TASK_STATUS: 'TASK_UPDATE_STATUS',
  UPDATE_TASK_NAME: 'TASK_UPDATE_NAME',
  UPDATE_TASK_PRIORITY: 'TASK_UPDATE_PRIORITY',
  UPDATE_TASK_ASSIGNEE: 'TASK_UPDATE_ASSIGNEE',
  UPDATE_TASK_DUE_DATE: 'TASK_UPDATE_DUE_DATE',
  UPDATE_TASK_TIME_ESTIMATE: 'TASK_UPDATE_TIME_ESTIMATE',
  UPDATE_TASK_DESCRIPTION: 'TASK_UPDATE_DESCRIPTION',
  DELETE_TASK: 'TASK_DELETE',
  REORDER_TASK: 'TASK_REORDER',
  COMPLETE_TASK: 'TASK_COMPLETE',
  REOPEN_TASK: 'TASK_REOPEN',
  
  // Task Comment Actions
  ADD_TASK_COMMENT: 'TASK_COMMENT_ADD',
  UPDATE_TASK_COMMENT: 'TASK_COMMENT_UPDATE',
  DELETE_TASK_COMMENT: 'TASK_COMMENT_DELETE',
  
  // Task Attachment Actions
  ADD_TASK_ATTACHMENT: 'TASK_ATTACHMENT_ADD',
  DELETE_TASK_ATTACHMENT: 'TASK_ATTACHMENT_DELETE',
  
  // Member Actions
  ADD_MEMBER: 'MEMBER_ADD',
  REMOVE_MEMBER: 'MEMBER_REMOVE',
  UPDATE_MEMBER_ROLE: 'MEMBER_UPDATE_ROLE',
  INVITE_MEMBER: 'MEMBER_INVITE',
  ACCEPT_INVITATION: 'MEMBER_ACCEPT_INVITATION',
  REJECT_INVITATION: 'MEMBER_REJECT_INVITATION',
  
  // Workspace Actions
  CREATE_WORKSPACE: 'WORKSPACE_CREATE',
  UPDATE_WORKSPACE: 'WORKSPACE_UPDATE',
  DELETE_WORKSPACE: 'WORKSPACE_DELETE',
  // Department Actions
  CREATE_DEPARTMENT: 'DEPARTMENT_CREATE',
  UPDATE_DEPARTMENT: 'DEPARTMENT_UPDATE',
  DELETE_DEPARTMENT: 'DEPARTMENT_DELETE',
  
  // General Actions

  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
} as const;

export type ActivityAction = typeof ACTIVITY_ACTIONS[keyof typeof ACTIVITY_ACTIONS];

// Category types for easier grouping
export enum ActivityCategory {
  PROJECT = 'PROJECT',
  TASK = 'TASK',
  COMMENT = 'COMMENT',
  ATTACHMENT = 'ATTACHMENT',
  MEMBER = 'MEMBER',
  WORKSPACE = 'WORKSPACE',
  DEPARTMENT = 'DEPARTMENT',
  USER = 'USER',
}

/**
 * Maps activity actions to their categories
 */
export const ACTION_CATEGORY_MAP: Record<ActivityAction, ActivityCategory> = {
  // Project Actions
  [ACTIVITY_ACTIONS.CREATE_PROJECT]: ActivityCategory.PROJECT,
  [ACTIVITY_ACTIONS.UPDATE_PROJECT]: ActivityCategory.PROJECT,
  [ACTIVITY_ACTIONS.UPDATE_PROJECT_NAME]: ActivityCategory.PROJECT,
  [ACTIVITY_ACTIONS.UPDATE_PROJECT_STATUS]: ActivityCategory.PROJECT,
  [ACTIVITY_ACTIONS.UPDATE_PROJECT_DESCRIPTION]: ActivityCategory.PROJECT,
  [ACTIVITY_ACTIONS.DELETE_PROJECT]: ActivityCategory.PROJECT,
  [ACTIVITY_ACTIONS.ARCHIVE_PROJECT]: ActivityCategory.PROJECT,
  [ACTIVITY_ACTIONS.RESTORE_PROJECT]: ActivityCategory.PROJECT,
  
  // Task Actions
  [ACTIVITY_ACTIONS.CREATE_TASK]: ActivityCategory.TASK,
  [ACTIVITY_ACTIONS.UPDATE_TASK]: ActivityCategory.TASK,
  [ACTIVITY_ACTIONS.UPDATE_TASK_STATUS]: ActivityCategory.TASK,
  [ACTIVITY_ACTIONS.UPDATE_TASK_NAME]: ActivityCategory.TASK,
  [ACTIVITY_ACTIONS.UPDATE_TASK_PRIORITY]: ActivityCategory.TASK,
  [ACTIVITY_ACTIONS.UPDATE_TASK_ASSIGNEE]: ActivityCategory.TASK,
  [ACTIVITY_ACTIONS.UPDATE_TASK_DUE_DATE]: ActivityCategory.TASK,
  [ACTIVITY_ACTIONS.UPDATE_TASK_TIME_ESTIMATE]: ActivityCategory.TASK,
  [ACTIVITY_ACTIONS.UPDATE_TASK_DESCRIPTION]: ActivityCategory.TASK,
  [ACTIVITY_ACTIONS.DELETE_TASK]: ActivityCategory.TASK,
  [ACTIVITY_ACTIONS.REORDER_TASK]: ActivityCategory.TASK,
  [ACTIVITY_ACTIONS.COMPLETE_TASK]: ActivityCategory.TASK,
  [ACTIVITY_ACTIONS.REOPEN_TASK]: ActivityCategory.TASK,
  
  // Comment Actions
  [ACTIVITY_ACTIONS.ADD_TASK_COMMENT]: ActivityCategory.COMMENT,
  [ACTIVITY_ACTIONS.UPDATE_TASK_COMMENT]: ActivityCategory.COMMENT,
  [ACTIVITY_ACTIONS.DELETE_TASK_COMMENT]: ActivityCategory.COMMENT,
  
  // Attachment Actions
  [ACTIVITY_ACTIONS.ADD_TASK_ATTACHMENT]: ActivityCategory.ATTACHMENT,
  [ACTIVITY_ACTIONS.DELETE_TASK_ATTACHMENT]: ActivityCategory.ATTACHMENT,
  
  // Member Actions
  [ACTIVITY_ACTIONS.ADD_MEMBER]: ActivityCategory.MEMBER,
  [ACTIVITY_ACTIONS.REMOVE_MEMBER]: ActivityCategory.MEMBER,
  [ACTIVITY_ACTIONS.UPDATE_MEMBER_ROLE]: ActivityCategory.MEMBER,
  [ACTIVITY_ACTIONS.INVITE_MEMBER]: ActivityCategory.MEMBER,
  [ACTIVITY_ACTIONS.ACCEPT_INVITATION]: ActivityCategory.MEMBER,
  [ACTIVITY_ACTIONS.REJECT_INVITATION]: ActivityCategory.MEMBER,
  
  // Workspace Actions
  [ACTIVITY_ACTIONS.CREATE_WORKSPACE]: ActivityCategory.WORKSPACE,
  [ACTIVITY_ACTIONS.UPDATE_WORKSPACE]: ActivityCategory.WORKSPACE,
  [ACTIVITY_ACTIONS.DELETE_WORKSPACE]: ActivityCategory.WORKSPACE,
  
  // Department Actions
  [ACTIVITY_ACTIONS.CREATE_DEPARTMENT]: ActivityCategory.DEPARTMENT,
  [ACTIVITY_ACTIONS.UPDATE_DEPARTMENT]: ActivityCategory.DEPARTMENT,
  [ACTIVITY_ACTIONS.DELETE_DEPARTMENT]: ActivityCategory.DEPARTMENT,
  
  // User Actions
  [ACTIVITY_ACTIONS.USER_LOGIN]: ActivityCategory.USER,
  [ACTIVITY_ACTIONS.USER_LOGOUT]: ActivityCategory.USER,
};

/**
 * Checks if the action is related to a project.
 */
export function isProjectAction(action: ActivityAction): boolean {
  return action.startsWith('PROJECT_');
}

/**
 * Checks if the action is related to a task.
 */
export function isTaskAction(action: ActivityAction): boolean {
  return action.startsWith('TASK_');
}

/**
 * Checks if the action is related to comments.
 */
export function isCommentAction(action: ActivityAction): boolean {
  return action.includes('_COMMENT_');
}

/**
 * Checks if the action is related to attachments.
 */
export function isAttachmentAction(action: ActivityAction): boolean {
  return action.includes('_ATTACHMENT_');
}

/**
 * Checks if the action is related to members.
 */
export function isMemberAction(action: ActivityAction): boolean {
  return action.startsWith('MEMBER_');
}

/**
 * Checks if the action is related to workspace.
 */
export function isWorkspaceAction(action: ActivityAction): boolean {
  return action.startsWith('WORKSPACE_');
}

/**
 * Checks if the action is related to department.
 */
export function isDepartmentAction(action: ActivityAction): boolean {
  return action.startsWith('DEPARTMENT_');
}

/**
 * Checks if the action is a create action.
 */
export function isCreateAction(action: ActivityAction): boolean {
  return action.includes('_CREATE');
}

/**
 * Checks if the action is an update action.
 */
export function isUpdateAction(action: ActivityAction): boolean {
  return action.includes('_UPDATE');
}

/**
 * Checks if the action is a delete action.
 */
export function isDeleteAction(action: ActivityAction): boolean {
  return action.includes('_DELETE');
}

/**
 * Gets the category for a given action.
 */
export function getActionCategory(action: ActivityAction): ActivityCategory {
  return ACTION_CATEGORY_MAP[action];
}

/**
 * Gets all actions for a specific category.
 */
export function getActionsByCategory(category: ActivityCategory): ActivityAction[] {
  return Object.entries(ACTION_CATEGORY_MAP)
    .filter(([_, cat]) => cat === category)
    .map(([action]) => action as ActivityAction);
}

/**
 * Formats an action for display (converts TASK_CREATE to "Task Create").
 */
export function formatActionForDisplay(action: ActivityAction): string {
  return action
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Gets a user-friendly icon name for an action (for UI purposes).
 */
export function getActionIcon(action: ActivityAction): string {
  if (isCreateAction(action)) return 'plus-circle';
  if (isUpdateAction(action)) return 'edit';
  if (isDeleteAction(action)) return 'trash';
  if (action === ACTIVITY_ACTIONS.COMPLETE_TASK) return 'check-circle';
  if (action === ACTIVITY_ACTIONS.REOPEN_TASK) return 'refresh-cw';
  if (action === ACTIVITY_ACTIONS.ADD_MEMBER) return 'user-plus';
  if (action === ACTIVITY_ACTIONS.REMOVE_MEMBER) return 'user-minus';
  if (isCommentAction(action)) return 'message-circle';
  if (isAttachmentAction(action)) return 'paperclip';
  return 'activity';
}

/**
 * Gets a color class for an action (for UI styling).
 */
export function getActionColor(action: ActivityAction): string {
  if (isCreateAction(action)) return 'text-green-600';
  if (isUpdateAction(action)) return 'text-blue-600';
  if (isDeleteAction(action)) return 'text-red-600';
  if (action === ACTIVITY_ACTIONS.COMPLETE_TASK) return 'text-green-600';
  if (action === ACTIVITY_ACTIONS.REOPEN_TASK) return 'text-orange-600';
  return 'text-gray-600';
}

/**
 * Filters activities by category.
 */
export function filterActivitiesByCategory(
  activities: Array<{ action: ActivityAction }>,
  category: ActivityCategory
): Array<{ action: ActivityAction }> {
  return activities.filter(
    activity => getActionCategory(activity.action) === category
  );
}

/**
 * Groups activities by their category.
 */
export function groupActivitiesByCategory(
  activities: Array<{ action: ActivityAction; [key: string]: any }>
): Record<ActivityCategory, Array<{ action: ActivityAction; [key: string]: any }>> {
  const grouped = {} as Record<ActivityCategory, Array<{ action: ActivityAction; [key: string]: any }>>;
  
  // Initialize all categories
  Object.values(ActivityCategory).forEach(category => {
    grouped[category] = [];
  });
  
  // Group activities
  activities.forEach(activity => {
    const category = getActionCategory(activity.action);
    grouped[category].push(activity);
  });
  
  return grouped;
}

/**
 * Gets statistics about activities by action type.
 */
export function getActivityStatistics(
  activities: Array<{ action: ActivityAction }>
): Record<ActivityAction, number> {
  const stats = {} as Record<ActivityAction, number>;
  
  activities.forEach(activity => {
    stats[activity.action] = (stats[activity.action] || 0) + 1;
  });
  
  return stats;
}

/**
 * Checks if an action requires specific permissions.
 * (Can be extended based on your authorization logic)
 */
export function isPrivilegedAction(action: ActivityAction): boolean {
  const privilegedActions: ActivityAction[] = [
    ACTIVITY_ACTIONS.DELETE_PROJECT,
    ACTIVITY_ACTIONS.ARCHIVE_PROJECT,
    ACTIVITY_ACTIONS.DELETE_TASK,
    ACTIVITY_ACTIONS.REMOVE_MEMBER,
    ACTIVITY_ACTIONS.UPDATE_MEMBER_ROLE,
    ACTIVITY_ACTIONS.DELETE_WORKSPACE,
    ACTIVITY_ACTIONS.DELETE_DEPARTMENT,
  ];
  
  return privilegedActions.includes(action);
}