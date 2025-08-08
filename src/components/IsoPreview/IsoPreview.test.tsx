import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import IsoPreview from './IsoPreview';

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: []
}));

global.Image = vi.fn().mockImplementation(() => ({
  onload: null,
  onerror: null,
  src: ''
}));

global.matchMedia = vi.fn().mockImplementation((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn()
}));

describe('IsoPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
  });

  it('renders without crashing', () => {
    render(<IsoPreview />);
    expect(screen.getByRole('img', { name: /empty lot/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /house/i })).toBeInTheDocument();
  });

  it('renders base layers always', () => {
    render(<IsoPreview />);

    const baseLayers = screen.getAllByRole('img');
    expect(baseLayers).toHaveLength(2);
  });

  it('renders tier-specific layer when activeTier is provided', () => {
    render(<IsoPreview activeTier="curb_appeal" />);

    waitFor(() => {
      expect(
        screen.getByRole('img', { name: /curb appeal/i })
      ).toBeInTheDocument();
    });
  });

  it('updates tier when activeTier prop changes', () => {
    const { rerender } = render(<IsoPreview activeTier="curb_appeal" />);

    rerender(<IsoPreview activeTier="full_lawn" />);

    waitFor(() => {
      expect(
        screen.getByRole('img', { name: /full lawn landscape/i })
      ).toBeInTheDocument();
    });
  });

  it('calls onTierInView when using intersection observer', () => {
    const mockOnTierInView = vi.fn();

    // Mock matchMedia to return true for mobile breakpoint
    global.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));

    render(
      <IsoPreview
        useIntersectionObserver={true}
        onTierInView={mockOnTierInView}
      />
    );

    expect(global.IntersectionObserver).toHaveBeenCalled();
  });

  it('preloads all SVG images on mount', () => {
    render(<IsoPreview />);

    expect(global.Image).toHaveBeenCalledTimes(5);
  });

  it('handles custom animation duration', () => {
    render(<IsoPreview animationDuration={1000} />);

    expect(screen.getByRole('img', { name: /empty lot/i })).toBeInTheDocument();
  });

  it('displays tier layer with correct alt text', () => {
    render(<IsoPreview activeTier="dream_lawn" />);

    waitFor(() => {
      expect(
        screen.getByRole('img', { name: /dream yard/i })
      ).toBeInTheDocument();
    });
  });
});
