
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
      { id: '/workflow/reception', label: 'Workflow: Reception' },
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
      { id: '/pending-deliveries', label: 'Client: Pending Deliveries' },
      { id: '/validated-history', label: 'Client: Validated History' },
    ],
  },
];
