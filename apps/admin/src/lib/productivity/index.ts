/**
 * PHASE-2H-PRODUCTIVITY: Productivity & Task Management
 *
 * Exports for task, project, and saved items management.
 */

// Types
export * from './types'

// Task operations
export {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  assignTask,
  completeTask,
  changeTaskStatus,
  getTasksByAssignee,
  getOverdueTasks,
  getTaskStats,
  addTaskComment,
  getTaskComments,
} from './tasks-db'

// Project operations
export {
  getProjects,
  getProject,
  createProject,
  updateProject,
  archiveProject,
  deleteProject,
  moveProjectToStage,
  getProjectsByStage,
  getProjectsForKanban,
  reorderProjectsInStage,
  getProjectTasks,
  addTaskToProject,
  removeTaskFromProject,
  getProjectStats,
} from './projects-db'

// Saved items operations
export {
  saveItem,
  getSavedItems,
  getSavedItem,
  removeSavedItem,
  moveSavedItem,
  updateSavedItemTags,
  isItemSaved,
  getSavedItemStats,
  getSavedItemFolders,
  bulkDeleteSavedItems,
  bulkMoveSavedItems,
} from './saved-items-db'
