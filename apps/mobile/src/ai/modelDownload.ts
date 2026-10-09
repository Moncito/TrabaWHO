import { File, Paths, type DownloadTask } from "expo-file-system";

import { importedModelFile } from "./modelFile";

/**
 * One-time download of the on-device model (SPEC 5.5). After this, every AI feature works offline.
 * Sources are tried in order:
 *  1. EXPO_PUBLIC_AI_MODEL_URL (override)
 *  2. our GitHub Release: the exact Q4_K_M file the eval numbers come from (needs the repo public)
 *  3. Hugging Face unsloth build of the same model (slightly different quantization run)
 */
const GITHUB_RELEASE_URL = "https://github.com/Moncito/TrabaWHO/releases/download/model-v1/qwen3-1.7b-q4_k_m.gguf";
const HUGGINGFACE_URL = "https://huggingface.co/unsloth/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q4_K_M.gguf";

export const MODEL_SOURCES: string[] = [process.env.EXPO_PUBLIC_AI_MODEL_URL, GITHUB_RELEASE_URL, HUGGINGFACE_URL].filter(
  (u): u is string => !!u,
);

/** Shown to the user before downloading; the real size comes from the server. */
export const MODEL_SIZE_LABEL = "≈1.3 GB";
// download + some headroom for the final move
const MIN_FREE_BYTES = 1.6 * 1024 ** 3;
const MIN_MODEL_BYTES = 100 * 1024 * 1024;

export interface DownloadProgress {
  bytes: number;
  total: number; // -1 when unknown
  source: string;
}

export interface ModelDownload {
  promise: Promise<string>;
  cancel(): void;
}

export class NotEnoughSpaceError extends Error {}

/** Starts the download; resolves with the model path once it's complete and in place. */
export function startModelDownload(onProgress: (p: DownloadProgress) => void): ModelDownload {
  let current: DownloadTask | null = null;
  let cancelled = false;

  const promise = (async () => {
    if (Paths.availableDiskSpace < MIN_FREE_BYTES) {
      throw new NotEnoughSpaceError(`Kailangan ng ~1.6 GB na libreng space (mayroon ${(Paths.availableDiskSpace / 1024 ** 3).toFixed(1)} GB).`);
    }
    const part = new File(Paths.document, "model.gguf.part");
    let lastError: unknown = null;

    for (const source of MODEL_SOURCES) {
      if (cancelled) break;
      try {
        if (part.exists) part.delete();
        current = File.createDownloadTask(source, part, {
          onProgress: ({ bytesWritten, totalBytes }) => onProgress({ bytes: bytesWritten, total: totalBytes, source }),
        });
        const file = await current.downloadAsync();
        if (cancelled) break;
        if (!file || part.size < MIN_MODEL_BYTES) throw new Error("Hindi buo ang na-download na file");
        // Swap in only when complete, so a cut-off download is never loaded as a model.
        const dest = importedModelFile();
        if (dest.exists) dest.delete();
        // move() is async in expo-file-system 57: wait for it, or the model reload races the rename.
        await part.move(dest);
        return importedModelFile().uri;
      } catch (e) {
        lastError = e;
      }
    }
    if (part.exists) part.delete();
    if (cancelled) throw new Error("Kinansela");
    throw lastError instanceof Error ? lastError : new Error("Hindi ma-download ang model");
  })();

  return {
    promise,
    cancel() {
      cancelled = true;
      current?.cancel();
    },
  };
}
