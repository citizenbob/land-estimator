import React from 'react';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, it, expect } from 'vitest';
import Icon, { IconName } from './Icon';

describe('Icon Component', () => {
  const iconNames: IconName[] = [
    'vercel',
    'file',
    'window',
    'globe',
    'education'
  ];

  it('renders each icon with a title containing its name', () => {
    iconNames.forEach((name) => {
      const { container } = render(<Icon name={name} />);
      const title = container.querySelector('title');
      expect(title).toBeTruthy();
      expect(title?.textContent?.toLowerCase()).toContain(name);
    });
  });

  it('applies width, height, and color props', () => {
    const props = {
      name: 'file' as IconName,
      width: 32,
      height: 32,
      color: 'red'
    };
    const { container } = render(<Icon {...props} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('32');
    expect(svg?.getAttribute('height')).toBe('32');
    expect(svg?.getAttribute('style')).toContain('color: red');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Icon name="file" />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
