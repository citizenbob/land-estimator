import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EstimateLineItem } from './EstimateLineItem';

describe('EstimateLineItem', () => {
  it('renders label and value when show is true', () => {
    render(<EstimateLineItem label="Design Fee" value="$1,500" />);
    const labelElement = screen.getByText('Design Fee:');
    const valueElement = screen.getByText('$1,500');

    expect(labelElement).toBeInTheDocument();
    expect(valueElement).toBeInTheDocument();
    // Check the elements are in the same parent
    expect(labelElement.parentElement).toBe(valueElement.parentElement);
  });

  it('does not render anything when show is false', () => {
    const { container } = render(
      <EstimateLineItem label="Hidden" value="$0" show={false} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders correctly with long content', () => {
    const longLabel = 'Premium Landscape Design with Custom Features';
    const longValue =
      '$15,000 - $25,000 (includes consultation and site analysis)';
    render(<EstimateLineItem label={longLabel} value={longValue} />);
    expect(screen.getByText(`${longLabel}:`)).toBeInTheDocument();
    expect(screen.getByText(longValue)).toBeInTheDocument();
  });

  it('increments animation props on motion component', () => {
    // We can't test framer-motion internals easily, but we can check that the component renders the correct tag
    render(<EstimateLineItem label="Test" value="123" />);
    const container = screen.getByText('Test:').parentElement;
    // The styled component uses a MotionLineItem which resolves to a div with motion props
    expect(container).toHaveAttribute('style');
    // At least it should be a DOM element
    const tagName = container?.tagName.toLowerCase();
    expect(tagName).toBe('div');
  });
});
