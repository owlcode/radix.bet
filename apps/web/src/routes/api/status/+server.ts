import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';

export const GET = async (req: RequestEvent) => {
  req.cookies.getAll();
  return json({
    ok: true,
    radixPackageAddress: process.env.RADIX_PACKAGE_ADDRESS || null
  });
};
