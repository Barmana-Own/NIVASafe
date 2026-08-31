import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createReadStream, existsSync, mkdirSync, promises as fs } from "node:fs";
import { isAbsolute, join, resolve, sep } from "node:path";

export interface StorageAdapter {
  put(key: string, body: Buffer, mimeType: string): Promise<void>;
  downloadUrl(key: string): Promise<string>;
  delete(key: string): Promise<void>;
  localPath?(key: string): string;
}

export function resolveStoragePath(root: string, key: string) {
  if (!key || key.includes("\0")) throw new Error("Invalid storage key");
  const absoluteRoot = resolve(root);
  const path = resolve(absoluteRoot, key);
  const rootPrefix = absoluteRoot.endsWith(sep) ? absoluteRoot : `${absoluteRoot}${sep}`;
  if (path !== absoluteRoot && !path.startsWith(rootPrefix)) throw new Error("Invalid storage key");
  return path;
}

class LocalStorageAdapter implements StorageAdapter {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
    if (!existsSync(this.root)) mkdirSync(this.root, { recursive: true });
  }

  private pathFor(key: string) { return resolveStoragePath(this.root, key); }
  async put(key: string, body: Buffer) { await fs.writeFile(this.pathFor(key), body); }
  async downloadUrl(key: string) { return `/api/v1/files/content/${encodeURIComponent(key)}`; }
  async delete(key: string) { await fs.rm(this.pathFor(key), { force: true }); }
  localPath(key: string) { return this.pathFor(key); }
}

class S3StorageAdapter implements StorageAdapter {
  private readonly bucket = process.env.S3_BUCKET ?? "nivasafe";
  private readonly client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? "us-east-1",
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? "nivasafe",
      secretAccessKey: process.env.S3_SECRET_KEY ?? "nivasafe-secret",
    },
  });
  async put(key: string, body: Buffer, mimeType: string) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: mimeType }));
  }
  async downloadUrl(key: string) {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: 300 });
  }
  async delete(key: string) { await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key })); }
}

const configuredLocalRoot = process.env.LOCAL_UPLOAD_DIR?.trim();
const localRoot = configuredLocalRoot
  ? (isAbsolute(configuredLocalRoot) ? configuredLocalRoot : resolve(process.cwd(), configuredLocalRoot))
  : join(process.cwd(), "uploads");

export const storage: StorageAdapter = process.env.S3_ENDPOINT
  ? new S3StorageAdapter()
  : new LocalStorageAdapter(localRoot);

export function openLocalObject(key: string) {
  if (!storage.localPath) return null;
  return createReadStream(storage.localPath(key));
}
