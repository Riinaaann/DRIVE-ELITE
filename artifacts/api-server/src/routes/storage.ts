import { Router, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { RequestUploadUrlBody, RequestUploadUrlResponse } from "@workspace/api-zod";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { tokenStore } from "./auth";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";

const router = Router();
const objectStorage = new ObjectStorageService();
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

type AccessResult =
  | { ok: true; user: typeof usersTable.$inferSelect }
  | { ok: false; status: 401 | 403; error: string };

async function getAdminOrStaff(req: Request): Promise<AccessResult> {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Not authenticated" };
  }

  const userId = tokenStore.get(authorization.slice(7));
  if (!userId) {
    return { ok: false, status: 401, error: "Invalid or expired token" };
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user || (user.role !== "admin" && user.role !== "staff")) {
    return { ok: false, status: 403, error: "Admin access required" };
  }

  return { ok: true, user };
}

router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  const access = await getAdminOrStaff(req);
  if (!access.ok) {
    return res.status(access.status).json({ error: access.error });
  }

  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Missing or invalid upload details" });
  }

  const { name, size, contentType } = parsed.data;
  if (!contentType.startsWith("image/")) {
    return res.status(400).json({ error: "Only image files are allowed" });
  }
  if (size > MAX_IMAGE_SIZE) {
    return res.status(400).json({ error: "Image must be 10 MB or smaller" });
  }

  if (process.env.PRIVATE_OBJECT_DIR) {
    try {
      const uploadURL = await objectStorage.getObjectEntityUploadURL(contentType);
      const objectPath = objectStorage.normalizeObjectEntityPath(uploadURL);

      return res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, "Failed to generate vehicle image upload URL via objectStorage");
    }
  }

  // Local filesystem fallback
  const extension = contentType.split("/")[1]?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "img";
  const fileId = `${crypto.randomUUID()}.${extension}`;
  const host = req.get("host") || "localhost:3000";
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const uploadURL = `${protocol}://${host}/api/storage/local-upload/${fileId}`;
  const objectPath = `/objects/${fileId}`;

  return res.json(
    RequestUploadUrlResponse.parse({
      uploadURL,
      objectPath,
      metadata: { name, size, contentType },
    }),
  );
});

router.put("/storage/local-upload/:fileId", (req: Request, res: Response) => {
  const rawFileId = req.params.fileId;
  const fileId = path.basename(Array.isArray(rawFileId) ? rawFileId[0] : rawFileId);
  const filePath = path.join(UPLOADS_DIR, fileId);
  const writeStream = fs.createWriteStream(filePath);

  req.pipe(writeStream);

  writeStream.on("finish", () => {
    return res.status(200).json({ success: true });
  });

  writeStream.on("error", (err) => {
    req.log.error({ err }, "Failed to write local uploaded file");
    return res.status(500).json({ error: "Failed to save uploaded file" });
  });
});

router.get("/storage/objects/*objectPath", async (req: Request, res: Response) => {
  try {
    const rawPath = req.params.objectPath;
    const objectPathStr = Array.isArray(rawPath) ? rawPath.join("/") : rawPath;
    const fileName = path.basename(objectPathStr);
    const localFilePath = path.join(UPLOADS_DIR, fileName);

    if (fs.existsSync(localFilePath)) {
      const stats = fs.statSync(localFilePath);
      const contentType = inferImageContentType(fileName);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("Content-Length", String(stats.size));
      fs.createReadStream(localFilePath).pipe(res);
      return;
    }

    const objectPath = `/objects/${objectPathStr}`;
    const file = await objectStorage.getObjectEntityFile(objectPath);
    const [metadata] = await file.getMetadata();
    const contentType = metadata.contentType || inferImageContentType(file.name);

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    if (metadata.size) {
      res.setHeader("Content-Length", String(metadata.size));
    }

    file.createReadStream().on("error", (error) => {
      req.log.error({ err: error }, "Failed to stream vehicle image");
      if (!res.headersSent) res.status(500);
      res.end();
    }).pipe(res);
    return;
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      return res.status(404).json({ error: "Image not found" });
    }

    req.log.error({ err: error }, "Failed to serve vehicle image");
    return res.status(500).json({ error: "Failed to serve image" });
  }
});

function inferImageContentType(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  if (extension === "svg") return "image/svg+xml";
  return "image/jpeg";
}

export default router;