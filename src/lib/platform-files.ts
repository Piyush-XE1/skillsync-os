import { nativeSaveFile, nativeShareFile } from "./native/bridge";
import { isAbortError } from "./utils";

export type FileOperation =
  | "saved"
  | "shared"
  | "cancelled"
  | "fallback-download"
  | "unsupported"
  | "error";
type Payload = { filename: string; text: string; mimeType?: string };
const mime = "application/json";
const browserFile = (p: Payload) => new File([p.text], p.filename, { type: p.mimeType ?? mime });

function download(p: Payload) {
  const url = URL.createObjectURL(new Blob([p.text], { type: p.mimeType ?? mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = p.filename;
  a.style.display = "none";
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Platform boundary for physical backup files. Core backup code has no DOM/native dependencies. */
export async function saveBackupFile(
  p: Payload,
): Promise<{ status: FileOperation; message?: string }> {
  const native = await nativeSaveFile(p);
  if (native.status === "saved") return { status: "saved", message: native.location };
  if (native.status === "error") return { status: "error", message: native.message };
  const picker = (
    window as unknown as {
      showSaveFilePicker?: (o: unknown) => Promise<{
        createWritable(): Promise<{ write(v: string): Promise<void>; close(): Promise<void> }>;
      }>;
    }
  ).showSaveFilePicker;
  if (picker)
    try {
      const handle = await picker({
        suggestedName: p.filename,
        types: [{ description: "SkillSync backup", accept: { [p.mimeType ?? mime]: [".json"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(p.text);
      await writable.close();
      return { status: "saved" };
    } catch (e) {
      return isAbortError(e)
        ? { status: "cancelled" }
        : { status: "error", message: (e as Error).message };
    }
  try {
    download(p);
    return { status: "fallback-download" };
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
}
export async function shareBackupFile(
  p: Payload,
): Promise<{ status: FileOperation; message?: string }> {
  const native = await nativeShareFile(p);
  if (native.status === "shared") return { status: "shared" };
  if (native.status === "error") return { status: "error", message: native.message };
  const file = browserFile(p);
  const nav = navigator as Navigator & {
    canShare?(d: { files: File[] }): boolean;
    share?(d: { files: File[]; title: string }): Promise<void>;
  };
  if (nav.share && nav.canShare?.({ files: [file] }))
    try {
      await nav.share({ files: [file], title: "SkillSync backup" });
      return { status: "shared" };
    } catch (e) {
      return isAbortError(e)
        ? { status: "cancelled" }
        : { status: "error", message: (e as Error).message };
    }
  // A download is an explicit, useful fallback and never claims that sharing happened.
  try {
    download(p);
    return { status: "fallback-download" };
  } catch (e) {
    return { status: "unsupported", message: (e as Error).message };
  }
}
export const platformCapabilities = () => ({
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  fileSharing: typeof navigator !== "undefined" && "share" in navigator,
  filePicker: typeof window !== "undefined" && "showSaveFilePicker" in window,
});
