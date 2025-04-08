// tokens/theme.ts
export type Theme = 'default' | 'clientA' | 'clientB';

const themeMap: Record<Theme, string> = {
  default: 'theme-default',
  clientA: 'theme-client-a',
  clientB: 'theme-client-b'
};

export function getThemeClass(theme: Theme): string {
  return themeMap[theme] || themeMap.default;
}
