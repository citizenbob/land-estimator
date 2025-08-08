import styled, { keyframes, css } from 'styled-components';
import tokens from '@tokens/tokens.json';
import { getToken } from '@tokens/tokenUtils';

const dropIn = keyframes`
  0% {
    transform: translateY(-100px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
`;

export const IsoPreviewContainer = styled.div`
  position: sticky;
  top: ${({ theme }) =>
    getToken(theme, 'spacing.xl.value', tokens.spacing.xl.value)};
  width: 100%;
  margin: 0 auto;
  z-index: 10;

  @media (min-width: 1024px) {
    max-width: 400px;
  }

  @media (min-width: 768px) and (max-width: 1023px) {
    max-width: 500px;
  }

  @media (max-width: 767px) {
    position: static;
    max-width: 80%;
    margin-bottom: 0;
  }
`;

export const SvgCanvas = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: ${({ theme }) =>
    getToken(
      theme,
      'borderRadius.default.value',
      tokens.borderRadius.default.value
    )};
  overflow: hidden;

  @media (prefers-color-scheme: dark) {
    background: linear-gradient(
      135deg,
      ${({ theme }) =>
          getToken(
            theme,
            'colors.dark.background.value',
            tokens.colors.dark.background.value
          )}
        0%,
      ${({ theme }) =>
          getToken(
            theme,
            'colors.dark.gray800.value',
            tokens.colors.dark.gray800.value
          )}
        100%
    );
  }
`;

export const SvgLayerContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`;

export const SvgLayer = styled.img<{
  $isVisible: boolean;
  $animationDelay?: number;
  $animationDuration?: number;
  $zIndex?: number;
}>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  opacity: ${({ $isVisible }) => ($isVisible ? 1 : 0)};
  z-index: ${({ $zIndex }) => $zIndex || 1};
  transition: opacity 0.3s ease-in-out;

  ${({ $isVisible, $animationDelay = 0, $animationDuration = 600 }) =>
    $isVisible &&
    css`
      animation: ${dropIn} ${$animationDuration}ms ease-out ${$animationDelay}ms
        both;
    `}

  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  -ms-interpolation-mode: nearest-neighbor;
`;
