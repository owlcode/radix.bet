import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ cookies, locals }) => {
  return json(
    { success: true },
    {
      status: 200,
      headers: locals.oAuth2.clearSessionCookie(cookies)
    }
  );
};
