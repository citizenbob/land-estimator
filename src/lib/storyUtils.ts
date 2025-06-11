import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

/**
 * Creates a base meta configuration for Storybook stories
 * @param componentName - The display name for the component in Storybook
 * @param component - The React component
 * @param description - Optional description for the component
 */
export function createBaseMeta<T extends React.ComponentType<unknown>>(
  componentName: string,
  component: T,
  description?: string
): Meta<T> {
  return {
    title: `Components/${componentName}`,
    component,
    parameters: {
      docs: {
        description: {
          component: description || `The ${componentName} component.`
        }
      }
    }
  };
}

/**
 * Creates a standard story object for a component
 * @param renderFn - Function that renders the component
 */
export function createStory(
  renderFn: () => React.ReactElement
): StoryObj<unknown> {
  return {
    render: renderFn
  };
}

/**
 * Standard patterns for common story types
 */
export const STORY_PATTERNS = {
  /**
   * Standard documentation description for component stories
   */
  getDescription: (componentName: string) => `The ${componentName} component.`,

  /**
   * Common accessibility labels
   */
  ARIA_LABELS: {
    DISABLED: 'Disabled component',
    CLOSE: 'Close',
    SUBMIT: 'Submit',
    CANCEL: 'Cancel'
  },

  /**
   * Common test scenarios
   */
  SCENARIOS: {
    DEFAULT: 'Default',
    DISABLED: 'Disabled',
    WITH_ARIA_LABEL: 'With Aria Label',
    ERROR_STATE: 'Error State',
    SUCCESS_STATE: 'Success State'
  }
} as const;

/**
 * Standard export pattern for Storybook stories
 */
export function exportStories<T extends React.ComponentType<unknown>>(
  meta: Meta<T>,
  stories: Record<string, StoryObj<unknown>>
) {
  return {
    default: meta,
    ...stories
  };
}
