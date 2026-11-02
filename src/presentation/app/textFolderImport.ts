export interface FolderTextFile {
  file: File;
  relativePath: string;
}

export interface FolderImportGroup {
  title: string;
  folderPath: string;
  files: FolderTextFile[];
}

export interface FolderDiscoveryResult {
  files: FolderTextFile[];
  errors: string[];
}

export const FOLDER_IMPORT_MAX_DEPTH = 64;

const PATH_SEPARATOR = /[\\/]+/;

export function normalizeRelativePath(value: string): string {
  return value
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/');
}

export function fileRelativePath(file: File): string {
  return normalizeRelativePath(file.webkitRelativePath || file.name);
}

export function folderPathOf(relativePath: string): string {
  const normalized = normalizeRelativePath(relativePath);
  const index = normalized.lastIndexOf('/');
  return index <= 0 ? '' : normalized.slice(0, index);
}

export function folderTitleFromPath(folderPath: string): string {
  const segments = normalizeRelativePath(folderPath).split(PATH_SEPARATOR);
  const title = segments[segments.length - 1] ?? '';
  return title.trim();
}

export function collectionTitleFromPath(folderPath: string): string {
  const segments = normalizeRelativePath(folderPath)
    .split(PATH_SEPARATOR)
    .filter(Boolean);
  return segments.join('-');
}

export function folderHasSubfolders(files: FolderTextFile[]): boolean {
  return files.some(
    (entry) => normalizeRelativePath(entry.relativePath).split('/').length > 2
  );
}

export function filesFromDirectoryInput(files: File[]): FolderTextFile[] {
  return files
    .map((file) => ({
      file,
      relativePath: normalizeRelativePath(
        file.webkitRelativePath || file.name
      ),
    }))
    .filter((entry) => folderPathOf(entry.relativePath).length > 0);
}

export function groupFilesByFolder(
  files: FolderTextFile[]
): FolderImportGroup[] {
  const groups = new Map<string, FolderImportGroup>();

  for (const entry of files) {
    const folderPath = folderPathOf(entry.relativePath);
    if (!folderPath) continue;

    let group = groups.get(folderPath);
    if (!group) {
      group = {
        title: folderTitleFromPath(folderPath),
        folderPath,
        files: [],
      };
      groups.set(folderPath, group);
    }
    group.files.push(entry);
  }

  return [...groups.values()]
    .filter((group) => group.title.length > 0)
    .sort((a, b) => a.folderPath.localeCompare(b.folderPath))
    .map((group) => ({
      ...group,
      files: [...group.files].sort((a, b) =>
        a.relativePath.localeCompare(b.relativePath)
      ),
    }));
}

export function groupFilesByRoot(
  files: FolderTextFile[]
): FolderImportGroup[] {
  const groups = new Map<string, FolderImportGroup>();

  for (const entry of files) {
    const normalized = normalizeRelativePath(entry.relativePath);
    const root = normalized.split('/')[0] ?? '';
    if (!root) continue;

    let group = groups.get(root);
    if (!group) {
      group = {
        title: root,
        folderPath: root,
        files: [],
      };
      groups.set(root, group);
    }
    group.files.push(entry);
  }

  return [...groups.values()]
    .sort((a, b) => a.folderPath.localeCompare(b.folderPath))
    .map((group) => ({
      ...group,
      files: [...group.files].sort((a, b) =>
        a.relativePath.localeCompare(b.relativePath)
      ),
    }));
}

function readAllDirectoryEntries(
  reader: FileSystemDirectoryReader
): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const entries: FileSystemEntry[] = [];
    const readBatch = (): void => {
      reader.readEntries(
        (batch) => {
          if (batch.length === 0) {
            resolve(entries);
            return;
          }
          entries.push(...batch);
          readBatch();
        },
        (error) => reject(error)
      );
    };
    readBatch();
  });
}

function readFileEntry(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => {
    entry.file(resolve, reject);
  });
}

async function collectEntries(
  entries: FileSystemEntry[],
  depth: number,
  files: FolderTextFile[],
  errors: string[]
): Promise<void> {
  for (const entry of entries) {
    if (entry.isDirectory) {
      if (depth >= FOLDER_IMPORT_MAX_DEPTH) {
        errors.push(
          `A pasta "${entry.fullPath}" excede a profundidade máxima permitida.`
        );
        continue;
      }
      try {
        const reader = (entry as FileSystemDirectoryEntry).createReader();
        const children = await readAllDirectoryEntries(reader);
        await collectEntries(children, depth + 1, files, errors);
      } catch {
        errors.push(`Não foi possível ler a pasta "${entry.fullPath}".`);
      }
      continue;
    }

    if (!entry.isFile) continue;

    try {
      const file = await readFileEntry(entry as FileSystemFileEntry);
      files.push({
        file,
        relativePath: normalizeRelativePath(entry.fullPath || file.name),
      });
    } catch {
      errors.push(`Não foi possível ler o arquivo "${entry.fullPath}".`);
    }
  }
}

export function dropEntries(dataTransfer: DataTransfer | null): FileSystemEntry[] {
  if (!dataTransfer || !dataTransfer.items) return [];
  const entries: FileSystemEntry[] = [];
  for (const item of Array.from(dataTransfer.items)) {
    if (item.kind !== 'file') continue;
    const entry = item.webkitGetAsEntry?.();
    if (entry) entries.push(entry);
  }
  return entries;
}

export function dropHasDirectory(dataTransfer: DataTransfer | null): boolean {
  return dropEntries(dataTransfer).some((entry) => entry.isDirectory);
}

export async function collectFolderFilesFromEntries(
  entries: FileSystemEntry[]
): Promise<FolderDiscoveryResult> {
  const files: FolderTextFile[] = [];
  const errors: string[] = [];
  await collectEntries(entries, 0, files, errors);
  return { files, errors };
}
