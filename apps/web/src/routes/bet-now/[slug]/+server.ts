import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  // Redirect to the unified slug-based bet view
  throw redirect(301, `/bet/${params.slug}`);
};
