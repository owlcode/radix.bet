import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export interface ActivityDetail {
  id: string;
  type: string;
  betName: string;
  betDescription: string | null;
  componentAddress: string | null;
  transactionId: string | null;
  stateVersion: number | null;
  timestamp: string;
  status: string;
  currencySymbol: string;
  details: string;
  parsedDetails: {
    optionName?: string;
    amount?: string;
    voter?: string;
  };
}

export const load: PageLoad = async ({ params, fetch }) => {
  const res = await fetch(`/api/activity/${params.id}`);
  if (res.status === 404) {
    throw error(404, 'Transaction not found');
  }
  if (!res.ok) {
    throw error(500, 'Failed to load transaction');
  }
  const activity: ActivityDetail = await res.json();
  return { activity };
};
