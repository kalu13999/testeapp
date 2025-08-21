
export interface Permission {
  id: string;
  label: string;
}

export interface PermissionGroup {
  group: string;
  permissions: Permission[];
}

export const ALL_PERMISSIONS: PermissionGroup[] = [
  {
    group: 'General',
    permissions: [
      { id: '/dashboard', label: 'Dashboard' },
      { id: '/profile', label: 'Profile' },
      { id: '/settings', label: 'Settings' },
    ],
  },
  {
    group: 'Management',
    permissions: [
      { id: '/projects', label: 'Projects List' },
      { id: '/projects/[id]', label: 'Project Details' },
      { id: '/clients', label: 'Clients' },
      { id: '/users', label: 'User Management' },
      { id: '/book-management', label: 'Book Management' },
      { id: '/role-management', label: 'Role Management' },
      { id: '/admin/status-override', label: 'Admin Status Override' },
      { id: '/admin/default-projects', label: 'Default Project Management' },
      { id: '/admin/reassign-user', label: 'Reassign User' },
    ],
  },
  {
    group: 'Book & Document Views',
    permissions: [
      { id: '/documents', label: 'All Books View' },
      { id: '/books/[id]', label: 'Book Details View' },
      { id: '/documents/[id]', label: 'Document Details View' },
    ],
  },
  {
    group: 'Internal Workflow Stages',
    permissions: [
      { id: '/workflow/view-all', label: 'View All User Tasks' },
      { id: '/workflow/pending-shipment', label: 'Workflow: Pending Shipment' },
      { id: '/workflow/confirm-reception', label: 'Workflow: Confirm Reception' },
      { id: '/workflow/already-received', label: 'Workflow: Already Received' },
      { id: '/workflow/to-scan', label: 'Workflow: To Scan' },
      { id: '/workflow/scanning-started', label: 'Workflow: Scanning Started' },
      { id: '/workflow/storage', label: 'Workflow: Storage' },
      { id: '/workflow/to-indexing', label: 'Workflow: To Indexing' },
      { id: '/workflow/indexing-started', label: 'Workflow: Indexing Started' },
      { id: '/workflow/to-checking', label: 'Workflow: To Checking' },
      { id: '/workflow/checking-started', label: 'Workflow: Checking Started' },
      { id: '/workflow/ready-for-processing', label: 'Workflow: Ready for Processing' },
      { id: '/workflow/in-processing', label: 'Workflow: In Processing' },
      { id: '/workflow/processed', label: 'Workflow: Processed' },
      { id: '/workflow/final-quality-control', label: 'Workflow: Final QC' },
      { id: '/workflow/delivery', label: 'Workflow: Delivery' },
      { id: '/workflow/client-rejections', label: 'Workflow: Client Rejections' },
      { id: '/workflow/corrected', label: 'Workflow: Corrected' },
    ],
  },
  {
    group: 'Finalization Stages',
    permissions: [
      { id: '/finalized', label: 'Finalized' },
      { id: '/archive', label: 'Archive' },
    ],
  },
  {
    group: 'Client Portal',
    permissions: [
      { id: '/shipments', label: 'Client: Prepare Shipment' },
      { id: '/pending-deliveries', label: 'Client: Pending Deliveries (Legacy)' },
      { id: '/validated-history', label: 'Client: Validated History' },
      { id: '/reasons', label: 'Rejection Reasons' },
      { id: '/manage-deliveries', label: 'Client: Manage Deliveries' },
      { id: '/my-validations', label: 'Client: My Validations' },
      { id: '/validation-monitoring', label: 'Client: Validation Monitoring' },
    ],
  },
];

export const permissionDescriptions: { [key: string]: string } = {
  '/dashboard': 'Allows user to view the main project dashboard.',
  '/profile': 'Allows user to view and edit their own profile.',
  '/settings': 'Grants access to global application settings. (Admin recommended)',
  '/projects': 'Allows user to view and manage the list of projects.',
  '/projects/[id]': 'Allows user to view the detailed page for a single project.',
  '/clients': 'Allows user to view and manage the list of company clients.',
  '/users': 'Grants access to create, edit, and manage all user accounts.',
  '/book-management': 'Allows user to add, edit, delete, and import books for a project.',
  '/role-management': 'Grants access to define roles and manage their permissions.',
  '/admin/status-override': 'Allows manual override of any book\'s status. (High-level permission)',
  '/admin/default-projects': 'Allows setting a default login project for other users.',
  '/admin/reassign-user': 'Grants access to reassign a task from one user to another.',
  '/documents': 'Allows viewing a master list of all books across all accessible projects.',
  '/books/[id]': 'Allows viewing the detailed page for a single book, including its pages.',
  '/documents/[id]': 'Allows viewing the detailed page for a single document (page scan).',
  '/workflow/view-all': 'Allows a user to see all tasks in a queue, not just their own. Essential for managers.',
  '/workflow/pending-shipment': 'Access the queue of books waiting to be shipped by the client.',
  '/workflow/confirm-reception': 'Access the queue to confirm physical arrival of books from clients.',
  '/workflow/already-received': 'Access the queue of received books to either assign a scanner or, if scanning is disabled, send to storage.',
  '/workflow/to-scan': 'Access the personal queue of books ready to be scanned.',
  '/workflow/scanning-started': 'Access the personal queue of books currently being scanned.',
  '/workflow/storage': 'Access the queue of scanned books ready for the digital workflow (e.g., indexing).',
  '/workflow/to-indexing': 'Access the personal queue of books ready to be indexed.',
  '/workflow/indexing-started': 'Access the personal queue of books currently being indexed.',
  '/workflow/to-checking': 'Access the personal queue of books ready for quality control.',
  '/workflow/checking-started': 'Access the personal queue of books currently being checked.',
  '/workflow/ready-for-processing': 'Access the queue of books ready for automated scripts (e.g., OCR).',
  '/workflow/in-processing': 'Access the monitoring page for books currently in automated processing.',
  '/workflow/processed': 'Access the queue of books that have finished automated processing.',
  '/workflow/final-quality-control': 'Access the queue for final quality review before client delivery.',
  '/workflow/delivery': 'Access the queue to prepare and send finalized books to the client.',
  '/workflow/client-rejections': 'Access the queue of books rejected by the client that require correction.',
  '/workflow/corrected': 'Access the queue of corrected books ready for re-submission.',
  '/finalized': 'Access the queue of client-approved books waiting for final archival.',
  '/archive': 'Access the view of all fully archived and completed books.',
  '/shipments': 'Client-facing page to prepare and mark books as shipped.',
  '/pending-deliveries': 'Client-facing page to review and approve/reject delivered books.',
  '/validated-history': 'Client-facing page to view the history of all their validated batches.',
  '/reasons': 'Allows management of custom rejection reasons for clients.',
  '/manage-deliveries': 'Allows client managers to distribute validation tasks.',
  '/my-validations': 'Allows client operators to view and action their assigned validation tasks.',
  '/validation-monitoring': 'Allows client managers to monitor the progress of distributed validation tasks.'
};
