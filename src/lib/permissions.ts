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
    group: 'Geral',
    permissions: [
      { id: '/dashboard', label: 'Painel do Projeto' },
      { id: '/profile', label: 'O Meu Perfil' },
      { id: '/settings', label: 'Configurações' },
    ],
  },
  {
    group: 'Gestão',
    permissions: [
      { id: '/admin/overview', label: 'Visão Global do Admin' },
      { id: '/projects', label: 'Projetos' },
      { id: '/projects/[id]', label: 'Detalhes do Projeto' },
      { id: '/clients', label: 'Clientes' },
      { id: '/users', label: 'Utilizadores' },
      { id: '/book-management', label: 'Gestão de Livros' },
      { id: '/role-management', label: 'Gestão de Perfis' },
      { id: '/admin/status-override', label: 'Substituição de Estado' },
      { id: '/admin/default-projects', label: 'Projeto Padrão do Utilizador' },
      { id: '/admin/reassign-user', label: 'Reatribuir Utilizador' },
      { id: '/admin/distribution-hub', label: 'Centro de Distribuição' },
      { id: '/admin/observation-history', label: 'Histórico de Observações' },
      { id: '/admin/general-configs', label: 'Configurações Gerais' },
    ],
  },
  {
    group: 'Visualização de Livros & Documentos',
    permissions: [
      { id: '/documents', label: 'Todos os Livros' },
      { id: '/books/[id]', label: 'Detalhes do Livro' },
      { id: '/documents/[id]', label: 'Detalhes do Documento' },
    ],
  },
  {
    group: 'Etapas do Workflow Interno',
    permissions: [
      { id: '/workflow/view-all', label: 'Ver Todas as Tarefas de Utilizadores' },
      { id: '/workflow/pending-shipment', label: 'Workflow: Envio Pendente' },
      { id: '/workflow/confirm-reception', label: 'Workflow: Confirmar Receção' },
      { id: '/workflow/already-received', label: 'Workflow: Recebidos' },
      { id: '/workflow/to-scan', label: 'Workflow: Digitalização Pendente' },
      { id: '/workflow/scanning-started', label: 'Workflow: Digitalização Iniciada' },
      { id: '/workflow/storage', label: 'Workflow: Armazenamento' },
      { id: '/workflow/to-indexing', label: 'Workflow: Indexação Pendente' },
      { id: '/workflow/indexing-started', label: 'Workflow: Indexação Iniciada' },
      { id: '/workflow/to-checking', label: 'Workflow: PageChecker Pendente' },
      { id: '/workflow/checking-started', label: 'Workflow: PageChecker Iniciada' },
      { id: '/workflow/ready-for-processing', label: 'Workflow: Processamento Pendente' },
      { id: '/workflow/in-processing', label: 'Workflow: Em Processamento' },
      { id: '/workflow/processed', label: 'Workflow: Lotes Processados' },
      { id: '/workflow/final-quality-control', label: 'Workflow: QC Final' },
      { id: '/workflow/delivery', label: 'Workflow: Entrega' },
      { id: '/workflow/client-rejections', label: 'Workflow: Rejeições do Cliente' },
      { id: '/workflow/corrected', label: 'Workflow: Corrigidos' },
    ],
  },
  {
    group: 'Etapas de Finalização',
    permissions: [
      { id: '/finalized', label: 'Finalizados' },
      { id: '/archive', label: 'Arquivados' },
    ],
  },
  {
    group: 'Portal do Cliente',
    permissions: [
      { id: '/shipments', label: 'Cliente: Preparar Envio' },
      { id: '/my-validations', label: 'Cliente: As Minhas Validações' },
      { id: '/my-tasks', label: 'Cliente: As Minhas Tarefas' },
      { id: '/manage-deliveries', label: 'Cliente: Gerir Entregas' },
      { id: '/validation-monitoring', label: 'Cliente: Acompanhar Validações' },
      { id: '/validated-history', label: 'Cliente: Histórico de Validações' },
      { id: '/reasons', label: 'Motivos de Rejeição' },
      { id: '/client/view-all-validations', label: 'Ver Todas as Validações do Cliente' },
    ],
  },
];

export const permissionDescriptions: { [key: string]: string } = {
  '/dashboard': 'Permite ao utilizador ver o dashboard principal do projeto.',
  '/profile': 'Permite ao utilizador ver e editar o seu próprio perfil.',
  '/settings': 'Concede acesso às definições globais da aplicação. (Recomendado para Administradores)',
  '/projects': 'Permite ao utilizador ver e gerir a lista de projetos.',
  '/projects/[id]': 'Permite ao utilizador ver a página detalhada de um projeto.',
  '/clients': 'Permite ao utilizador ver e gerir a lista de clientes da empresa.',
  '/users': 'Concede acesso para criar, editar e gerir todas as contas de utilizador.',
  '/book-management': 'Permite adicionar, editar, eliminar e importar livros para um projeto.',
  '/role-management': 'Concede acesso para definir perfis e gerir as suas permissões.',
  '/admin/status-override': 'Permite substituir manualmente o estado de qualquer livro. (Permissão de alto nível)',
  '/admin/default-projects': 'Permite definir um projeto de login predefinido para outros utilizadores.',
  '/admin/reassign-user': 'Concede acesso para reatribuir uma tarefa de um utilizador para outro.',
  '/admin/overview': 'Concede acesso a uma visão geral de alto nível de toda a atividade do sistema.',
  '/admin/distribution-hub': 'Permite monitorizar e ajustar regras de distribuição de trabalho.',
  '/admin/general-configs': 'Permite gerir configurações core como armazenamentos e scanners.',
  '/admin/observation-history': 'Permite visualizar o histórico completo de observações de todos os livros.',
  '/documents': 'Permite ver a lista completa de todos os livros em todos os projetos acessíveis.',
  '/books/[id]': 'Permite ver a página detalhada de um livro, incluindo as suas páginas.',
  '/documents/[id]': 'Permite ver a página detalhada de um documento (digitalização da página).',
  '/workflow/view-all': 'Permite ver todas as tarefas, não apenas as suas. Essencial para gestores.',
  '/workflow/pending-shipment': 'Acede aos livros à espera de envio pelo cliente.',
  '/workflow/confirm-reception': 'Acede aos livros para confirmar a receção física de clientes.',
  '/workflow/already-received': 'Acede aos livros recebidos para atribuir a um scanner ou, se a digitalização estiver desativada, enviar para armazenamento.',
  '/workflow/to-scan': 'Acede aos livros prontos para digitalização.',
  '/workflow/scanning-started': 'Acede aos livros atualmente a ser digitalizados.',
  '/workflow/storage': 'Acede aos livros digitalizados prontos para o fluxo de trabalho digital (ex.: indexação).',
  '/workflow/to-indexing': 'Acede aos livros prontos para indexação.',
  '/workflow/indexing-started': 'Acede aos livros atualmente a ser indexados.',
  '/workflow/to-checking': 'Acede aos livros prontos para controlo de qualidade.',
  '/workflow/checking-started': 'Acede aos livros atualmente a ser verificados.',
  '/workflow/ready-for-processing': 'Acede aos livros prontos para processamento automatizado (ex.: OCR).',
  '/workflow/in-processing': 'Acede à página de monitorização de livros atualmente em processamento automatizado.',
  '/workflow/processed': 'Acede aos livros que completaram o processamento automatizado.',
  '/workflow/final-quality-control': 'Acede aos livros para revisão final de qualidade antes da entrega ao cliente.',
  '/workflow/delivery': 'Acede aos livros para preparar e enviar os finalizados ao cliente.',
  '/workflow/client-rejections': 'Acede aos livros rejeitados pelo cliente que necessitam de correção.',
  '/workflow/corrected': 'Acede aos livros corrigidos prontos para reenvio.',
  '/finalized': 'Acede aos livros aprovados pelo cliente à espera de arquivamento final.',
  '/archive': 'Acede à visualização de todos os livros totalmente arquivados e concluídos.',
  '/shipments': 'Página voltada para o cliente para preparar e marcar livros como enviados.',
  '/my-validations': 'Página voltada para o cliente para ver e realizar tarefas de validação atribuídas (legado).',
  '/my-tasks': 'Página voltada para o cliente para ver e realizar tarefas de validação atribuídas.',
  '/manage-deliveries': 'Permite aos gestores de clientes distribuir tarefas de validação.',
  '/validation-monitoring': 'Permite aos gestores de clientes monitorizar o progresso das tarefas de validação distribuídas.',
  '/validated-history': 'Página voltada para o cliente para ver o histórico de todos os lotes validados.',
  '/reasons': 'Permite gerir motivos de rejeição personalizados para clientes.',
  '/client/view-all-validations': 'Permite a um utilizador cliente (ex.: gestor) ver todas as tarefas de validação da sua empresa, não apenas as suas.'
};
