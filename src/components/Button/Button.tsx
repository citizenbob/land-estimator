import React from 'react';
import { ButtonStyles } from '@components/Button/Button.styles';
import withLogging from '@hocs/withLogging';

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  children,
  ...props
}) => {
  return <ButtonStyles {...props}>{children}</ButtonStyles>;
};

const LoggedButton = withLogging(Button, 'Button Clicked');
export default LoggedButton;
