import { File, Paths } from "expo-file-system";

// A real Q4 GGUF is ~1 GB; anything tiny is a failed/partial copy.
const MIN_MODEL_BYTES = 100 * 1024 * 1024;

/** Where an in-app picked model is copied: the app's private documents folder. */
export function importedModelFile(): File {
  return new File(Paths.document, "model.gguf");
}

function usable(uri: string): boolean {
  try {
    const f = new File(uri);
    return f.exists && f.size > MIN_MODEL_BYTES;
  } catch {
    return false;
  }
}

/**
 * Model lookup order:
 *  1. a file imported with the in-app picker (backup when `adb push` is blocked)
 *  2. the adb-pushed path from EXPO_PUBLIC_AI_MODEL_PATH
 */
export function resolveModelPath(adbPath: string): string | null {
  const imported = importedModelFile().uri;
  if (usable(imported)) return imported;
  if (usable(adbPath)) return adbPath;
  return null;
}

/**
 * Opens the system file picker (e.g. Downloads), and copies the chosen .gguf into app storage.
 * Returns the new path, or null if the user cancelled. Copying ~1.2 GB takes up to a minute.
 */
export async function pickAndImportModel(): Promise<string | null> {
  const picked = await File.pickFileAsync();
  if (picked.canceled) return null;

  const src = picked.result;
  if (!src.name.toLowerCase().endsWith(".gguf")) {
    throw new Error(`"${src.name}" is not a .gguf model file`);
  }
  const dest = importedModelFile();
  if (dest.exists) dest.delete();
  await src.copy(dest);
  if (!usable(dest.uri)) throw new Error("Copy failed or file is too small to be a model");
  return dest.uri;
}
