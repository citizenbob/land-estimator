# Case Study: Maintaining Velocity with a Disciplined, Test-Driven Workflow

## Project Overview

**Land Estimator** - A Next.js application that provides algorithm-driven land area estimates using GIS data and advanced text search for landscaping and property management. This project serves as a real-world example of applying professional software engineering practices to a rapidly evolving codebase, ensuring quality and velocity are maintained in parallel.

## The Challenge: Scaling Complexity with an Always-Runnable Mindset

This case study documents the systematic approach taken to refactor a critical data-loading mechanism while adhering to a strict, always-runnable development philosophy. The core challenge was not fixing a broken prototype, but rather evolving the architecture to handle increasing data complexity without compromising the stability of our continuous delivery pipeline.

Our workflow is built on a foundation of vertical slices and a robust test pyramid, ensuring that every commit leaves the system in a deployable state.

## Problems Identified & Biases Acknowledged

### 1. Architectural Drift and Test Coupling

- **Observation:** The initial data loading logic, while functional, had inconsistent error handling and fallback mechanisms. This created tight coupling in our tests, making them brittle and sensitive to implementation changes rather than validating business requirements.
- **Bias:** An early assumption that a simple data loading pattern would suffice led to architectural drift. We underestimated how quickly new requirements would challenge this initial design, revealing the need for a more robust, universal solution.

### 2. DRY Violations in Test Data

- **Observation:** Mock data was duplicated across multiple test files. This slowed down development, as any change to the data model required updating multiple locations, leading to inconsistencies and maintenance overhead.
- **Bias:** A desire for isolated, self-contained tests led us to overlook the benefits of a centralized test data strategy. We initially prioritized test independence over the long-term cost of maintaining duplicated mocks.

### 3. Inefficient Repository and Build Artifact Management

- **Observation:** The repository was bloated with large data files (179MB-815MB), exceeding GitHub’s limits and slowing down our CI/CD pipeline. Our initial use of Git LFS was a tactical fix, but it didn't address the root problem: build artifacts do not belong in a source code repository.
- **Bias:** A belief that source data _must_ live with the source code, without fully considering the implications for version control or the costs associated with LFS. This conflated source code with build artifacts.

## Solution: A Disciplined Approach to Refactoring

Our solution was grounded in our team's core principles: maintaining an always-runnable master branch and leveraging a comprehensive test pyramid.

### The Test Pyramid in Action

We view the system through the lens of a test pyramid, ensuring we have the right tests at the right levels.

**1. Unit Tests (The Foundation):** Fast, isolated tests that validate individual components.

- **Example:** When we developed the `UniversalBundleLoader`, we wrote focused unit tests to validate its core logic: loading gzipped data, handling errors, and enforcing the `fallbackEnabled` flag.

```typescript
// src/services/parcelMetadata.test.ts
it('should throw an error if the gzipped file is not found and fallback is disabled', async () => {
  vi.spyOn(fs.promises, 'readFile').mockRejectedValue(new Error('File not found'));
  await expect(loadParcelMetadata()).rejects.toThrow(
    'Optimized parcel metadata is required.'
  );
});
```

**2. Integration Tests (The Middle Layer):** Verifying that components work together.

- **Example:** Our API route tests (`src/app/api/lookup/route.test.ts`) validate the integration between the API endpoint, the data loading service, and the search index. These tests use the *actual* data loader, ensuring the components are wired correctly.

**3. End-to-End (E2E) Tests (The Peak):** Simulating real user workflows in a browser.

- **Example:** Our Cypress tests (`cypress/e2e/issue-1.cy.ts`) confirm that a user can type an address, receive suggestions, and see the results on the screen. This validates the entire system, from the UI to the backend.

```typescript
// cypress/e2e/issue-1.cy.ts
it('should show suggestions when a user types in the address input', () => {
  cy.visit('/');
  cy.get('input[placeholder="Enter address"]').type('123 Main');
  cy.get('[data-testid="suggestions-list"]').should('be.visible');
});
```

### Phase 1: TDD as a Design Tool for a Universal Loader

**Approach:** We started by defining the requirements for our new `UniversalBundleLoader` in our unit tests. This test-first approach forced us to design a clean, explicit API from the outset.

**Key Architectural Decision:** Business rules, like whether to allow a fallback to raw data, became explicit parameters in the loader's configuration, not hidden logic.

```typescript
// src/lib/universalBundleLoader.ts
const loader = createUniversalBundleLoader({
  filename: 'address-index.json.gz',
  fallbackEnabled: false, // Explicitly disable the problematic fallback
  errorMessage: 'Address index requires optimized data'
});
```

### Phase 2: Enforcing DRY Test Data

**Solution:** We established a single source of truth for all test data in `src/lib/testData.ts` and adopted a strict, semantic naming convention. This eliminated redundancy and ensured our tests were consistent and maintainable.

```typescript
// src/lib/testData.ts
export const MOCK_PARCEL_METADATA = [/* ... */];

// parcelMetadata.test.ts
import { MOCK_PARCEL_METADATA } from '@lib/testData';
vi.mock('@lib/universalBundleLoader', () => ({ /* ... uses MOCK_PARCEL_METADATA */ }));
```

### Phase 3: Taming the Repository for a Faster CI/CD Pipeline

**Solution:** We made a clear distinction between source code and build artifacts. Large data files were removed from the repository's history, and their generation was integrated into the build process. Only the essential, compressed `.gz` artifacts are tracked using Git LFS, ensuring our repository remains lean and our CI pipeline runs efficiently.

**Professional Recommendation:** Large data files should be treated as build artifacts or hosted on dedicated storage (like S3), not checked into version control. The build pipeline is the correct place to generate them.

## Developer's Retrospective & Biases

This refactoring was an exercise in discipline. My initial bias was not towards prototyping, but towards localized solutions, which created downstream maintenance costs. The pain of a bloated repository and brittle tests was a direct consequence of not thinking about the system as a whole.

My key takeaway is that practices like TDD, DRY, and a clear testing strategy are not academic exercises; they are pragmatic tools for maintaining velocity in a professional environment. I learned to be skeptical of tactical fixes like Git LFS and instead focus on first principles: version control is for source code, and build artifacts belong in a build pipeline or artifact repository. This case study reflects my journey in applying these principles to deliver robust, maintainable software continuously.

## Conclusion

Professional software development requires **systems thinking**—considering not just whether code works, but whether it's maintainable, testable, deployable, and aligned with a continuous delivery workflow. This case study demonstrates how a disciplined, test-driven approach transforms a complex refactoring task into a manageable process that enhances system quality without sacrificing velocity.

The key insight: **Quality is not an accident—it's the result of a disciplined, professional workflow applied consistently.**
