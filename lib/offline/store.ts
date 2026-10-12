export type OfflineOperation = {
  id: string;
  userId: string;
  organizationId: string;
  projectId: string;
  module: string;
  command: string;
  parameters: Record<string, unknown>;
  createdAt: string;
};

export type WorkspaceSnapshot = {
  key: string;
  userId: string;
  projectId: string;
  savedAt: string;
  payload: Record<string, unknown>;
};

const DATABASE_NAME = "buildproof-field-cache-v1";
const DATABASE_VERSION = 1;
const OPERATIONS = "operations";
const SNAPSHOTS = "snapshots";
const QUEUE_EVENT = "buildproof:queue-change";

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(OPERATIONS)) {
        const store = database.createObjectStore(OPERATIONS, { keyPath: "id" });
        store.createIndex("scope", ["userId", "organizationId", "projectId"]);
      }
      if (!database.objectStoreNames.contains(SNAPSHOTS)) {
        database.createObjectStore(SNAPSHOTS, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact<T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = action(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error);
  });
}

function announceQueueChange() {
  window.dispatchEvent(new CustomEvent(QUEUE_EVENT));
}

export async function queueOfflineOperation(operation: Omit<OfflineOperation, "id" | "createdAt">) {
  const record: OfflineOperation = { ...operation, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  await transact(OPERATIONS, "readwrite", (store) => store.put(record));
  announceQueueChange();
  return record;
}

export async function listOfflineOperations(userId: string, organizationId?: string, projectId?: string) {
  const records = await transact<OfflineOperation[]>(OPERATIONS, "readonly", (store) => store.getAll());
  return records
    .filter((record) => record.userId === userId && (!organizationId || record.organizationId === organizationId) && (!projectId || record.projectId === projectId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function removeOfflineOperation(id: string) {
  await transact(OPERATIONS, "readwrite", (store) => store.delete(id));
  announceQueueChange();
}

export async function saveWorkspaceSnapshot(snapshot: WorkspaceSnapshot) {
  await transact(SNAPSHOTS, "readwrite", (store) => store.put(snapshot));
}

export async function loadWorkspaceSnapshot(userId: string, projectId: string) {
  return transact<WorkspaceSnapshot | undefined>(SNAPSHOTS, "readonly", (store) => store.get(`${userId}:${projectId}`));
}

export async function loadLatestWorkspaceSnapshot(userId: string) {
  const snapshots = await transact<WorkspaceSnapshot[]>(SNAPSHOTS, "readonly", (store) => store.getAll());
  return snapshots
    .filter((snapshot) => snapshot.userId === userId)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))[0];
}

export async function clearOfflineData(userId: string) {
  const [operations, snapshots] = await Promise.all([
    transact<OfflineOperation[]>(OPERATIONS, "readonly", (store) => store.getAll()),
    transact<WorkspaceSnapshot[]>(SNAPSHOTS, "readonly", (store) => store.getAll()),
  ]);
  const database = await openDatabase();
  const transaction = database.transaction([OPERATIONS, SNAPSHOTS], "readwrite");
  for (const record of operations) if (record.userId === userId) transaction.objectStore(OPERATIONS).delete(record.id);
  for (const snapshot of snapshots) if (snapshot.userId === userId) transaction.objectStore(SNAPSHOTS).delete(snapshot.key);
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
  announceQueueChange();
}

export function subscribeToQueueChange(callback: () => void) {
  window.addEventListener(QUEUE_EVENT, callback);
  return () => window.removeEventListener(QUEUE_EVENT, callback);
}
