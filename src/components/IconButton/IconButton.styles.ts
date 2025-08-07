import styled from 'styled-components';
import {
  responsiveTextColor,
  responsiveBackgroundColor
} from '@lib/styledUtils';

export const IconButtonStyles = styled.button.attrs(() => ({
  className:
    'absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-800 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center'
}))`
  ${responsiveBackgroundColor}
  ${responsiveTextColor}
  
  &:focus {
    outline: 2px solid #00a897;
    outline-offset: 2px;
  }
`;
