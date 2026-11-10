"use client";

type OfflineMutation = {
  id: string;
  endpoint: string;
  method: "POST" | "PATCH" | "DELETE";
  body: Record<string, unknown>;
  createdAt: string;
};

const DB_NAME = "jbcs-finance-offline";
const DB_VERSION = 1;
const STORE = "records";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("Offline storage is unavailable in this browser."));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open offline storage."));
  });
}

async function read<T>(key: string): Promise<T | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    request.onsuccess = () => { db.close(); resolve(request.result?.value ?? null); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

async function write(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).put({ key, value });
    request.onsuccess = () => { db.close(); resolve(); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function getOfflineValue<T>(key: string): Promise<T | null> {
  return read<T>(`cache:${key}`);
}

export async function setOfflineValue(key: string, value: unknown): Promise<void> {
  await write(`cache:${key}`, value);
}

export async function getPendingCount(): Promise<number> {
  const queue = await read<OfflineMutation[]>("queue");
  return queue?.length ?? 0;
}

export async function enqueueOfflineMutation(
  mutation: Omit<OfflineMutation, "createdAt">,
): Promise<number> {
  const queue = (await read<OfflineMutation[]>("queue")) ?? [];
  if (!queue.some((item) => item.id === mutation.id)) {
    queue.push({ ...mutation, createdAt: new Date().toISOString() });
    await write("queue", queue);
  }
  return queue.length;
}

export async function syncOfflineMutations(): Promise<{ synced: number; pending: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, pending: await getPendingCount() };
  }
  let queue = (await read<OfflineMutation[]>("queue")) ?? [];
  let synced = 0;
  for (const mutation of queue) {
    let response: Response;
    try {
      response = await fetch(mutation.endpoint, {
        method: mutation.method,
        headers: { "Content-Type": "application/json", "X-JBCS-Offline-Mutation": mutation.id },
        body: mutation.method === "DELETE" ? undefined : JSON.stringify(mutation.body),
        cache: "no-store",
      });
    } catch {
      break;
    }
    if (!response.ok) {
      // Keep failed items for review/retry. Never silently discard a financial entry.
      break;
    }
    queue = queue.filter((item) => item.id !== mutation.id);
    await write("queue", queue);
    synced += 1;
  }
  return { synced, pending: queue.length };
}
