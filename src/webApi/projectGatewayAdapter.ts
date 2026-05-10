import type { ProjectSummaryRecord, ProjectRecord } from '../commands/projectState';

let cachedProjectGateway: {
  listProjectSummaries: () => Promise<ProjectSummaryRecord[]>;
  getProjectRecord: (projectId: string) => Promise<ProjectRecord | null>;
  upsertProjectRecord: (record: ProjectRecord) => Promise<void>;
  updateProjectViewportRecord: (projectId: string, viewportJson: string) => Promise<void>;
  renameProjectRecord: (projectId: string, name: string, updatedAt: number) => Promise<void>;
  deleteProjectRecord: (projectId: string) => Promise<void>;
} | null = null;

export async function getProjectGateway() {
  if (cachedProjectGateway) {
    return cachedProjectGateway;
  }

  if (typeof window !== 'undefined' && (window as unknown as { Capacitor?: unknown }).Capacitor) {
    const { webProjectGateway } = await import('./webProjectGateway');
    cachedProjectGateway = webProjectGateway;
  } else {
    const tauriCommands = await import('../commands/projectState');
    cachedProjectGateway = tauriCommands;
  }

  return cachedProjectGateway;
}
