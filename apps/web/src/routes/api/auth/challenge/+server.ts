import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals }) => {
  const challenge = await locals.authModel.createChallenge();

  return json(challenge.isOk() && challenge.value);
};
