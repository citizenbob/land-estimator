import styled from 'styled-components';
import tokens from '@tokens/tokens.json';

interface AlertStylesProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  role?: 'status' | 'alert';
}

const semanticKeys = ['success', 'error', 'warning', 'info'] as const;
type SemanticType = (typeof semanticKeys)[number];

const getAlertBgColorFromTokens = (
  type: string | undefined,
  mode: 'light' | 'dark'
) => {
  const t = (
    semanticKeys.includes(type as SemanticType) ? type : 'info'
  ) as SemanticType;
  return (tokens.colors[mode] as Record<SemanticType, { value: string }>)[t]
    .value;
};

export const AlertStyles = styled.div<AlertStylesProps>`
  padding: 0.75rem 1rem;
  border-radius: ${tokens.borderRadius.default.value};
  background-color: ${({ type }) => getAlertBgColorFromTokens(type, 'light')};
  color: ${tokens.colors.light.reverseText.value};
  @media (prefers-color-scheme: dark) {
    background-color: ${({ type }) => getAlertBgColorFromTokens(type, 'dark')};
    color: ${tokens.colors.dark.reverseText.value};
  }
`;
