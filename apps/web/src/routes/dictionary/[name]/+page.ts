import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
  const name = params.name;

  return {
    name
  };
};
