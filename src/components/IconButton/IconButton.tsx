import React from 'react';
import { IconButtonStyles } from '@components/IconButton/IconButton.styles';

const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  children,
  ...props
}) => {
  return <IconButtonStyles {...props}>{children}</IconButtonStyles>;
};

export default IconButton;
