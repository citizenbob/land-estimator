export type ThemeType = 'default' | 'dark' | 'light';

export function getThemeClass(theme: ThemeType): string {
  const themeMap: Record<ThemeType, string> = {
    default: 'theme-default',
    dark: 'theme-dark',
    light: 'theme-light'
  };

  return themeMap[theme] || themeMap.default;
}
