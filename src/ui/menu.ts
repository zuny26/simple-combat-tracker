import type { Theme } from '../../js/themes.js';

export interface MenuItem {
  id: string;
  label: string;
  theme?: Theme;
  checked?: boolean;
  danger?: boolean;
}
