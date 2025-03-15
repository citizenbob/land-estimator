'use client';

import React from 'react';

export type IconName = 'vercel' | 'file' | 'window' | 'globe' | 'education';

const createIcon = (
  viewBox: string,
  title: string,
  children: React.ReactNode,
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
    <path d="m577.3 0 577.4 1000H0z" fill="currentColor" />,
  ),
  file: createIcon(
    '0 0 16 16',
    'File Icon',
    <path
      d="M14.5 13.5V5.41a1 1 0 0 0-.3-.7L9.8.29A1 1 0 0 0 9.08 0H1.5v13.5A2.5 2.5 0 0 0 4 16h8a2.5 2.5 0 0 0 2.5-2.5m-1.5 0v-7H8v-5H3v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1M9.5 5V2.12L12.38 5zM5.13 5h-.62v1.25h2.12V5zm-.62 3h7.12v1.25H4.5zm.62 3h-.62v1.25h7.12V11z"
      clipRule="evenodd"
      fill="currentColor"
      fillRule="evenodd"
    />,
  ),
  window: createIcon(
    '0 0 16 16',
    'Window Icon',
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M1.5 2.5h13v10a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1zM0 1h16v11.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 0 12.5zm3.75 4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5M7 4.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0m1.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5"
      fill="currentColor"
    />,
  ),
  education: createIcon(
    '0 0 102.726 85.8525',
    'Education Icon',
    <path
      d="M4.533,67.547a1.072,1.072,0,0,1-.5-.772,26.2,26.2,0,0,1,0-7.585c.94-6.061,3.7-27.043,6.116-32.664.165-.38.077-.279.077-.279s-1.006-.344-1.708-.59-.107-.027-1.1-.4l-6.4-2.306a1.559,1.559,0,0,1,0-2.919L50.783.1a1.616,1.616,0,0,1,1.142,0L101.742,19.95a1.558,1.558,0,0,1-.085,2.928C90.17,26.719,58.042,37.339,52.107,39.141c-.459.14-30.954-9.172-34.637-10.341-.278-.086-1-.4-2.53-1.073-3.106,9.237-.192,33.791-1.4,37.106a1.555,1.555,0,0,0-.064.911c.3,1.309.075,1.684-.6,2a8.929,8.929,0,0,1-8.347-.193ZM14.947,27.706l0-.01Zm.007-.024h0Zm.008-.026,0-.006Zm.008-.026,0-.005Zm0-.009v0Zm0-.01.005-.017Zm.007-.022v0Zm0,0h0Zm0,0h0Zm0,0h0ZM45.6,61.6a48.41,48.41,0,0,1-14.8-3.368,17.932,17.932,0,0,1-7.29-4.988,6.8,6.8,0,0,1-1.622-4.367v-14.5a3.723,3.723,0,0,1,0-.439l3.469,1.073q12.712,3.9,25.414,7.82a2.125,2.125,0,0,0,1.142,0L71.78,36.716l8.368-2.585a6.6,6.6,0,0,1,.769-.161V48.528c0,3-1.526,5.084-3.747,6.769-3.672,2.789-7.942,4.162-12.361,5.149a63.325,63.325,0,0,1-13.373,1.428Q48.514,61.874,45.6,61.6Z"
      fill="currentColor"
    />,
  ),
  globe: createIcon(
    '0 0 16 16',
    'Globe Icon',
    <>
      <g clipPath="url(#a)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10.27 14.1a6.5 6.5 0 0 0 3.67-3.45q-1.24.21-2.7.34-.31 1.83-.97 3.1M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.48-1.52a7 7 0 0 1-.96 0H7.5a4 4 0 0 1-.84-1.32q-.38-.89-.63-2.08a40 40 0 0 0 3.92 0q-.25 1.2-.63 2.08a4 4 0 0 1-.84 1.31zm2.94-4.76q1.66-.15 2.95-.43a7 7 0 0 0 0-2.58q-1.3-.27-2.95-.43a18 18 0 0 1 0 3.44m-1.27-3.54a17 17 0 0 1 0 3.64 39 39 0 0 1-4.3 0 17 17 0 0 1 0-3.64 39 39 0 0 1 4.3 0m1.1-1.17q1.45.13 2.69.34a6.5 6.5 0 0 0-3.67-3.44q.65 1.26.98 3.1M8.48 1.5l.01.02q.41.37.84 1.31.38.89.63 2.08a40 40 0 0 0-3.92 0q.25-1.2.63-2.08a4 4 0 0 1 .85-1.32 7 7 0 0 1 .96 0m-2.75.4a6.5 6.5 0 0 0-3.67 3.44 29 29 0 0 1 2.7-.34q.31-1.83.97-3.1M4.58 6.28q-1.66.16-2.95.43a7 7 0 0 0 0 2.58q1.3.27 2.95.43a18 18 0 0 1 0-3.44m.17 4.71q-1.45-.12-2.69-.34a6.5 6.5 0 0 0 3.67 3.44q-.65-1.27-.98-3.1"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="a">
          <path fill="#fff" d="M0 0h16v16H0z" />
        </clipPath>
      </defs>
    </>,
  ),
};

interface IconProps {
  name: IconName;
  width?: number;
  height?: number;
  className?: string;
  color?: string;
}

const Icon: React.FC<IconProps> = ({
  name,
  width = 16,
  height = 16,
  className,
  color,
}) => {
  const svg = icons[name];
  return React.cloneElement(svg, {
    width,
    height,
    className,
    style: { color },
  });
};

export default Icon;
