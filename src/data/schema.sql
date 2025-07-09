-- This script contains the complete and corrected database schema for the FlowVault application.

-- ROLES
CREATE TABLE roles (
  name VARCHAR(191) PRIMARY KEY
);

-- CLIENTS
CREATE TABLE clients (
  id VARCHAR(191) PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  contactEmail VARCHAR(191),
  contactPhone VARCHAR(50),
  address VARCHAR(255),
  website VARCHAR(191),
  since DATE,
  info TEXT
);

-- PROJECTS
CREATE TABLE projects (
  id VARCHAR(191) PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  clientId VARCHAR(191) NOT NULL,
  description TEXT,
  startDate DATE,
  endDate DATE,
  budget DECIMAL(12,2),
  status VARCHAR(50),
  info TEXT,
  FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- DOCUMENT STATUSES
CREATE TABLE document_statuses (
  id VARCHAR(191) PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  stage VARCHAR(191) NOT NULL
);

-- FOLDERS
CREATE TABLE folders (
  id VARCHAR(191) PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  parentId VARCHAR(191),
  FOREIGN KEY (parentId) REFERENCES folders(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- REJECTION TAGS
CREATE TABLE rejection_tags (
  id VARCHAR(191) PRIMARY KEY,
  clientId VARCHAR(191),
  label VARCHAR(191),
  description TEXT,
  FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- USERS
CREATE TABLE users (
  id VARCHAR(191) PRIMARY KEY,
  username VARCHAR(191) NOT NULL UNIQUE,
  password VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  email VARCHAR(191),
  role VARCHAR(191) NOT NULL,
  avatar VARCHAR(255),
  phone VARCHAR(50),
  jobTitle VARCHAR(191),
  department VARCHAR(191),
  lastLogin DATETIME,
  info TEXT,
  status VARCHAR(50),
  defaultProjectId VARCHAR(191),
  clientId VARCHAR(191),
  FOREIGN KEY (role) REFERENCES roles(name) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (defaultProjectId) REFERENCES projects(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- PERMISSIONS
CREATE TABLE permissions (
  role VARCHAR(191) NOT NULL,
  route VARCHAR(191) NOT NULL,
  PRIMARY KEY (role, route),
  FOREIGN KEY (role) REFERENCES roles(name) ON DELETE CASCADE ON UPDATE CASCADE
);

-- PROJECT WORKFLOWS
CREATE TABLE project_workflows (
  projectId VARCHAR(191) NOT NULL,
  stage VARCHAR(191) NOT NULL,
  PRIMARY KEY (projectId, stage),
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- BOOKS (with added columns)
CREATE TABLE books (
  id VARCHAR(191) PRIMARY KEY,
  name VARCHAR(191),
  status VARCHAR(50),
  expectedDocuments INT,
  projectId VARCHAR(191),
  priority VARCHAR(50),
  info TEXT,
  scannerUserId VARCHAR(191),
  scanStartTime DATETIME,
  scanEndTime DATETIME,
  indexerUserId VARCHAR(191),
  indexingStartTime DATETIME,
  indexingEndTime DATETIME,
  qcUserId VARCHAR(191),
  qcStartTime DATETIME,
  qcEndTime DATETIME,
  rejectionReason TEXT,
  author VARCHAR(191) NULL,
  isbn VARCHAR(50) NULL,
  publicationYear INT NULL,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (scannerUserId) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (indexerUserId) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (qcUserId) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- DOCUMENTS (with added columns)
CREATE TABLE documents (
  id VARCHAR(191) PRIMARY KEY,
  clientId VARCHAR(191),
  statusId VARCHAR(191),
  type VARCHAR(50),
  flag VARCHAR(50),
  flagComment TEXT,
  lastUpdated DATETIME,
  name VARCHAR(191),
  projectId VARCHAR(191),
  bookId VARCHAR(191),
  tags TEXT NULL,
  imageUrl VARCHAR(255) NULL,
  folderId VARCHAR(191) NULL,
  FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (statusId) REFERENCES document_statuses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_doc_folder FOREIGN KEY (folderId) REFERENCES folders(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- AUDIT LOGS (with added column)
CREATE TABLE audit_logs (
  id VARCHAR(191) PRIMARY KEY,
  bookId VARCHAR(191),
  documentId VARCHAR(191) NULL,
  action VARCHAR(191),
  userId VARCHAR(191),
  date DATETIME,
  details TEXT,
  FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- PROCESSING LOGS
CREATE TABLE processing_logs (
  id VARCHAR(191) PRIMARY KEY,
  bookId VARCHAR(191),
  status VARCHAR(50),
  progress INT,
  log TEXT,
  startTime DATETIME,
  lastUpdate DATETIME,
  FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Join table for many-to-many relationship between Users and Projects
CREATE TABLE user_projects (
  userId VARCHAR(191) NOT NULL,
  projectId VARCHAR(191) NOT NULL,
  PRIMARY KEY (userId, projectId),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Join table for many-to-many relationship between Rejection Tags and Projects
CREATE TABLE rejection_tag_projects (
  tagId VARCHAR(191) NOT NULL,
  projectId VARCHAR(191) NOT NULL,
  PRIMARY KEY (tagId, projectId),
  FOREIGN KEY (tagId) REFERENCES rejection_tags(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE
);
