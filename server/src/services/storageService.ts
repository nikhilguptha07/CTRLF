import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface StorageFile {
  originalName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
}

export interface StoredFileMetadata {
  id: string;
  storagePath: string;
  originalName: string;
  mimeType: string;
  size: number;
  sha256: string;
}

export interface IStorageProvider {
  save(file: StorageFile, subfolderOverride?: string): Promise<StoredFileMetadata>;
  read(storagePath: string): Promise<Buffer>;
  delete(storagePath: string): Promise<void>;
  exists(storagePath: string): Promise<boolean>;
  getSha256(storagePath: string): Promise<string>;
}

export class LocalDiskStorageProvider implements IStorageProvider {
  private baseDir: string;

  constructor(baseDir = env.UPLOAD_DIR) {
    this.baseDir = path.resolve(baseDir);
    this.ensureDirectory(this.baseDir);
    this.ensureDirectory(path.join(this.baseDir, 'original'));
    this.ensureDirectory(path.join(this.baseDir, 'evidence'));
    this.ensureDirectory(path.join(this.baseDir, 'temp'));
    // Legacy directory compatibility
    this.ensureDirectory(path.join(this.baseDir, 'videos'));
    this.ensureDirectory(path.join(this.baseDir, 'frames'));
  }

  private ensureDirectory(dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private sanitizeExtension(originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const safeExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.jpg', '.jpeg', '.png'];
    return safeExtensions.includes(ext) ? ext : '.bin';
  }

  async save(file: StorageFile, subfolderOverride?: string): Promise<StoredFileMetadata> {
    const id = uuidv4();
    const safeExt = this.sanitizeExtension(file.originalName);
    const subfolder = subfolderOverride || (file.mimeType.startsWith('video/') ? 'original' : 'evidence');
    const safeFilename = `${id}${safeExt}`;
    const destinationPath = path.join(this.baseDir, subfolder, safeFilename);

    // Compute cryptographic SHA-256 checksum for data integrity
    const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');

    await fs.promises.writeFile(destinationPath, file.buffer);

    logger.info('File saved securely to local storage', {
      fileId: id,
      size: file.size,
      mimeType: file.mimeType,
      subfolder,
      sha256: hash,
    });

    return {
      id,
      storagePath: path.relative(process.cwd(), destinationPath).replace(/\\/g, '/'),
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      sha256: hash,
    };
  }

  async read(storagePath: string): Promise<Buffer> {
    const fullPath = path.resolve(storagePath);
    if (!fullPath.startsWith(this.baseDir) && !fullPath.startsWith(path.resolve(env.UPLOAD_DIR))) {
      throw new Error('Path traversal detected');
    }
    return fs.promises.readFile(fullPath);
  }

  async delete(storagePath: string): Promise<void> {
    const fullPath = path.resolve(storagePath);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  }

  async exists(storagePath: string): Promise<boolean> {
    const fullPath = path.resolve(storagePath);
    return fs.existsSync(fullPath);
  }

  async getSha256(storagePath: string): Promise<string> {
    const buffer = await this.read(storagePath);
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}

export const storageService = new LocalDiskStorageProvider();
