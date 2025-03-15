// File: src/components/Icon/Icon.test.tsx
import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import Icon, { IconName } from './Icon';

// Extend Jest's expect with jest-axe matchers
expect.extend(toHaveNoViolations);

describe('Icon Component', () => {
  const iconNames: IconName[] = [
    'vercel',
    'file',
    'window',
    'globe',
    'education',
  ];

  it('renders each icon and sets the title correctly', () => {
    iconNames.forEach((name) => {
      const { container } = render(<Icon name={name} />);
      const titleElement = container.querySelector('title');
      expect(titleElement).toBeTruthy();
      // The title text should contain the icon name (case-insensitive)
      expect(titleElement?.textContent?.toLowerCase()).toContain(name);
    });
  });

  it('applies the given width, height, and color props', () => {
    const testProps = {
      name: 'file' as IconName,
      width: 32,
      height: 32,
      color: 'red',
    };
    const { container } = render(<Icon {...testProps} />);
    const svgElement = container.querySelector('svg');
    expect(svgElement).toHaveAttribute('width', testProps.width.toString());
    expect(svgElement).toHaveAttribute('height', testProps.height.toString());
    // Check that the inline style contains the color property
    expect(svgElement?.getAttribute('style')).toContain('color: red');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Icon name="file" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
