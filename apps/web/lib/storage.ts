import { Project, parseProject } from "./model";
function db() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("buildvision-local", 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("projects", { keyPath: "projectId" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function saveLocal(p: Project) {
  const d = await db();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = d.transaction("projects", "readwrite");
      tx.objectStore("projects").put(p);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    d.close();
  }
}
export async function listLocal() {
  const d = await db();
  try {
    return await new Promise<Project[]>((resolve, reject) => {
      const r = d.transaction("projects").objectStore("projects").getAll();
      r.onsuccess = () => resolve(r.result.map(parseProject));
      r.onerror = () => reject(r.error);
    });
  } finally {
    d.close();
  }
}
export async function deleteLocal(id: string) {
  const d = await db();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = d.transaction("projects", "readwrite");
      tx.objectStore("projects").delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    d.close();
  }
}
export const API =
  process.env.NEXT_PUBLIC_VISION_URL || "http://127.0.0.1:8000";
export async function request(path: string, init?: RequestInit) {
  const r = await fetch(API + path, {
    ...init,
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) {
    let detail;
    try {
      detail = (await r.json()).detail;
    } catch {}
    throw Error(typeof detail === "string" ? detail : `API trả về ${r.status}`);
  }
  return r.json();
}
