# CONTRIBUTING

Thank you for your interest in contributing to the Landscape Estimator project. We value collaboration and follow these guidelines to ensure a smooth workflow for all team members, whether local or distributed.

## Table of Contents

- [Workflow](#workflow)
- [Branching Strategy](#branching-strategy)
- [Commit Messages](#commit-messages)
- [Testing & CI/CD](#testing--cicd)
- [Technical Spikes](#technical-spikes)
- [Setup](#setup)
- [Code Style](#code-style)
- [Design System](#design-system)
  - [Design Tokens](#design-tokens)
  - [Styled Components](#styled-components)
  - [Accessibility](#accessibility)
  - [Storybook](#storybook)
- [Remote Collaboration Best Practices](#remote-collaboration-best-practices)
- [Questions & Help](#questions--help)

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

## Testing & CI/CD

- **Test-Driven Development (TDD):**  
  Every new feature or fix is developed using a TDD approach. Write tests first, then implement the minimal code to pass those tests. Remember: every commit merged into main must be deployable.
- **CI/CD Pipeline:**  
  Our GitHub CI pipeline runs tests on every pull request to ensure only fully tested, working code is merged into the main branch.

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
- **Import Aliases:** Configured in our TypeScript setup to map `@app/*` to the root of `./src` and additional aliases such as `@components/*`, `@config/*`, `@hooks/*`, `@lib/*`, `@store/*`, and `@types/*` to their respective subdirectories.
- **Comments:** Inline comments in code are disallowed; please use commit messages and GitHub discussions for context.

## Design System

Our design system defines the look and feel of the application. It provides a single source of truth for design tokens, styling conventions, and component behavior. This section outlines our design tokens, how we encapsulate component styles, and how Storybook is used to document and validate our UI.

### Design Tokens

To ensure that our design tokens (defined in `defaultTheme`) are available across all components, we use a `<Theme Provider />` from styled-components. Because React's context (which is used by `ThemeProvider`) only works in `Client Components`, we isolate the theme provisioning in a dedicated client component. This setup keeps our global design tokens centralized while maintaining optimal performance with Next.js server components.

#### Client Theme Provider

We create a client-only component named `ClientThemeProvider` that wraps its children with the ThemeProvider. This component is marked with `"use client"` to ensure it is treated as a client component:

```tsx
// src/app/ClientThemeProvider.tsx
'use client';

import React from 'react';
import { ThemeProvider } from 'styled-components';
import defaultTheme from './default_theme';

interface ClientThemeProviderProps {
  children: React.ReactNode;
}

export default function ClientThemeProvider({
  children,
}: ClientThemeProviderProps) {
  return <ThemeProvider theme={defaultTheme}>{children}</ThemeProvider>;
}
```

#### Layout Integration

In our root layout (`src/app/layout.tsx`), we import and use the `<ClientThemeProvider />` to provide the theme context to the entire application. This way, all styled-components can access our centralized design tokens. This approach makes it easier to update our design tokens or theme settings in one place, and those changes automatically propagate throughout the app.

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import ClientThemeProvider from './ClientThemeProvider';

export const metadata: Metadata = {
  title: 'Create Next App',
  description: 'Generated by create next app',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
  });
  const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
  });

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientThemeProvider>{children}</ClientThemeProvider>
      </body>
    </html>
  );
}
```

### Styled Components

This file defines the styled components for the `<AddressInput />` component. Each component (`Form`, `Input`, and `Button`) uses the `.attrs()` method to automatically apply a set of Tailwind utility `classNames`.

#### Example: AddressInput.styles.ts

// src/components/AddressInput/AddressInput.styles.ts

```tsx
import styled from 'styled-components';

export const Form = styled.form.attrs(() => ({
  className: 'flex flex-col gap-2 p-4 border rounded-md shadow-sm',
}))``;

export const Input = styled.input.attrs(() => ({
  className:
    'px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-300',
}))``;

export const Button = styled.button.attrs(() => ({
  className:
    'px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors',
}))``;
```

#### Example: AddressInput.tsx

This file demonstrates how to import and use the styled components defined in `AddressInput.styles.ts`. The `<AddressInput />` component manages its own state and uses these styled components for layout and styling.

```tsx
// src/components/AddressInput/AddressInput.tsx
'use client';

import React, { useState } from 'react';
import { Form, Input, Button } from './AddressInput.styles';

interface AddressInputProps {
  onSubmit: (address: string) => void;
}

const AddressInput: React.FC<AddressInputProps> = ({ onSubmit }) => {
  const [address, setAddress] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(address);
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Input
        type="text"
        placeholder="Enter address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
      <Button type="submit">Submit</Button>
    </Form>
  );
};

export default AddressInput;
```

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

## Questions & Help

If you have any questions or need assistance:

- Open an issue on GitHub.
- Reach out on our designated communication channels.
- Consult the README for additional guidance.

Thank you for making good work.

---

This is the initial version of our CONTRIBUTING guidelines. If you have suggestions for additional sections such as Pull Request Guidelines, Issue Triage, or a Code of Conduct, please feel free to open a discussion or submit a pull request.
