import fs from "fs/promises";
import path from "path";
import type { ItemFilter, StoredItem, SnsItem } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "items.json");
const SNS_PATH = path.join(DATA_DIR, "sns.json");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readAll(): Promise<StoredItem[]> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as StoredItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(items: StoredItem[]): Promise<void> {
  await ensureDataDir();
  const tmp = STORE_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(items, null, 2), "utf-8");
  await fs.rename(tmp, STORE_PATH);
}

export async function listItems(): Promise<StoredItem[]> {
  const items = await readAll();
  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getItem(id: string): Promise<StoredItem | undefined> {
  const items = await readAll();
  return items.find((x) => x.id === id);
}

export async function appendItem(item: StoredItem): Promise<void> {
  const items = await readAll();
  items.push(item);
  await writeAll(items);
}

export async function patchItem(
  id: string,
  patch: Partial<StoredItem>
): Promise<StoredItem | null> {
  const items = await readAll();
  const idx = items.findIndex((x) => x.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...patch } as StoredItem;
  await writeAll(items);
  return items[idx];
}

export async function deleteItems(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const set = new Set(ids);
  const items = await readAll();
  const dropping = items.filter((x) => set.has(x.id));
  for (const row of dropping) {
    if (row.type === "art" && row.imageUrl?.startsWith("/generated/")) {
      const rel = row.imageUrl.replace(/^\//, "");
      const filePath = path.join(process.cwd(), "public", rel);
      await fs.unlink(filePath).catch(() => {});
    }
    if (row.type === "drawing-script" && row.generatedImages?.length) {
      for (const url of row.generatedImages) {
        if (url.startsWith("/generated/")) {
          const filePath = path.join(process.cwd(), "public", url.slice(1));
          await fs.unlink(filePath).catch(() => {});
        }
      }
    }
  }
  const next = items.filter((x) => !set.has(x.id));
  const removed = items.length - next.length;
  await writeAll(next);
  return removed;
}

export async function updateItemTags(
  id: string,
  tags: string[]
): Promise<StoredItem | null> {
  return patchItem(id, { tags } as Partial<StoredItem>);
}

export async function filterItems(filter: ItemFilter): Promise<StoredItem[]> {
  let items = await readAll();

  if (filter.type) {
    items = items.filter((x) => x.type === filter.type);
  }

  if (filter.search) {
    const q = filter.search.toLowerCase();
    items = items.filter((x) => {
      if (x.type === "music") {
        return (
          x.songInput.title.toLowerCase().includes(q) ||
          x.songInput.artist.toLowerCase().includes(q) ||
          x.atmosphereDescription.toLowerCase().includes(q)
        );
      }
      if (x.type === "art") {
        return (
          x.prompt.toLowerCase().includes(q) ||
          (x.revisedPrompt?.toLowerCase().includes(q) ?? false)
        );
      }
      if (x.type === "drawing-script") {
        return (
          (x.sourcePrompt?.toLowerCase().includes(q) ?? false) ||
          x.subject.toLowerCase().includes(q)
        );
      }
      if (x.type === "music-script") {
        return (
          x.sourceTitle.toLowerCase().includes(q) ||
          x.sourceArtist.toLowerCase().includes(q)
        );
      }
      return false;
    });
  }

  if (filter.tags && filter.tags.length > 0) {
    items = items.filter((x) =>
      filter.tags!.every((t) => x.tags?.includes(t))
    );
  }

  const dir = filter.sortDir === "asc" ? 1 : -1;
  if (filter.sortBy === "type") {
    items.sort((a, b) => dir * a.type.localeCompare(b.type));
  } else {
    items.sort(
      (a, b) =>
        dir *
        (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    );
  }

  return items;
}

// ---- SNS ストア ----

async function readSns(): Promise<SnsItem[]> {
  try {
    const raw = await fs.readFile(SNS_PATH, "utf-8");
    const parsed = JSON.parse(raw) as SnsItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeSns(items: SnsItem[]): Promise<void> {
  await ensureDataDir();
  const tmp = SNS_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(items, null, 2), "utf-8");
  await fs.rename(tmp, SNS_PATH);
}

export async function listSns(): Promise<SnsItem[]> {
  const items = await readSns();
  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function appendSns(item: SnsItem): Promise<void> {
  const items = await readSns();
  items.push(item);
  await writeSns(items);
}

export async function patchSns(
  id: string,
  patch: Partial<SnsItem>
): Promise<SnsItem | null> {
  const items = await readSns();
  const idx = items.findIndex((x) => x.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...patch };
  await writeSns(items);
  return items[idx];
}

export async function deleteSns(id: string): Promise<boolean> {
  const items = await readSns();
  const next = items.filter((x) => x.id !== id);
  if (next.length === items.length) return false;
  await writeSns(next);
  return true;
}
