import type { Theme } from './themes';

export interface MenuItem {
  id: string;
  label: string;
  theme?: Theme;
  checked?: boolean;
  danger?: boolean;
}
