import React from 'react';
import { logEvent } from '@services/logger';

const withLogging = <P extends object>(
  Component: React.ComponentType<P>,
  eventName: string
) => {
  interface WithLoggingProps extends React.HTMLAttributes<HTMLElement> {
    onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  }

  const WrappedComponent = (props: P & WithLoggingProps) => (
    <Component
      {...props}
      onClick={(e: React.MouseEvent<HTMLElement>) => {
        logEvent({
          eventName,
          data: { timestamp: Date.now() },
          toMixpanel: true,
          toFirestore: true
        });
        if (props.onClick) props.onClick(e);
      }}
    />
  );

  WrappedComponent.displayName = `WithLogging(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
};

export default withLogging;
