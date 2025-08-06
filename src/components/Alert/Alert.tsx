import React from 'react';
import { AlertStyles } from '@components/Alert/Alert.styles';

interface AlertProps {
  role: 'status' | 'alert';
  type?: 'success' | 'error' | 'warning' | 'info';
  children: React.ReactNode;
}

const Alert: React.FC<AlertProps> = ({ role, type = 'info', children }) => {
  return (
    <AlertStyles
      role={role}
      type={type}
      aria-live={role === 'alert' ? 'assertive' : 'polite'}
      className={`alert-${type}`}
    >
      {children}
    </AlertStyles>
  );
};

export default Alert;
