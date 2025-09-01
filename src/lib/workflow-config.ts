

import { LucideIcon } from "lucide-react";

export type StageConfigItem = {
  title: string;
  description: string;
  viewType: 'list' | 'folder' | 'correction' | 'processing' | 'delivery-batch';
  emptyStateText: string;
  dataType: 'book' | 'document';
  actionButtonLabel?: string;
  actionButtonIcon?: string;
  dataStatus?: string;
  assigneeRole?: 'scanner' | 'indexer' | 'qc';
};

type StageConfig = {
  [key: string]: StageConfigItem;
}

export const MANDATORY_STAGES = [
  "pending-shipment", "confirm-reception", "already-received", "storage",
  "delivery", "pending-deliveries", "client-rejections", "corrected",
  "finalized", "archive"
];

export const WORKFLOW_PHASES = [ 
  {
     id: 'intake',
    name: "Admissão & Receção",
    toggleable: false,
    description: "Etapas iniciais de receção dos livros.",
    stages: ["pending-shipment", "confirm-reception", "already-received"],
    config: {
      'pending-shipment': {
        title: "Envio Pendente",
        description: "Livros criados, mas ainda não enviados pelo cliente.",
        emptyStateText: "Não há livros atualmente à espera de envio.",
        dataType: 'book',
        dataStatus: 'Pending Shipment',
        viewType: 'list',
      },
      'confirm-reception': {
        title: "Confirmar Receção",
        description: "Livros marcados como enviados pelo cliente. Confirme a sua chegada física.",
        actionButtonLabel: "Confirmar Chegada",
        actionButtonIcon: "Check",
        emptyStateText: "Não há livros atualmente em trânsito a partir dos clientes.",
        dataType: 'book',
        dataStatus: 'In Transit',
        viewType: 'list',
      },
      'already-received': {
        title: "Recebidos",
        description: "Livros recebidos. Atribua a um scanner ou envie para armazenamento se a digitalização estiver desativada.",
        emptyStateText: "Não há livros recebidos à espera de processamento.",
        dataType: 'book',
        dataStatus: 'Received',
        viewType: 'list',
      },
    }
  },
  {
    id: 'scanning',
    name: "Digitalização",
    toggleable: true,
    description: "Conversão dos livros físicos em ficheiros de imagem.",
    stages: ["to-scan", "scanning-started"],
    config: {
      'to-scan': {
        title: "Digitalização Pendente",
        description: "Livros recebidos e prontos para serem digitalizados.",
        actionButtonLabel: "Iniciar Digitalização",
        actionButtonIcon: "Play",
        emptyStateText: "Não há livros prontos para digitalização para si.",
        dataType: 'book',
        dataStatus: 'To Scan',
        viewType: 'list',
        assigneeRole: 'scanner',
      },
      'scanning-started': {
        title: "Digitalização Iniciada",
        description: "Livros atualmente em processo de digitalização.",
        actionButtonLabel: "Marcar como Concluído",
        actionButtonIcon: "ScanLine",
        emptyStateText: "Não há livros a ser digitalizados por si atualmente.",
        dataType: 'book',
        dataStatus: 'Scanning Started',
        viewType: 'list',
        assigneeRole: 'scanner',
      },
    }
  },
  {
    id: 'storage',
    name: "Armazenamento",
    toggleable: false,
    description: "O ponto de entrada para o fluxo de trabalho digital.",
    stages: ["storage"],
    config: {
      'storage': {
        title: "Armazenamento",
        description: "Documentos digitalizados organizados por livro. Atribua livros a um indexador.",
        actionButtonLabel: "Atribuir para Indexação",
        actionButtonIcon: "UserPlus",
        emptyStateText: "Não há documentos digitalizados à espera em armazenamento.",
        dataStatus: 'Storage',
        viewType: 'folder',
        dataType: 'book',
        assigneeRole: 'indexer',
      },
    }
  },
  {
    id: 'indexing',
    name: "Indexação",
    toggleable: true,
    description: "Introdução manual ou automática de dados e marcação de metadados.",
    stages: ["to-indexing", "indexing-started"],
    config: {
      'to-indexing': {
        title: "Indexação Pendente",
        description: "Livros atribuídos e prontos para indexação.",
        actionButtonLabel: "Iniciar Indexação",
        actionButtonIcon: "Play",
        emptyStateText: "Não há livros prontos para indexação para si.",
        dataType: 'book',
        dataStatus: 'To Indexing',
        viewType: 'list',
        assigneeRole: 'indexer',
      },
      'indexing-started': {
        title: "Indexação Iniciada",
        description: "Livros atualmente a ser indexados. Atribua a um especialista de QC quando concluído.",
        actionButtonLabel: "Marcar como Concluído",
        actionButtonIcon: "Send",
        emptyStateText: "Não há livros a ser indexados por si atualmente.",
        dataType: 'book',
        dataStatus: 'Indexing Started',
        viewType: 'list',
        assigneeRole: 'indexer',
      },
    }
  },
  {
    id: 'checking',
    name: "Controlo de Qualidade Inicial",
    toggleable: true,
    description: "Verificação inicial da qualidade e completude da digitalização.",
    stages: ["to-checking", "checking-started"],
    config: {
      'to-checking': {
        title: "PageChecker Pendente",
        description: "Livros indexados e prontos para controlo de qualidade inicial.",
        actionButtonLabel: "Iniciar Verificação",
        actionButtonIcon: "Play",
        emptyStateText: "Não há livros prontos para verificação para si.",
        dataType: 'book',
        dataStatus: 'To Checking',
        viewType: 'list',
        assigneeRole: 'qc',
      },
      'checking-started': {
        title: "PageChecker Iniciada",
        description: "Livros atualmente em controlo de qualidade inicial.",
        actionButtonLabel: "Marcar como Concluído",
        actionButtonIcon: "Play",
        emptyStateText: "Não há livros a ser verificados por si atualmente.",
        dataType: 'book',
        dataStatus: 'Checking Started',
        viewType: 'list',
        assigneeRole: 'qc',
      },
    }
  },
  {
    id: 'processing',
    name: "Processamento Automático",
    toggleable: true,
    description: "Processamento automatizado, incluindo OCR, extração de dados e outros scripts.",
    stages: ["ready-for-processing", "in-processing", "processed"],
    config: {
      'ready-for-processing': {
        title: "Processamento Pendente",
        description: "Livros com documentos prontos para processamento técnico, como OCR.",
        actionButtonLabel: "Iniciar Processamento",
        actionButtonIcon: "Play",
        emptyStateText: "Não há livros prontos para processamento.",
        dataType: 'book',
        dataStatus: 'Ready for Processing',
        viewType: 'list',
      },
      'in-processing': {
        title: "Em Processamento",
        description: "Documentos atualmente a ser processados por scripts automatizados.",
        emptyStateText: "Não há documentos a ser processados atualmente.",
        dataStatus: "In Processing",
        viewType: 'processing',
        dataType: 'book'
      },
      'processed': {
        title: "Lotes Processados",
        description: "Lotes que completaram o processamento automatizado e estão prontos para revisão final.",
        actionButtonLabel: "Enviar para QC Final",
        actionButtonIcon: "Send",
        emptyStateText: "Não há lotes processados.",
        dataType: 'book',
        dataStatus: "Processed",
        viewType: 'list',
      }
    }
  },
  {
    id: 'final_qc',
    name: "Controlo de Qualidade Final",
    toggleable: true,
    description: "Revisão final antes de enviar ao cliente.",
    stages: ["final-quality-control"],
    config: {
      'final-quality-control': {
        title: "QC Final",
        description: "Rever documentos quanto à qualidade e precisão antes da entrega.",
        actionButtonLabel: "Aprovar para Entrega",
        actionButtonIcon: "Check",
        emptyStateText: "Não há documentos para QC final.",
        dataType: 'book',
        dataStatus: "Final Quality Control",
        viewType: 'folder',
      },
    }
  },
  {
    id: 'delivery_loop',
    name: "Entrega & Correção",
    toggleable: false,
    description: "Etapas envolvendo interação e feedback do cliente.",
    stages: ["delivery", "pending-deliveries", "client-rejections", "corrected"],
    config: {
      'delivery': {
        title: "Entrega",
        description: "Agrupar livros em lote para enviar ao cliente para validação.",
        emptyStateText: "Não há documentos prontos para entrega.",
        dataType: 'book',
        dataStatus: "Delivery",
        viewType: 'delivery-batch',
      },
      'pending-deliveries': {
        title: "Entregas Pendentes",
        description: "Documentos à espera de revisão e aprovação.",
        actionButtonLabel: "",
        actionButtonIcon: "ThumbsUp",
        emptyStateText: "Não existem entregas pendentes.",
        dataStatus: "Pending Validation",
        viewType: "folder",
        dataType: 'book'
      },
      'client-rejections': {
        title: "Rejeições do Cliente",
        description: "Livros rejeitados pelo cliente e que necessitam de correção.",
        actionButtonLabel: "Marcar como Corrigido",
        actionButtonIcon: "Undo2",
        emptyStateText: "Não há livros rejeitados pelos clientes.",
        dataStatus: 'Client Rejected',
        viewType: 'correction',
        dataType: 'book',
      },
      'corrected': {
        title: "Livros Corrigidos",
        description: "Livros corrigidos e prontos para reintegração no workflow.",
        emptyStateText: "Não existem livros corrigidos.",
        dataType: 'book',
        dataStatus: 'Corrected',
        viewType: 'folder'
      }
    }
  },
  {
    id: 'finalization',
    name: "Finalização",
    toggleable: false,
    description: "Etapas finais de arquivamento.",
    stages: ["finalized", "archive"],
    config: {
      'finalized': {
        title: "Documentos Finalizados",
        description: "Documentos que completaram a validação do cliente e estão prontos para arquivamento.",
        actionButtonLabel: "Arquivar",
        actionButtonIcon: "Archive",
        emptyStateText: "Não há documentos atualmente finalizados.",
        dataStatus: "Finalized",
        viewType: "folder",
        dataType: 'book'
      },
      'archive': {
        title: "Documentos Arquivados",
        description: "Documentos em armazenamento de longo prazo.",
        actionButtonLabel: "",
        actionButtonIcon: "Archive",
        emptyStateText: "Ainda não há documentos arquivados.",
        dataStatus: "Archived",
        viewType: "folder",
        dataType: 'book'
      }
    }
  }
];

export const WORKFLOW_SEQUENCE: string[] = WORKFLOW_PHASES.flatMap(group => group.stages);

export const STAGE_CONFIG: StageConfig = WORKFLOW_PHASES.reduce((acc, group) => {
  return { ...acc, ...group.config };
}, {});

export const findStageKeyFromStatus = (statusName: string): string | undefined => {
    for (const stageKey in STAGE_CONFIG) {
        const config = STAGE_CONFIG[stageKey as keyof typeof STAGE_CONFIG];
        if (config.dataStatus === statusName) {
            return stageKey;
        }
    }
    return undefined;
};

export const getNextEnabledStage = (currentStage: string, workflow: string[]): string | null => {
    const currentIndex = WORKFLOW_SEQUENCE.indexOf(currentStage);
    if (currentIndex === -1) return null;
    for (let i = currentIndex + 1; i < WORKFLOW_SEQUENCE.length; i++) {
        const nextStageKey = WORKFLOW_SEQUENCE[i];
        if (workflow.includes(nextStageKey)) return nextStageKey;
    }
    return null;
};
