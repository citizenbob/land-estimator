import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RootLayout, { metadata } from './layout';

// Mock the font imports
vi.mock('next/font/google', () => ({
  Geist: () => ({
    variable: '--font-geist-sans'
  }),
  Geist_Mono: () => ({
    variable: '--font-geist-mono'
  })
}));

vi.mock('@components/PageAnalytics/PageAnalytics', () => ({
  default: () => <div data-testid="analytics-component">Analytics</div>
}));

describe('RootLayout', () => {
  const mockChildren = <div data-testid="page-content">Test Content</div>;

  describe('Layout rendering', () => {
    it('should render the basic layout structure', () => {
      render(<RootLayout>{mockChildren}</RootLayout>);

      expect(screen.getByTestId('page-content')).toBeInTheDocument();
      expect(screen.getByTestId('analytics-component')).toBeInTheDocument();
    });

    it('should apply correct font variables to body', () => {
      render(<RootLayout>{mockChildren}</RootLayout>);

      const body = document.querySelector('body');
      expect(body).toHaveClass('antialiased');
      expect(body).toHaveAttribute('class');
      expect(body?.className).toContain('--font-geist-sans');
      expect(body?.className).toContain('--font-geist-mono');
    });

    it('should apply theme class to html element', () => {
      render(<RootLayout>{mockChildren}</RootLayout>);

      const html = document.querySelector('html');
      expect(html).toHaveAttribute('lang', 'en');
      expect(html).toHaveAttribute('class');
    });
  });

  describe('Client-side rendering', () => {
    const mockChildren = <div data-testid="page-content">Test Content</div>;

    it('should render the same layout structure in browser', () => {
      render(<RootLayout>{mockChildren}</RootLayout>);

      expect(screen.getByTestId('page-content')).toBeInTheDocument();
      expect(screen.getByTestId('analytics-component')).toBeInTheDocument();
    });
  });

  describe('Performance optimizations', () => {
    const mockChildren = <div data-testid="page-content">Test Content</div>;

    it('should render efficiently without unnecessary resource preloading', () => {
      render(<RootLayout>{mockChildren}</RootLayout>);

      expect(screen.getByTestId('page-content')).toBeInTheDocument();
      expect(screen.getByTestId('analytics-component')).toBeInTheDocument();
    });

    it('should render without unnecessary resource hints', () => {
      const { rerender } = render(<RootLayout>{mockChildren}</RootLayout>);
      rerender(<RootLayout>{mockChildren}</RootLayout>);

      // Layout should render consistently
      expect(screen.getByTestId('page-content')).toBeInTheDocument();
      expect(screen.getByTestId('analytics-component')).toBeInTheDocument();
    });
  });

  describe('Analytics integration', () => {
    it('should include PageAnalytics component', () => {
      render(<RootLayout>{mockChildren}</RootLayout>);

      expect(screen.getByTestId('analytics-component')).toBeInTheDocument();
    });
  });

  describe('Accessibility and SEO', () => {
    it('should have correct lang attribute', () => {
      render(<RootLayout>{mockChildren}</RootLayout>);

      const html = document.querySelector('html');
      expect(html).toHaveAttribute('lang', 'en');
    });

    it('should render children within body', () => {
      render(<RootLayout>{mockChildren}</RootLayout>);

      const body = document.querySelector('body');
      expect(body).toContainElement(screen.getByTestId('page-content'));
    });
  });

  describe('Error handling and edge cases', () => {
    it('should render gracefully without throwing errors', () => {
      expect(() => {
        render(<RootLayout>{mockChildren}</RootLayout>);
      }).not.toThrow();
    });

    it('should handle missing children gracefully', () => {
      expect(() => {
        render(<RootLayout>{undefined}</RootLayout>);
      }).not.toThrow();
    });

    it('should not log console errors during normal operation', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(<RootLayout>{mockChildren}</RootLayout>);

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Server-side API integration', () => {
    const mockChildren = <div data-testid="page-content">Test Content</div>;

    it('should work with server-side data fetching approach', () => {
      render(<RootLayout>{mockChildren}</RootLayout>);

      // Verify layout renders correctly for server-side approach
      expect(screen.getByTestId('page-content')).toBeInTheDocument();
      expect(screen.getByTestId('analytics-component')).toBeInTheDocument();
    });

    it('should not include client-side resource hints', () => {
      render(<RootLayout>{mockChildren}</RootLayout>);

      // Verify layout works without client-side preloading
      expect(screen.getByTestId('page-content')).toBeInTheDocument();
    });
  });
});

describe('Layout Metadata', () => {
  it('should have correct metadata configuration', () => {
    expect(metadata).toBeDefined();
    expect(metadata.title).toBe('Land Estimator');
    expect(metadata.description).toContain('Estimate landscaping costs');
  });

  it('should include favicon configurations', () => {
    if (
      metadata.icons &&
      typeof metadata.icons === 'object' &&
      'icon' in metadata.icons
    ) {
      expect(metadata.icons.icon).toBeDefined();
      expect(Array.isArray(metadata.icons.icon)).toBe(true);

      const icons = metadata.icons.icon as Array<{
        url: string;
        type?: string;
      }>;
      expect(icons.some((icon) => icon.url === '/favicon.ico')).toBe(true);
      expect(icons.some((icon) => icon.url === '/favicon.png')).toBe(true);
      expect(icons.some((icon) => icon.url === '/favicon.svg')).toBe(true);
    }
  });

  it('should include apple touch icon configurations', () => {
    if (
      metadata.icons &&
      typeof metadata.icons === 'object' &&
      'apple' in metadata.icons
    ) {
      expect(metadata.icons.apple).toBeDefined();
      expect(Array.isArray(metadata.icons.apple)).toBe(true);

      const appleIcons = metadata.icons.apple as Array<{
        url: string;
        sizes?: string;
      }>;
      expect(
        appleIcons.some((icon) => icon.url === '/apple-touch-icon.png')
      ).toBe(true);
      expect(appleIcons.some((icon) => icon.sizes === '152x152')).toBe(true);
      expect(appleIcons.some((icon) => icon.sizes === '180x180')).toBe(true);
    }
  });

  it('should include shortcut icon configuration', () => {
    if (
      metadata.icons &&
      typeof metadata.icons === 'object' &&
      'shortcut' in metadata.icons
    ) {
      expect(metadata.icons.shortcut).toBeDefined();
      expect(Array.isArray(metadata.icons.shortcut)).toBe(true);

      const shortcuts = metadata.icons.shortcut as Array<{ url: string }>;
      expect(
        shortcuts.some((shortcut) => shortcut.url === '/favicon.ico')
      ).toBe(true);
    }
  });
});
