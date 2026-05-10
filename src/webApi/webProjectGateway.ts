import type { ProjectSummaryRecord, ProjectRecord } from '../commands/projectState';

const DB_NAME = 'ArtFlowUI';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
  });
}

function transaction(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  const tx = db.transaction(STORE_NAME, mode);
  return tx.objectStore(STORE_NAME);
}

export interface WebProjectGateway {
  listProjectSummaries: () => Promise<ProjectSummaryRecord[]>;
  getProjectRecord: (projectId: string) => Promise<ProjectRecord | null>;
  upsertProjectRecord: (record: ProjectRecord) => Promise<void>;
  updateProjectViewportRecord: (projectId: string, viewportJson: string) => Promise<void>;
  renameProjectRecord: (projectId: string, name: string, updatedAt: number) => Promise<void>;
  deleteProjectRecord: (projectId: string) => Promise<void>;
}

export const webProjectGateway: WebProjectGateway = {
  async listProjectSummaries(): Promise<ProjectSummaryRecord[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const store = transaction(db, 'readonly');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const records: ProjectSummaryRecord[] = request.result.map((r: ProjectRecord) => ({
          id: r.id,
          name: r.name,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          nodeCount: r.nodeCount,
        }));
        records.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(records);
      };
    });
  },

  async getProjectRecord(projectId: string): Promise<ProjectRecord | null> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const store = transaction(db, 'readonly');
      const request = store.get(projectId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? null);
    });
  },

  async upsertProjectRecord(record: ProjectRecord): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const store = transaction(db, 'readwrite');
      const request = store.put(record);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },

  async updateProjectViewportRecord(projectId: string, viewportJson: string): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const store = transaction(db, 'readwrite');
      const getRequest = store.get(projectId);

      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const record = getRequest.result as ProjectRecord | undefined;
        if (record) {
          record.viewportJson = viewportJson;
          const putRequest = store.put(record);
          putRequest.onerror = () => reject(putRequest.error);
          putRequest.onsuccess = () => resolve();
        } else {
          resolve();
        }
      };
    });
  },

  async renameProjectRecord(projectId: string, name: string, updatedAt: number): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const store = transaction(db, 'readwrite');
      const getRequest = store.get(projectId);

      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const record = getRequest.result as ProjectRecord | undefined;
        if (record) {
          record.name = name;
          record.updatedAt = updatedAt;
          const putRequest = store.put(record);
          putRequest.onerror = () => reject(putRequest.error);
          putRequest.onsuccess = () => resolve();
        } else {
          resolve();
        }
      };
    });
  },

  async deleteProjectRecord(projectId: string): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const store = transaction(db, 'readwrite');
      const request = store.delete(projectId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },
};
