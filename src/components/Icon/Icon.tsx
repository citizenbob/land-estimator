'use client';

import React from 'react';

export type IconName = 'vercel' | 'file' | 'window' | 'globe' | 'education';

const createIcon = (
  viewBox: string,
  title: string,
  children: React.ReactNode
): React.ReactElement => (
  <svg viewBox={viewBox} xmlns="http://www.w3.org/2000/svg">
    <title>{title}</title>
    {children}
  </svg>
);

const icons: Record<IconName, React.ReactElement> = {
  vercel: createIcon(
    '0 0 1155 1000',
    'Vercel Icon',
    <path d="m577.3 0 577.4 1000H0z" fill="currentColor" />
  ),
  file: createIcon(
    '0 0 16 16',
    'File Icon',
    <path
      d="M14.5 13.5V5.41a1 1 0 0 0-.3-.7L9.8.29A1 1 0 0 0 9.08 0H1.5v13.5A2.5 2.5 0 0 0 4 16h8a2.5 2.5 0 0 0 2.5-2.5m-1.5 0v-7H8v-5H3v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1M9.5 5V2.12L12.38 5zM5.13 5h-.62v1.25h2.12V5zm-.62 3h7.12v1.25H4.5zm.62 3h-.62v1.25h7.12V11z"
      clipRule="evenodd"
      fill="currentColor"
      fillRule="evenodd"
    />
  ),
  window: createIcon(
    '0 0 16 16',
    'Window Icon',
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M1.5 2.5h13v10a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1zM0 1h16v11.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 0 12.5zm3.75 4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5M7 4.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0m1.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5"
      fill="currentColor"
    />
  ),
  globe: createIcon(
    '0 0 16 16',
    'Globe Icon',
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m2.94-4.76q1.66-.15 2.95-.43a7 7 0 0 0 0-2.58q-1.3-.27-2.95-.43a18 18 0 0 1 0 3.44M4.58 6.28q-1.66.16-2.95.43a7 7 0 0 0 0 2.58q1.3.27 2.95.43a18 18 0 0 1 0-3.44"
      fill="currentColor"
    />
  ),
  education: createIcon(
    '0 0 102.7 85.9',
    'Education Icon',
    <path
      fill="currentColor"
      d="M4.6 76.1c-.3-.2-.5-.5-.5-.8-.4-2.5-.4-5.1 0-7.6.9-6.1 3.7-27 6.1-32.7.2-.4 0-.3 0-.3s-1-.3-1.7-.6-.1 0-1.1-.4L1 31.4c-.8-.3-1.2-1.2-.9-2 .2-.4.5-.8.9-.9L50.8 8.7c.4-.1.8-.1 1.1 0l49.8 19.9c.8.3 1.2 1.2.9 2-.2.4-.5.8-1 .9C90.1 35.3 58 46 52.1 47.8c-.5.1-31-9.2-34.6-10.3-.3 0-1-.4-2.5-1.1-3.1 9.2-.2 33.8-1.4 37.1-.1.3-.1.6 0 .9.3 1.3 0 1.7-.6 2-2.6 1.3-5.8 1.2-8.3-.2ZM15 36.3Z"
    />
  )
};

interface IconProps {
  name: IconName;
  width?: number | string;
  height?: number | string;
  className?: string;
  color?: string;
}

const Icon: React.FC<IconProps> = ({
  name,
  width = 16,
  height = 16,
  className,
  color
}) => {
  const svg = icons[name];
  return React.cloneElement(
    svg as React.ReactElement<React.SVGProps<SVGSVGElement>>,
    {
      width: width.toString(),
      height: height.toString(),
      className,
      style: { color }
    }
  );
};

export default Icon;
