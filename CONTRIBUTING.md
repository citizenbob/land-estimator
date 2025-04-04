# CONTRIBUTING

Thank you for your interest in contributing to the Landscape Estimator project. We value collaboration and follow these guidelines to ensure a smooth workflow for all team members, whether local or distributed.

## Table of Contents

- [Workflow](#workflow)
- [Branching Strategy](#branching-strategy)
- [Commit Messages](#commit-messages)
- [Testing & Deployment](#testing--deployment)
- [Technical Spikes](#technical-spikes)
- [Setup](#setup)
- [Deploying to Vercel](#deploying-to-vercel)
- [Code Style](#code-style)
- [Design System](#design-system)
  - [Design Tokens](#design-tokens)
  - [Theme Provider](#theme-provider)
  - [Styled Components](#styled-components)
  - [Accessibility](#accessibility)
  - [Storybook](#storybook)
- [Remote Collaboration Best Practices](#remote-collaboration-best-practices)
- [Need Help?](#need-help)

## Workflow

- **Feature Branches:**  
  Create a dedicated feature branch (e.g., `feature/address-input`) for every new feature or fix. All changes must be made on feature branches, ensuring that the main branch always remains deployable.
- **Integration:**  
  Use merge or pull requests to integrate feature branches into main. Only fully functional, tested code should be merged.

## Branching Strategy

- **Feature Branches:**  
  Work on new features or bug fixes in isolated feature branches.

- **Spike Branches:**  
  For technical spikes or experimental work, use dedicated spike branches. Document your findings in the repository for future reference.

## Commit Messages

- **Style:**  
  We follow an email-style format for commit messages:
  - **Title:** Concise, clear, and actionable. Must reference the relevant GitHub issue (e.g., `[#101002741]`).
  - **Body:** Additional details or context should follow after a carriage return.
- **Example:**

  ```
  feat(address-input): add initial component structure [#101002741]

  - Render input field and submit button.
  - Integrate onSubmit callback.
  ```

## Testing & Deployment

- **Test-Driven Development (TDD):**  
  Every new feature or fix is developed using a TDD approach. Write tests first, then implement the minimal code to pass those tests. Remember: every commit merged into main must be deployable.

- **CI/CD Pipeline (Coming Soon):**  
  We currently deploy our application via [Vercel CLI](https://vercel.com/docs/cli) and preview environments are generated automatically from branches and pull requests. Only commits merged into the `main` branch are promoted to the production environment. A GitHub Actions CI pipeline will be introduced later to automate testing workflows.

## Technical Spikes

- **Experimental Work:**  
  Conduct technical spikes on separate spike branches. Document experiments, findings, and configurations in the repository for transparency.
- **Documentation:**  
  Consider maintaining a `spikes/` folder or a dedicated section in our documentation to archive your experiments.

## Setup

- **Cloning the Repository:**

  ```bash
  git clone <repo_url>
  cd landscape-estimator
  yarn install
  yarn dev
  ```

- **Running Tests:**
  Run tests locally with:
  ```bash
  yarn test
  ```

## Deploying to Vercel

Our application is hosted using [Vercel](https://vercel.com), which automatically creates preview deployments for each branch and pull request through GitHub integration.

### Deployment Rules:

- All branches pushed to GitHub will be deployed to a unique preview URL.
- Only commits merged into the `main` branch are deployed to the production domain.

### Local Deployment:

You can also deploy manually using Vercel CLI:

```bash
vercel --prod
```

Please ensure your changes pass all tests (`yarn test`) and follow our commit conventions before promoting any code to `main`.

## Code Style

**Consistency:** Adhere to the established coding conventions for clarity and maintainability.

**Directory Structure:** Components should be placed in `/src/components`.

Keep tests, styles, and docs bundled with their respective components. For example, each component file (e.g., `ComponentName.tsx`) must have an accompanying:

1. **Tests** (e.g., `ComponentName.test.tsx` or similar)
2. **Styles** (e.g., `ComponentName.styles.ts` or similar)
3. **Stories** (e.g., `ComponentName.stories.tsx` or similar) within the same folder.

### Linting & Formatting

For the complete configuration, please refer to:

- [ESLint Configuration](.eslintrc.js)
- [Prettier Configuration](.prettierrc)

Our project uses ESLint and Prettier to enforce consistent code style across the codebase. Our decisions include:

- **Indentation:** 2 spaces.
- **Semicolons:** Auto-insert semicolons.
- **Quotes:** Use single quotes in JavaScript.
- **Trailing Commas:** Enforced in multi-line structures.
- **Bracket Placement:** Same-line (1TBS) for readability.
- **Import Aliases:** Configured in our TypeScript setup to map `@app/_` to the root of `./src` and additional aliases such as `@components/_`, `@config/_`, `@hooks/_`, `@lib/_`, `@store/_`, and `@types/*` to their respective subdirectories.
- **Comments:** Inline comments in code are disallowed; please use commit messages and GitHub discussions for context.

## Design System

Our design system defines the look and feel of the application. It provides a single source of truth for design tokens, styling conventions, and component behavior. This section outlines our design tokens, how we encapsulate component styles, and how Storybook is used to document and validate our UI.

### Design Tokens

Our design tokens are now managed using [Style Dictionary](https://amzn.github.io/style-dictionary/), a tool that helps transform and format design tokens for different platforms. We use a `tokens.json` file as the single source of truth for our design tokens, which include colors, spacing, border radii, fonts, and more. Style Dictionary processes this file and generates a `tokens.css` file containing CSS custom properties. These properties are then imported globally, allowing all components in the project to access consistent design values without relying on a separate JSON theme file.

#### Style Dictionary

The configuration for Style Dictionary is defined in a `style-dictionary.config.js` file. This file specifies the input token file (`tokens.json`), the output formats (e.g., CSS, SCSS, JSON), and any custom transformations or formats we use. Here's an example configuration:

```javascript
const StyleDictionary = require('style-dictionary');

module.exports = {
  source: ['tokens.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'tokens/',
      files: [
        {
          destination: 'tokens.css',
          format: 'css/variables'
        }
      ]
    }
  }
};

StyleDictionary.extend(module.exports).buildAllPlatforms();
```

### Theme Provider

Our design tokens are provided through CSS variables defined in `tokens.css`. Instead of using a JSON-based theme object, we now utilize a `getThemeClass` function to dynamically apply theme-specific CSS classes. The `ClientThemeProvider` ensures that the appropriate theme is applied on the client side. Here’s the updated implementation:

```tsx
// src/app/ClientThemeProvider.tsx
'use client';

import React from 'react';
import { getThemeClass, Theme } from '@tokens/theme';
import '../tokens/tokens.css'; // Import the generated tokens

interface ClientThemeProviderProps {
  children: React.ReactNode;
  theme?: Theme;
}

export default function ClientThemeProvider({
  children,
  theme = 'default'
}: ClientThemeProviderProps) {
  return <div className={getThemeClass(theme)}>{children}</div>;
}
```

#### Layout Integration

In our root layout, we use the `ClientThemeProvider` to ensure that the CSS custom properties from `tokens.css` are available throughout the app. Additionally, we dynamically apply the theme class using the `getThemeClass` function. Here’s the updated implementation:

```tsx
// src/app/layout.tsx
import React from 'react';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { getThemeClass } from '@tokens/theme';
import Analytics from '@components/PageAnalytics/PageAnalytics';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
});

export const metadata: Metadata = {
  title: 'Land Estimator',
  description: 'Generated by create next app'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const clientTheme = 'default';
  if (typeof window === 'undefined') {
    return (
      <html lang="en" className={getThemeClass(clientTheme)}>
        <head></head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <Analytics />
          {children}
        </body>
      </html>
    );
  }
  return (
    <html lang="en" className={getThemeClass(clientTheme)}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Analytics />
        {children}
      </body>
    </html>
  );
}
```

#### Theme Utility

The `getThemeClass` function maps theme names to their corresponding CSS class names. This utility ensures that the correct theme is applied consistently across the application.

```tsx
// tokens/theme.ts
export type Theme = 'default' | 'clientA' | 'clientB';

const themeMap: Record<Theme, string> = {
  default: 'theme-default',
  clientA: 'theme-client-a',
  clientB: 'theme-client-b'
};

export function getThemeClass(theme: Theme): string {
  return themeMap[theme] || themeMap.default;
}
```

This approach provides flexibility for managing multiple themes while maintaining a clean and scalable structure.

### Styled Components

Our styled components remain consistent with our design system. Each component utilizes the design tokens defined in `tokens.css` for colors, spacing, and typography.

#### Example: AddressInput.styles.ts

```tsx
// src/components/AddressInput/AddressInput.styles.ts
import styled from 'styled-components';

export const Form = styled.form.attrs(() => ({
  className: 'flex flex-col gap-2 p-4 border rounded-md shadow-sm'
}))``;

export const Input = styled.input.attrs(() => ({
  className:
    'px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-300'
}))``;

export const Button = styled.button.attrs(() => ({
  className:
    'px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors'
}))``;
```

### Future Plans

We aim to move towards a shared, version-controlled repository for the `tokens.json` file. This will allow multiple projects to consume the same design tokens, ensuring consistency across applications. Additionally, we plan to integrate this repository with Storybook to automatically generate and update stories that showcase the design tokens in use.

For more details on Style Dictionary, refer to the [official documentation](https://amzn.github.io/style-dictionary/).

### Accessibility

**WCAG 2.2 AA Compliance**

Ensuring accessibility compliance is a key part of our testing pipeline. We validate our components and pages against WCAG 2.2 AA standards through multiple layers of testing:

#### jest-axe (Accessibility Unit Testing)

We run **jest-axe** tests to verify accessibility at the component level. Example:

```tsx
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import AddressInput from './AddressInput';

test('AddressInput has no accessibility violations', async () => {
  const { container } = render(<AddressInput onSubmit={() => {}} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

#### Cypress (E2E Accessibility Testing)

We integrate **Cypress** with accessibility checks using `cypress-axe`:

```tsx
describe('Landing Page Accessibility', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.injectAxe();
  });

  it('Has no detectable accessibility violations', () => {
    cy.checkA11y();
  });
});
```

### Storybook

Storybook is used to **document and visually test our components**, ensuring that our design system is reflected accurately in the UI. It serves as a living style guide where all changes to the design tokens and component styling are verified.

#### Running Storybook

Run Storybook locally with:

```bash
yarn storybook
```

#### Writing Stories

Each component should have an associated story file (e.g., `AddressInput.stories.tsx`) demonstrating its default state and any variants.

#### Accessibility

Our Storybook integration includes **@storybook/addon-a11y**, which automatically scans components for accessibility violations and provides visual feedback.

## Remote Collaboration Best Practices

- **Communication:**
  For remote teams, clear and asynchronous communication is key. Use GitHub issues and pull request comments to document discussions and decisions.

- **Pair Programming:**
  Utilize remote pairing tools for collaborative debugging or design discussions when needed.

- **Documentation:**
  Keep your work and decisions documented. Clear commit messages and issue descriptions help everyone stay aligned.

- **Time Zones:**
  Be mindful of time zone differences—regular updates on shared channels (e.g., Slack, Teams) can help maintain smooth collaboration.

## Need Help?

If you have any questions or need assistance:

- Open an issue on GitHub.
- Reach out on our designated communication channels.
- Consult the README for additional guidance.

Thank you for making good work.

---

This is the initial version of our CONTRIBUTING guidelines. If you have suggestions for additional sections such as Pull Request Guidelines, Issue Triage, or a Code of Conduct, please feel free to open a discussion or submit a pull request.
