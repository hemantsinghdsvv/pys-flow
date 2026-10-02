import "server-only";
import { UTApi } from "uploadthing/server";

export type StoredFile = {
  /** UploadThing file key — persist this in the DB. */
  path: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  /** URL the app serves the file from (UploadThing CDN). */
  url: string;
};

export interface StorageDriver {
  save(file: File, folder: string): Promise<StoredFile>;
  read(relativePath: string): Promise<Buffer>;
  delete(relativePath: string): Promise<void>;
}

const ALLOWED_MIME_PREFIXES = ["image/", "application/pdf", "text/"];
const ALLOWED_MIME_EXACT = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export function isAllowedMime(mime: string) {
  return (
    ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p)) ||
    ALLOWED_MIME_EXACT.includes(mime)
  );
}

class UploadThingDriver implements StorageDriver {
  private utapi = new UTApi();

  async save(file: File, folder: string): Promise<StoredFile> {
    if (file.size === 0) throw new Error("Empty file.");
    if (file.size > MAX_FILE_SIZE) throw new Error("File exceeds 20 MB limit.");
    if (!isAllowedMime(file.type)) {
      throw new Error(`File type not allowed: ${file.type || "unknown"}`);
    }

    // `uploadFiles` natively accepts File | File[] objects
    const response = await this.utapi.uploadFiles(file);

    if (response.error) {
      throw new Error(`UploadThing Error: ${response.error.message}`);
    }

    return {
      path: response.data.key, // UploadThing unique key
      fileName: response.data.name,
      fileSize: response.data.size,
      mimeType: file.type || "application/octet-stream",
      url: response.data.url, // UploadThing global CDN url
    };
  }

  async read(relativePath: string): Promise<Buffer> {
    // We don't read files locally anymore.
    // The client uses the UploadThing 'url' directly for downloads/display.
    throw new Error("Local 'read' is disabled. Use the UploadThing CDN URL instead.");
  }

  async delete(relativePath: string): Promise<void> {
    // The relativePath stored in DB is the UploadThing 'key'
    await this.utapi.deleteFiles(relativePath);
  }
}

export const storage: StorageDriver = new UploadThingDriver();
