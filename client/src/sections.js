// Mirror of src/config/constants.js → PANEL_SECTIONS.
// Keep this in sync with the backend canonical list.
export const PANEL_SECTIONS = [
  { id: 'dashboard',        label: 'Dashboard' },
  { id: 'kanban',           label: 'Kanban Board' },
  { id: 'tasks',            label: 'All Tasks' },
  { id: 'tasks-frontend',   label: 'All Tasks — Frontend only' },
  { id: 'tasks-backend',    label: 'All Tasks — Backend only' },
  { id: 'add-task',         label: 'Add Task (create new)' },
  { id: 'my-tasks',         label: 'My Tasks' },
  { id: 'search',           label: 'Search' },
  { id: 'team',             label: 'Team' },
  { id: 'reports',          label: 'Reports' },
  { id: 'calendar',         label: 'Calendar' },
  { id: 'ai-chat',          label: 'AI Assistant' },
  { id: 'users',            label: 'Users (admin API)' },
  { id: 'settings',         label: 'Settings' },
];

export const PANEL_SECTION_IDS = PANEL_SECTIONS.map(s => s.id);
