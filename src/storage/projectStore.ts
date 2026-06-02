import type { EditorDocument } from "../domain/types";

const DATABASE_NAME = "verseform";
const DATABASE_VERSION = 1;
const PROJECT_STORE = "project";
const ACTIVE_PROJECT_KEY = "active";

export interface PersistedProject {
  document: EditorDocument;
  history: EditorDocument[];
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function openDatabase(): Promise<IDBDatabase> {
  const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(PROJECT_STORE)) {
      request.result.createObjectStore(PROJECT_STORE);
    }
  };
  return requestResult(request);
}

export async function saveProject(project: PersistedProject): Promise<void> {
  const database = await openDatabase();

  try {
    const transaction = database.transaction(PROJECT_STORE, "readwrite");
    const completed = transactionComplete(transaction);
    transaction.objectStore(PROJECT_STORE).put(project, ACTIVE_PROJECT_KEY);
    await completed;
  } finally {
    database.close();
  }
}

export async function loadProject(): Promise<PersistedProject | undefined> {
  const database = await openDatabase();

  try {
    const transaction = database.transaction(PROJECT_STORE, "readonly");
    const completed = transactionComplete(transaction);
    const project = await requestResult(
      transaction.objectStore(PROJECT_STORE).get(ACTIVE_PROJECT_KEY),
    );
    await completed;
    return project as PersistedProject | undefined;
  } finally {
    database.close();
  }
}

export async function deleteDatabase(): Promise<void> {
  await requestResult(indexedDB.deleteDatabase(DATABASE_NAME));
}
