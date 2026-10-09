export interface Theme {
  id: string;
  label: string;
  swatchBg: string;
  swatchDot: string;
}

// Theme registry for the desktop and mobile Vue controls.
export const THEMES: readonly Theme[] = [
  { id: 'light',   label: 'Organic Day',   swatchBg: '#ebddc5', swatchDot: '#c67139' },
  { id: 'dark',    label: 'Organic Night', swatchBg: '#2d2921', swatchDot: '#e58f52' },
  { id: 'dracula', label: 'Dracula',       swatchBg: '#282a36', swatchDot: '#bd93f9' },
  { id: 'alucard', label: 'Alucard',       swatchBg: '#fffbeb', swatchDot: '#644ac9' },
];
