const fs = require('fs');
const path = require('path');
const { parse } = require('json2csv');

const tableFields = {
  users: [
    'id','username','password','name','email','role','avatar','phone','jobTitle','department','lastLogin','info','status','defaultProjectId','clientId'
  ],
  roles: ['name'],
  permissions: ['role', 'route'],
  clients: [
    'id','name','contactEmail','contactPhone','address','website','since','info'
  ],
  projects: [
    'id','name','clientId','description','startDate','endDate','budget','status','info'
  ],
  project_workflows: ['projectId', 'stage'],
  books: [
    'id','name','status','expectedDocuments','projectId','priority','info','scannerUserId','scanStartTime','scanEndTime','indexerUserId','indexingStartTime','indexingEndTime','qcUserId','qcStartTime','rejectionReason'
  ],
  folders: ['id','name','parentId'],
  document_statuses: ['id','name','stage'],
  documents: [
    'id','clientId','statusId','type','flag','flagComment','lastUpdated','name','projectId','bookId'
  ],
  rejection_tags: ['id','clientId','label','description'],
  audit_logs: ['id','bookId','action','userId','date','details'],
  processing_batches: ['id', 'startTime', 'endTime', 'status', 'progress', 'timestampStr', 'info', 'obs'],
  processing_batch_items: ['id', 'batchId', 'bookId', 'itemStartTime', 'itemEndTime', 'processedPages', 'status', 'info', 'obs'],
  processing_logs: ['id', 'batchId', 'message', 'timestamp', 'level', 'info', 'obs']
};

const files = Object.keys(tableFields);

files.forEach(file => {
  const jsonPath = path.resolve(__dirname, 'src/data', `${file}.json`);
  if (!fs.existsSync(jsonPath)) {
    console.log(`Arquivo não encontrado: ${jsonPath}`);
    return;
  }
  let json = require(jsonPath);

  // roles.json é array de strings
  if (file === 'roles') {
    json = json.map(name => ({ name }));
  }

  // permissions.json é objeto
  if (file === 'permissions') {
    json = Object.entries(json).flatMap(([role, routes]) =>
      routes.map(route => ({ role, route }))
    );
  }

  // project_workflows.json é objeto
  if (file === 'project_workflows') {
    json = Object.entries(json).flatMap(([projectId, stages]) =>
      stages.map(stage => ({ projectId, stage }))
    );
  }

  // Se for array vazio, pula
  if (!Array.isArray(json) || json.length === 0) {
    console.log(`Arquivo vazio: ${file}`);
    return;
  }

  try {
    const csv = parse(json, { fields: tableFields[file] });
    fs.writeFileSync(path.resolve(__dirname, 'src/data', `${file}.csv`), csv);
    console.log(`Convertido: ${file}.csv`);
  } catch (err) {
    console.error(`Erro ao converter ${file}:`, err.message);
  }
});
