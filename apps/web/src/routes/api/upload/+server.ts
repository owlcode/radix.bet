import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { uploadFile, validateFile } from '$lib/server/storage';

export const POST: RequestHandler = async ({ request, locals }) => {
  // Check authentication
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    throw error(400, 'No file provided');
  }

  // Validate file
  const validation = await validateFile(file);
  if (!validation.valid) {
    throw error(400, validation.error);
  }

  try {
    const result = await uploadFile(file, `options/${locals.user.identityAddress.slice(-8)}`);
    return json(result);
  } catch (err) {
    console.error('Upload error:', err);
    throw error(500, 'Failed to upload file');
  }
};
