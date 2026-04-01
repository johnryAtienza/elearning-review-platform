import type { Lesson } from '../types'

const lesson = (
  courseId: string,
  order: number,
  title: string,
  description: string,
  duration: string,
): Lesson => ({ id: `${courseId}-${order}`, courseId, order, title, description, duration })

export const LESSONS: Lesson[] = [
  // Course 1 — React Fundamentals
  lesson('1', 1,  'JSX & the Virtual DOM',       'Understand how JSX compiles to React.createElement calls and how the virtual DOM enables efficient updates.',                          '28m'),
  lesson('1', 2,  'Components & Props',           'Build reusable UI building blocks. Learn how data flows downward through props and how to type them with TypeScript.',               '32m'),
  lesson('1', 3,  'State with useState',          'Manage local component state, trigger re-renders, and avoid common mutation mistakes.',                                               '35m'),
  lesson('1', 4,  'Side Effects with useEffect',  'Synchronize components with external systems. Covers cleanup, dependency arrays, and avoiding infinite loops.',                       '40m'),
  lesson('1', 5,  'Event Handling',               'Attach and manage synthetic events. Covers forms, controlled inputs, and event delegation patterns.',                                 '25m'),
  lesson('1', 6,  'Conditional Rendering',        'Render UI conditionally using ternaries, short-circuit evaluation, and early returns.',                                               '20m'),
  lesson('1', 7,  'Lists & Keys',                 'Render dynamic lists efficiently. Understand why stable keys matter for reconciliation.',                                             '22m'),
  lesson('1', 8,  'Component Composition',        'Use children, render props, and compound components to build flexible, composable APIs.',                                             '38m'),
  lesson('1', 9,  'useRef & the DOM',             'Access DOM nodes imperatively and persist mutable values across renders without triggering re-renders.',                              '30m'),
  lesson('1', 10, 'Context API',                  'Share state across a component tree without prop drilling, and understand when Context causes performance issues.',                   '35m'),
  lesson('1', 11, 'Custom Hooks',                 'Extract and reuse stateful logic by writing your own hooks. Best practices for naming and composability.',                            '42m'),
  lesson('1', 12, 'Performance Optimisation',     'Use useMemo, useCallback, and React.memo to prevent unnecessary renders and profile with React DevTools.',                           '45m'),

  // Course 2 — TypeScript Deep Dive
  lesson('2', 1,  'Types & Type Inference',       'Explore primitive types, type inference, and when to annotate explicitly vs. let TypeScript infer.',                                 '30m'),
  lesson('2', 2,  'Interfaces vs Type Aliases',   'Understand the differences, when to prefer one over the other, and how they handle extension and merging.',                          '28m'),
  lesson('2', 3,  'Union & Intersection Types',   'Model values that can be one of several types, and combine multiple types into one.',                                                 '32m'),
  lesson('2', 4,  'Generics',                     'Write reusable, type-safe functions and data structures using generic type parameters and constraints.',                              '45m'),
  lesson('2', 5,  'Utility Types',                'Master built-in helpers: Partial, Required, Pick, Omit, Record, Readonly, ReturnType, and more.',                                   '38m'),
  lesson('2', 6,  'Type Narrowing & Guards',      'Use typeof, instanceof, discriminated unions, and custom type predicates to narrow types safely.',                                   '35m'),
  lesson('2', 7,  'Mapped & Conditional Types',   'Build advanced type transformations — map over object keys, create conditional branches in the type system.',                        '50m'),
  lesson('2', 8,  'TypeScript with React',        'Type components, hooks, events, and refs correctly. Common patterns and pitfalls when combining TSX with strict mode.',              '55m'),

  // Course 3 — State Management with Zustand
  lesson('3', 1,  'Why Zustand?',                 'Compare Zustand to Redux and Context. Understand its minimal API and when it is the right tool.',                                    '20m'),
  lesson('3', 2,  'Creating a Store',             'Define state and actions with create(). Explore the set and get API and how immer integration works.',                               '30m'),
  lesson('3', 3,  'Selectors & Subscriptions',    'Read state efficiently with selector functions. Understand referential equality and how to prevent over-renders.',                   '35m'),
  lesson('3', 4,  'Persistence Middleware',       'Persist state to localStorage or sessionStorage using the built-in persist middleware and custom storage adapters.',                 '32m'),
  lesson('3', 5,  'DevTools & Testing',           'Integrate Zustand with Redux DevTools, write unit tests for stores, and debug state changes in development.',                        '38m'),

  // Course 4 — Tailwind CSS Mastery
  lesson('4', 1,  'Utility-First Fundamentals',   'Understand the utility-first methodology and how it differs from traditional CSS approaches like BEM.',                              '25m'),
  lesson('4', 2,  'Responsive Design',            'Apply breakpoint prefixes (sm, md, lg, xl) to build fully responsive layouts without writing media queries.',                       '30m'),
  lesson('4', 3,  'Flexbox & Grid Utilities',     'Build complex layouts using Tailwind\'s flex and grid utilities. Alignment, gaps, and ordering.',                                    '35m'),
  lesson('4', 4,  'Typography & Colour',          'Control fonts, sizes, weights, tracking, and colour with Tailwind tokens. Dark mode with the dark: variant.',                       '28m'),
  lesson('4', 5,  'Spacing & Sizing',             'Master margin, padding, width, height, and the spacing scale. When to use arbitrary values.',                                        '22m'),
  lesson('4', 6,  'Theming with CSS Variables',   'Customise the design system using CSS custom properties and the @theme directive in Tailwind v4.',                                  '40m'),
  lesson('4', 7,  'Component Patterns',           'Extract reusable component styles using cva, cn, and Tailwind variants without leaving utility classes.',                            '38m'),
  lesson('4', 8,  'Animations & Transitions',     'Add motion with Tailwind\'s transition, duration, ease, and animate utilities, plus tw-animate-css.',                               '30m'),
  lesson('4', 9,  'Forms & Inputs',               'Style accessible form controls — inputs, checkboxes, selects, and error states — entirely with utilities.',                          '32m'),
  lesson('4', 10, 'Production Optimisation',      'Understand how Tailwind purges unused classes, manages bundle size, and integrates with Vite.',                                      '25m'),

  // Course 5 — React Router in Depth
  lesson('5', 1,  'Router Setup',                 'Install React Router v6+, create a browser router, and render your first route tree.',                                               '20m'),
  lesson('5', 2,  'Nested Routes & Outlets',      'Build hierarchical layouts using nested route configs and the Outlet component.',                                                    '30m'),
  lesson('5', 3,  'Navigation & Links',           'Use Link, NavLink, and the useNavigate hook. Understand the difference between declarative and imperative navigation.',              '25m'),
  lesson('5', 4,  'URL Params & Search Params',   'Read dynamic segments with useParams and manage query strings with useSearchParams.',                                                '28m'),
  lesson('5', 5,  'Route Guards',                 'Protect routes based on auth or role state using wrapper components that redirect with Navigate.',                                   '35m'),
  lesson('5', 6,  'Loaders & Actions',            'Use the data router API to co-locate data fetching with routes using loader functions.',                                             '40m'),
  lesson('5', 7,  'Error Boundaries & 404s',      'Handle route-level errors and missing routes gracefully with errorElement and catch-all routes.',                                    '30m'),

  // Course 6 — Testing React Applications
  lesson('6', 1,  'Testing Philosophy',           'Understand the testing pyramid, what to test, and the difference between unit, integration, and E2E tests.',                        '25m'),
  lesson('6', 2,  'Vitest Setup',                 'Configure Vitest in a Vite project, write your first test, and understand watch mode and coverage reports.',                         '30m'),
  lesson('6', 3,  'React Testing Library',        'Query the DOM the way users do — by role, label, and text. Avoid implementation detail testing.',                                    '35m'),
  lesson('6', 4,  'Testing User Events',          'Simulate clicks, typing, and form submissions with userEvent. Async interactions and waitFor.',                                      '32m'),
  lesson('6', 5,  'Mocking Modules',              'Mock imports, API calls, and third-party modules with vi.mock. Spy on function calls and assert arguments.',                         '38m'),
  lesson('6', 6,  'Testing Custom Hooks',         'Test hooks in isolation using renderHook and act. Handle stateful and async hook behaviour.',                                        '35m'),
  lesson('6', 7,  'Testing with React Router',    'Wrap components in MemoryRouter, simulate navigation, and assert route changes in tests.',                                           '30m'),
  lesson('6', 8,  'Testing Zustand Stores',       'Reset store state between tests, mock store slices, and test components that depend on global state.',                               '32m'),
  lesson('6', 9,  'Snapshot & Visual Tests',      'Use snapshot testing judiciously and integrate Storybook for component-level visual review.',                                        '28m'),
]

