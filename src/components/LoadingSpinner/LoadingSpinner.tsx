import React from 'react';
import { SpinnerWrapper } from '@components/LoadingSpinner/LoadingSpinner.styles';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'gray';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  className,
  size = 'sm',
  color = 'primary'
}) => {
  const defaultClasses = 'absolute right-3 top-1/2 transform -translate-y-1/2';

  return (
    <SpinnerWrapper
      role="status"
      aria-label="Loading"
      className={className || defaultClasses}
      size={size}
      color={color}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 1,
        scale: 1,
        rotate: 360
      }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 },
        rotate: { repeat: Infinity, ease: 'linear', duration: 0.8 }
      }}
    />
  );
};
