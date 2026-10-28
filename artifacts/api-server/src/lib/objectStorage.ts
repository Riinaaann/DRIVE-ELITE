import { randomUUID } from "node:crypto";
import { File, Storage } from "@google-cloud/storage";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
  }
}

export class ObjectStorageService {
  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR;
    if (!dir) {
      throw new Error("PRIVATE_OBJECT_DIR is not configured");
    }
    return dir;
  }

  async getObjectEntityUploadURL(contentType: string): Promise<string> {
    const extension = contentType.split("/")[1]?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "img";
    const fullPath = `${this.getPrivateObjectDir()}/uploads/${randomUUID()}.${extension}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);

    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
  }

  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const entityId = objectPath.slice("/objects/".length);
    const fullPath = `${this.getPrivateObjectDir()}/${entityId}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    const file = objectStorageClient.bucket(bucketName).file(objectName);
    const [exists] = await file.exists();

    if (!exists) {
      throw new ObjectNotFoundError();
    }

    return file;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }

    const url = new URL(rawPath);
    const objectDir = this.getPrivateObjectDir().replace(/^\/+/, "").replace(/\/+$/, "");
    const rawObjectPath = url.pathname.replace(/^\/+/, "");
    const markerIndex = rawObjectPath.indexOf(`${objectDir}/`);

    if (markerIndex === -1) {
      return url.pathname;
    }

    return `/objects/${rawObjectPath.slice(markerIndex + objectDir.length + 1)}`;
  }
}

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const parts = normalized.split("/");
  if (parts.length < 3 || !parts[1] || !parts.slice(2).join("/")) {
    throw new Error("Invalid object storage path");
  }

  return {
    bucketName: parts[1],
    objectName: parts.slice(2).join("/"),
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const response = await fetch(`${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucketName,
      object_name: objectName,
      method,
      expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to sign object URL (${response.status})`);
  }

  const body = (await response.json()) as { signed_url?: string };
  if (!body.signed_url) {
    throw new Error("Object storage did not return an upload URL");
  }

  return body.signed_url;
}