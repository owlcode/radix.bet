import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = 'static/uploads';

// Base URL for generating absolute URLs (required for Scrypto UncheckedUrl)
const BASE_URL = process.env.PUBLIC_URL || 'https://radix.bet';

export interface StorageResult {
  url: string;
  filename: string;
}

export async function uploadFile(
  file: File,
  subfolder: string = 'options'
): Promise<StorageResult> {
  // Ensure upload directory exists
  const uploadPath = path.join(UPLOAD_DIR, subfolder);
  if (!existsSync(uploadPath)) {
    await mkdir(uploadPath, { recursive: true });
  }

  // Generate unique filename
  const ext = path.extname(file.name) || '.png';
  const hash = crypto.randomBytes(8).toString('hex');
  const filename = `${hash}${ext}`;
  const filepath = path.join(uploadPath, filename);

  // Get file buffer
  const buffer = Buffer.from(await file.arrayBuffer());

  // Write file (cast to Uint8Array for Node.js >=22 compatibility)
  await writeFile(filepath, new Uint8Array(buffer));

  // Return absolute public URL (required for Scrypto UncheckedUrl validation)
  return {
    url: `${BASE_URL}/uploads/${subfolder}/${filename}`,
    filename
  };
}

export async function validateFile(file: File): Promise<{ valid: boolean; error?: string }> {
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (file.size > maxSize) {
    return { valid: false, error: 'File too large. Maximum size is 5MB.' };
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP' };
  }

  return { valid: true };
}
