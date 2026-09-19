import { writable } from 'svelte/store';

export type Theme = {
  colors: string[];
};

const themes: Record<string, Theme> = {
  darkGreen: {
    colors: ['#240750', '#344C64', '#577B8D', '#57A6A1']
  },
  default: {
    colors: ['green', 'blue', 'red', '#052cc0', '#40c057']
  }
};

export const theme = writable<Theme>(themes.default);
