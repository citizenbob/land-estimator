'use client';

import React from 'react';

export type IconName =
  | 'vercel'
  | 'file'
  | 'window'
  | 'globe'
  | 'education'
  | 'leaf'
  | 'github'
  | 'lock';

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
  leaf: createIcon(
    '0 0 24 24',
    'Leaf Icon',
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M20.994 6s.356 5.669-4.33 9.537c-4.258 3.563-9.805 2.8-12.25.613.394-.343.788-.69 1.182-1.033 1.142-.996 2.522-2.146 7.955-4.522-4.845.727-8.114 2.988-8.781 3.526-.395.347-.827.69-1.221 1.036-1.577-2.836.034-8.965 7.598-8.427 7.875.572 9.847-.73 9.847-.73Z"
      clipRule="evenodd"
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
  github: createIcon(
    '0 0 16 16',
    'GitHub Icon',
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
      fill="currentColor"
    />
  ),
  lock: createIcon(
    '0 0 16 16',
    'Lock Icon',
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M4 7V5a4 4 0 1 1 8 0v2h.5A1.5 1.5 0 0 1 14 8.5v5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5v-5A1.5 1.5 0 0 1 3.5 7H4ZM3 13.5a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5v5Zm7-6.5H6V5a2 2 0 1 1 4 0v2Z"
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
