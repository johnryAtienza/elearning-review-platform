import type { Quiz, QuizQuestion } from '../types'

// Factory: q(lessonId, n, question, choices, correctIndex)
const q = (
  lessonId: string,
  n: number,
  question: string,
  choices: [string, string, string, string],
  correctAnswer: number,
): QuizQuestion => ({
  id: `${lessonId}-q${n}`,
  question,
  choices: choices.map((text) => ({ text })),
  correctAnswer,
})

export const QUIZ_DATA: Quiz[] = [
  // ── Course 1: React Fundamentals ──────────────────────────────────────────
  {
    lessonId: '1-1',
    questions: [
      q('1-1', 1, 'What does JSX compile to at build time?', ['React.render calls', 'React.createElement calls', 'document.createElement calls', 'HTML strings'], 1),
      q('1-1', 2, 'What is the virtual DOM?', ['A browser API for fast rendering', 'A real DOM hidden from the user', 'A plain JavaScript object tree describing the UI', 'A CSS-in-JS abstraction layer'], 2),
      q('1-1', 3, 'Which of these is valid JSX for embedding a JavaScript expression?', ['<p>{{name}}</p>', '<p>${name}</p>', '<p>{name}</p>', '<p><!--name--></p>'], 2),
      q('1-1', 4, 'What is the JSX equivalent of the HTML class attribute?', ['class', 'className', 'classList', 'cssClass'], 1),
    ],
  },
  {
    lessonId: '1-2',
    questions: [
      q('1-2', 1, 'What is a React component?', ['A CSS class that styles elements', 'A function that accepts props and returns JSX', 'A global event handler', 'A DOM manipulation utility'], 1),
      q('1-2', 2, 'Props in React are:', ['Mutable inside the component', 'Read-only inputs that flow from parent to child', 'Global variables shared between components', 'Only available in class components'], 1),
      q('1-2', 3, 'How do you set a default prop value using function parameters?', ['props.defaultValue = "x"', 'Component.defaultProps = {}', 'function Btn({ size = "md" }) {}', 'useDefault("size", "md")'], 2),
      q('1-2', 4, 'TypeScript interfaces are used with props to:', ['Compile JSX faster', 'Document and enforce the expected prop shape', 'Replace the need for the component', 'Add runtime validation automatically'], 1),
    ],
  },
  {
    lessonId: '1-3',
    questions: [
      q('1-3', 1, 'When should you use the functional updater form of useState?', ['Always, for performance', 'When the new value depends on the previous value', 'Only in class components', 'When state is a string'], 1),
      q('1-3', 2, 'What happens when you mutate state directly?', ['React detects it and re-renders', 'The UI updates immediately', 'React does not detect the change and the UI may be stale', 'It throws a runtime error'], 2),
      q('1-3', 3, 'State in React is:', ['Shared between all component instances by default', 'Local to each component instance', 'Persisted to localStorage automatically', 'Accessible from any child component'], 1),
      q('1-3', 4, 'What does calling a state setter (e.g. setCount) do?', ['Synchronously updates the DOM', 'Schedules a re-render with the new state value', 'Replaces the entire component tree', 'Freezes state until the next render'], 1),
    ],
  },
  {
    lessonId: '1-4',
    questions: [
      q('1-4', 1, 'What does an empty dependency array [] mean in useEffect?', ['The effect never runs', 'The effect runs after every render', 'The effect runs once after the initial render', 'The effect only runs on unmount'], 2),
      q('1-4', 2, 'What is the purpose of the cleanup function returned from useEffect?', ['To update state after the effect', 'To prevent memory leaks from subscriptions and timers', 'To re-trigger the effect manually', 'To log the effect result'], 1),
      q('1-4', 3, 'Why must reactive values be listed in the dependency array?', ['To improve performance', 'To avoid TypeScript errors', 'So the effect re-runs with fresh values when they change', 'It is optional — React tracks them automatically'], 2),
      q('1-4', 4, 'Why do effects run twice in React Strict Mode (development)?', ['It is a bug in React', 'To double the render speed', 'To surface missing cleanup functions', 'To warm up the JavaScript engine'], 2),
    ],
  },
  {
    lessonId: '1-5',
    questions: [
      q('1-5', 1, 'How do you correctly attach an event handler in JSX?', ['onClick="handleClick()"', 'onclick={handleClick()}', 'onClick={handleClick}', 'on-click={handleClick}'], 2),
      q('1-5', 2, 'What does e.preventDefault() do in a form handler?', ['Stops the event from reaching parent elements', 'Prevents the default browser behaviour (e.g. page reload)', 'Removes the event listener', 'Validates form inputs'], 1),
      q('1-5', 3, 'A controlled input is one where:', ['The input manages its own value in the DOM', 'React state is the single source of truth for the value', 'No onChange handler is required', 'The value is set only on form submit'], 1),
      q('1-5', 4, 'When is an uncontrolled input appropriate?', ['When you need real-time validation', 'For file inputs or integrating third-party DOM libraries', 'When using TypeScript', 'Always — it is more performant'], 1),
    ],
  },
  {
    lessonId: '1-6',
    questions: [
      q('1-6', 1, 'Which pattern is best for mutually exclusive states (show A or show B)?', ['Short-circuit: {flag && <A />}', 'Ternary: {flag ? <A /> : <B />}', 'Returning null from the component', 'An if statement before the return'], 1),
      q('1-6', 2, 'What does rendering null return in React?', ['An empty div', 'Nothing — null renders no DOM output', 'A comment node in the DOM', 'It throws an error'], 1),
      q('1-6', 3, 'What is the pitfall of using {count && <Badge />}?', ['It always renders Badge', 'When count is 0, React renders "0" as text', 'It causes a re-render loop', 'It only works in class components'], 1),
      q('1-6', 4, 'An early return in a component is useful for:', ['Improving runtime performance', 'Guarding against missing data before the main render', 'Replacing useState', 'Lazy loading components'], 1),
    ],
  },
  {
    lessonId: '1-7',
    questions: [
      q('1-7', 1, 'Why are keys required when rendering a list in React?', ['To add CSS classes automatically', 'To help React identify which items changed, were added, or removed', 'To sort the list', 'To prevent the list from re-rendering'], 1),
      q('1-7', 2, 'When should you avoid using array indexes as keys?', ['Always — indexes are never valid keys', 'When items can reorder or be removed', 'When the list is longer than 10 items', 'When items are objects'], 1),
      q('1-7', 3, 'What is the scope requirement for key uniqueness?', ['Globally unique across the whole app', 'Unique among siblings in the same list', 'Unique per component file', 'Unique across renders'], 1),
      q('1-7', 4, 'Can a component read its own key prop?', ['Yes, via props.key', 'Yes, via useKey()', 'No — keys are not passed as props', 'Only in class components'], 2),
    ],
  },
  {
    lessonId: '1-8',
    questions: [
      q('1-8', 1, 'What is the children prop in React?', ['A reserved prop that passes nested JSX to a component', 'A lifecycle hook for child components', 'A way to fetch data from child components', 'Only available in class components'], 0),
      q('1-8', 2, 'What is the main advantage of composition over configuration?', ['Smaller bundle size', 'You pass components as props instead of boolean flags, increasing flexibility', 'Faster renders', 'Fewer TypeScript errors'], 1),
      q('1-8', 3, 'Compound components typically share state via:', ['Global variables', 'Props drilling', 'React Context', 'Redux'], 2),
      q('1-8', 4, 'What has largely replaced render props in modern React?', ['Class components', 'Higher-order components', 'Custom hooks', 'The Context API'], 2),
    ],
  },
  {
    lessonId: '1-9',
    questions: [
      q('1-9', 1, 'What is the key difference between useRef and useState?', ['useRef is for arrays only', 'Changing a ref does not trigger a re-render; changing state does', 'useRef only works in class components', 'useState cannot hold DOM references'], 1),
      q('1-9', 2, 'How do you attach a ref to a DOM element?', ['useRef={myRef}', 'ref={myRef}', 'attach={myRef}', 'domRef={myRef}'], 1),
      q('1-9', 3, 'What is a good use case for storing a value in a ref?', ['When a state change should re-render the component', 'When you need to store an interval ID or previous value without re-rendering', 'When you need to share data between components', 'When you need to persist data across sessions'], 1),
      q('1-9', 4, 'How do you access a DOM element stored in a ref?', ['myRef.value', 'myRef.dom', 'myRef.current', 'myRef.element'], 2),
    ],
  },
  {
    lessonId: '1-10',
    questions: [
      q('1-10', 1, 'What problem does the Context API solve?', ['Slow component renders', 'Prop drilling — passing data through many layers of components', 'Missing TypeScript types', 'Uncontrolled side effects'], 1),
      q('1-10', 2, 'What is the correct way to consume a context value?', ['import context from the file', 'useContext(MyContext)', 'readContext(MyContext)', 'Context.read()'], 1),
      q('1-10', 3, 'When does a component using useContext re-render?', ['On every render of any component', 'Only when its own state changes', 'When the context value changes', 'When the Provider unmounts'], 2),
      q('1-10', 4, 'Context is best suited for:', ['High-frequency updates like animation frames', 'Low-frequency data like theme, locale, or auth state', 'Replacing all useState calls', 'Server-side data fetching'], 1),
    ],
  },
  {
    lessonId: '1-11',
    questions: [
      q('1-11', 1, 'What naming rule must custom hooks follow?', ['They must end with "Hook"', 'They must start with "use"', 'They must be in a hooks/ folder', 'They must be exported as default'], 1),
      q('1-11', 2, 'Can custom hooks call other hooks?', ['No — only built-in hooks can call other hooks', 'Yes — including other custom hooks', 'Yes — but only useState and useEffect', 'Only in production builds'], 1),
      q('1-11', 3, 'What is the main purpose of a custom hook?', ['To replace the Context API', 'To extract and reuse stateful logic across components', 'To improve component performance automatically', 'To connect to a backend API'], 1),
      q('1-11', 4, 'What have custom hooks largely replaced?', ['useState and useEffect', 'Higher-order components and render props', 'The Redux store', 'Class component lifecycle methods only'], 1),
    ],
  },
  {
    lessonId: '1-12',
    questions: [
      q('1-12', 1, 'What does React.memo do?', ['Memoizes an async function result', 'Wraps a component and skips re-renders if props have not shallowly changed', 'Caches API responses', 'Prevents state updates'], 1),
      q('1-12', 2, 'What is the difference between useMemo and useCallback?', ['There is no difference', 'useMemo caches a value; useCallback caches a function reference', 'useCallback caches a value; useMemo caches a function', 'useMemo is for arrays; useCallback is for objects'], 1),
      q('1-12', 3, 'When should you apply React performance optimisations?', ['As early as possible — always optimise proactively', 'After profiling shows a genuine bottleneck', 'Only in class components', 'Before writing any logic'], 1),
      q('1-12', 4, 'Which tool helps identify which components render and how long they take?', ['The Network tab in DevTools', 'React DevTools Profiler', 'TypeScript compiler output', 'The Vite build report'], 1),
    ],
  },

  // ── Course 2: TypeScript Deep Dive ────────────────────────────────────────
  {
    lessonId: '2-1',
    questions: [
      q('2-1', 1, 'When does TypeScript infer a variable\'s type?', ['Never — you must always annotate', 'From its initial value', 'Only for primitive types', 'Only inside functions'], 1),
      q('2-1', 2, 'Where are explicit type annotations most valuable?', ['On every local variable', 'At function boundaries — parameters and return types', 'Inside for loops', 'Only on constants'], 1),
      q('2-1', 3, 'What does the any type do to TypeScript\'s type checking?', ['Makes all checks stricter', 'Disables type checking for that value', 'Converts the value to a string', 'Is the same as unknown'], 1),
      q('2-1', 4, 'What is the preferred alternative to any for a value of truly unknown shape?', ['never', 'void', 'unknown', 'object'], 2),
    ],
  },
  {
    lessonId: '2-2',
    questions: [
      q('2-2', 1, 'Which TypeScript feature supports declaration merging?', ['Type aliases', 'Interfaces', 'Enums', 'Generics'], 1),
      q('2-2', 2, 'How do you extend an interface in TypeScript?', ['interface B = A & { ... }', 'interface B extends A { ... }', 'interface B implements A { ... }', 'interface B : A { ... }'], 1),
      q('2-2', 3, 'Which of these can ONLY be expressed with a type alias, not an interface?', ['An object shape', 'A union of string literals', 'A method signature', 'An optional property'], 1),
      q('2-2', 4, 'How do you combine two type aliases into one?', ['type C = A extends B', 'type C = A | B', 'type C = A & B', 'type C = merge(A, B)'], 2),
    ],
  },
  {
    lessonId: '2-3',
    questions: [
      q('2-3', 1, 'What does a union type A | B mean?', ['The value must satisfy both A and B', 'The value is either A or B', 'A inherits from B', 'A and B are merged into one type'], 1),
      q('2-3', 2, 'What is a discriminated union?', ['A union that is deprecated', 'A union with a shared literal-type tag field used for narrowing', 'A union of exactly two types', 'A union that cannot be narrowed'], 1),
      q('2-3', 3, 'What does an intersection type A & B mean?', ['The value is either A or B', 'The value must be neither A nor B', 'The value must satisfy both A and B simultaneously', 'Only the shared properties of A and B'], 2),
      q('2-3', 4, 'TypeScript narrows a discriminated union using:', ['The type keyword', 'A shared literal-type field in an if or switch statement', 'instanceof only', 'Explicit type casts'], 1),
    ],
  },
  {
    lessonId: '2-4',
    questions: [
      q('2-4', 1, 'What is the type parameter T in function identity<T>(value: T): T?', ['A runtime variable', 'A placeholder that TypeScript fills in based on the argument', 'Always the string type', 'A required import'], 1),
      q('2-4', 2, 'What does the extends keyword do in a generic constraint?', ['Enables inheritance between generics', 'Limits what types are accepted as the type argument', 'Makes the generic optional', 'Infers the type from the return value'], 1),
      q('2-4', 3, 'What is a generic default type argument?', ['A runtime fallback value', 'A fallback type used when T is not specified: <T = string>', 'The any type applied automatically', 'Only available in interfaces'], 1),
      q('2-4', 4, 'How does TypeScript determine T in a generic function call?', ['You must always specify it explicitly', 'It infers T from the type of the passed argument', 'It defaults to unknown', 'It uses the return type annotation'], 1),
    ],
  },
  {
    lessonId: '2-5',
    questions: [
      q('2-5', 1, 'What does Partial<T> produce?', ['A type where all properties of T are required', 'A type where all properties of T are optional', 'A copy of T with readonly properties', 'A union of all T property types'], 1),
      q('2-5', 2, 'Which utility type creates a new type with only selected properties?', ['Omit<T, K>', 'Required<T>', 'Pick<T, K>', 'Exclude<T, K>'], 2),
      q('2-5', 3, 'What does Record<string, number> describe?', ['A tuple of string and number', 'An object with string keys and number values', 'A function from string to number', 'An array of numbers'], 1),
      q('2-5', 4, 'How do you extract the return type of a function using built-in utility types?', ['Parameters<typeof fn>', 'ReturnType<typeof fn>', 'Awaited<typeof fn>', 'InstanceType<typeof fn>'], 1),
    ],
  },
  {
    lessonId: '2-6',
    questions: [
      q('2-6', 1, 'What does a type predicate function look like?', ['function isFoo(v: T): boolean', 'function isFoo(v: unknown): v is Foo', 'function isFoo(v: any): Foo | null', 'function isFoo(v: T): T extends Foo'], 1),
      q('2-6', 2, 'Which narrowing technique works with class instances?', ['typeof', 'in operator', 'instanceof', 'as const'], 2),
      q('2-6', 3, 'How does TypeScript narrow inside if (typeof x === "string")?', ['It casts x to string permanently', 'It treats x as string only within that branch', 'It throws if x is not a string', 'It only works at the top level'], 1),
      q('2-6', 4, 'What is the purpose of a discriminated union tag field?', ['To add metadata to objects at runtime', 'To give TypeScript a literal type it can use to narrow the union in conditionals', 'To enforce alphabetical ordering of properties', 'To enable JSON serialisation'], 1),
    ],
  },
  {
    lessonId: '2-7',
    questions: [
      q('2-7', 1, 'What does { [K in keyof T]: T[K] } produce?', ['A union of all T values', 'A mapped type that mirrors the shape of T', 'An array of T\'s keys', 'A partial copy of T'], 1),
      q('2-7', 2, 'What does -? do in a mapped type?', ['Removes readonly modifiers', 'Removes the optional modifier, making properties required', 'Removes the property entirely', 'Adds optional modifiers'], 1),
      q('2-7', 3, 'What does infer do inside a conditional type?', ['Casts a type at runtime', 'Extracts a type from a position in the conditional for use in the true branch', 'Forces a type to be inferred automatically', 'Removes type constraints'], 1),
      q('2-7', 4, 'The syntax T extends U ? X : Y is called:', ['A generic constraint', 'A mapped type', 'A conditional type', 'A discriminated union'], 2),
    ],
  },
  {
    lessonId: '2-8',
    questions: [
      q('2-8', 1, 'How do you type a click event handler on a button in React?', ['React.Event<HTMLButtonElement>', 'React.MouseEvent<HTMLButtonElement>', 'MouseEvent<Button>', 'React.ClickEvent'], 1),
      q('2-8', 2, 'How do you type a ref that will be attached to an <input>?', ['useRef<Element>(null)', 'useRef<HTMLInputElement>(null)', 'useRef<Input>(null)', 'useRef<any>(null)'], 1),
      q('2-8', 3, 'Which utility extracts the props of an existing component from outside?', ['ReturnType<typeof Comp>', 'InstanceType<typeof Comp>', 'ComponentProps<typeof Comp>', 'PropsOf<Comp>'], 2),
      q('2-8', 4, 'What type should you use for a form submit event?', ['React.InputEvent<HTMLFormElement>', 'React.FormEvent<HTMLFormElement>', 'React.SubmitEvent', 'Event<HTMLForm>'], 1),
    ],
  },

  // ── Course 3: State Management with Zustand ───────────────────────────────
  {
    lessonId: '3-1',
    questions: [
      q('3-1', 1, 'Does Zustand require a Provider component?', ['Yes — a ZustandProvider must wrap the app', 'No — the store lives outside the React tree', 'Yes — but only in development', 'Only when using TypeScript'], 1),
      q('3-1', 2, 'How does a component subscribe to only part of the store?', ['By importing the entire store', 'By using a selector function: useStore(state => state.count)', 'By wrapping with React.memo', 'By passing props from the parent'], 1),
      q('3-1', 3, 'What equality check does Zustand use by default?', ['Deep equality', 'JSON.stringify comparison', 'Referential (===) equality', 'Shallow equality'], 2),
      q('3-1', 4, 'Which middleware connects Zustand to Redux DevTools?', ['redux middleware', 'devtools middleware', 'logger middleware', 'persist middleware'], 1),
    ],
  },
  {
    lessonId: '3-2',
    questions: [
      q('3-2', 1, 'What does set() do in a Zustand store?', ['Replaces the entire state', 'Shallowly merges new values into the current state', 'Triggers a full app re-render', 'Persists state to localStorage'], 1),
      q('3-2', 2, 'When should you use the functional form of set?', ['Always, for performance', 'When the new state depends on the current state', 'Only for async actions', 'When using TypeScript'], 1),
      q('3-2', 3, 'What does get() give you inside a Zustand action?', ['A way to set state', 'The current state without subscribing to it', 'The previous state before the last update', 'A reference to the React component'], 1),
      q('3-2', 4, 'In Zustand, actions are:', ['Dispatched via a special dispatch function', 'Plain functions defined alongside state in the store creator', 'Separate from the store in a reducers file', 'Required to be async'], 1),
    ],
  },
  {
    lessonId: '3-3',
    questions: [
      q('3-3', 1, 'When does a component using a Zustand selector re-render?', ['On every store update', 'When the value returned by its selector changes', 'When any other component updates', 'Only when the component\'s props change'], 1),
      q('3-3', 2, 'Why is returning an object literal from a selector problematic?', ['TypeScript rejects it', 'It always creates a new reference, causing unnecessary re-renders', 'Zustand cannot serialise objects', 'It disables the devtools'], 1),
      q('3-3', 3, 'What does useShallow help with?', ['Deep cloning state', 'Shallow equality checks for object/array selectors to prevent over-renders', 'Persisting nested objects', 'Async state fetching'], 1),
      q('3-3', 4, 'Multiple selector calls in one component:', ['Cause performance issues', 'Are not supported', 'Each create an independent subscription and are perfectly fine', 'Must be combined into one selector'], 2),
    ],
  },
  {
    lessonId: '3-4',
    questions: [
      q('3-4', 1, 'What is the default storage backend for Zustand\'s persist middleware?', ['sessionStorage', 'IndexedDB', 'localStorage', 'A custom in-memory store'], 2),
      q('3-4', 2, 'What does the partialize option do in persist?', ['Compresses state before storing', 'Selects only specific fields to persist', 'Encrypts the stored data', 'Controls when hydration runs'], 1),
      q('3-4', 3, 'How does persist handle breaking schema changes across deploys?', ['It silently ignores old data', 'Via the version and migrate options', 'By clearing localStorage automatically', 'It does not support migrations'], 1),
      q('3-4', 4, 'A custom storage adapter for persist must implement:', ['read, write, delete', 'getItem, setItem, removeItem', 'load, save, clear', 'fetch, push, drop'], 1),
    ],
  },
  {
    lessonId: '3-5',
    questions: [
      q('3-5', 1, 'How do you set up initial state for a Zustand store in tests?', ['Re-create the store before each test', 'Call useStore.setState(initialState) directly', 'Wrap the test in a Provider', 'Import resetAllStores() from Zustand'], 1),
      q('3-5', 2, 'What order should middleware be applied in (persist + devtools)?', ['devtools first, then persist', 'persist first, then devtools — devtools wraps everything', 'Order does not matter', 'They cannot be combined'], 1),
      q('3-5', 3, 'Why should you reset Zustand state between tests?', ['To improve test performance', 'To prevent state from leaking and causing cross-test pollution', 'TypeScript requires it', 'The store throws if not reset'], 1),
      q('3-5', 4, 'Which of these is the recommended approach for testing a component that reads from a Zustand store?', ['Mock the entire Zustand library', 'Set the store state before rendering the component and assert its visible behaviour', 'Spy on every selector call', 'Wrap the component in a StoreProvider'], 1),
    ],
  },

  // ── Course 4: Tailwind CSS Mastery ────────────────────────────────────────
  {
    lessonId: '4-1',
    questions: [
      q('4-1', 1, 'What does "utility-first" mean in Tailwind CSS?', ['CSS is written in a utilities.css file', 'Styling is done by composing small, single-purpose classes in markup', 'Only utility methods from a JavaScript library are used', 'CSS Grid is the primary layout tool'], 1),
      q('4-1', 2, 'Which Tailwind v4 feature removes the need for tailwind.config.ts in basic usage?', ['The CLI tool', 'The @tailwindcss/vite plugin', 'PostCSS integration', 'The JIT compiler'], 1),
      q('4-1', 3, 'What problem does utility-first CSS solve?', ['Slow JavaScript execution', 'Growing, conflicting, and hard-to-delete CSS over time', 'Missing browser support for flexbox', 'TypeScript compilation errors'], 1),
      q('4-1', 4, 'Which of these is a valid Tailwind utility class?', ['font: bold', 'text-bold', 'font-bold', '.bold'], 2),
    ],
  },
  {
    lessonId: '4-2',
    questions: [
      q('4-2', 1, 'What does the sm: prefix in Tailwind mean?', ['Apply only on small screens (below 640px)', 'Apply at 640px and above', 'Apply only on mobile', 'Apply on screens smaller than md'], 1),
      q('4-2', 2, 'Tailwind\'s responsive design approach is:', ['Desktop-first — override for smaller screens', 'Mobile-first — add prefixes to override at larger breakpoints', 'Fixed breakpoints only', 'Container-query based by default'], 1),
      q('4-2', 3, 'Which class combination creates a responsive 3-column grid?', ['grid cols-3 lg:cols-1', 'grid grid-cols-1 lg:grid-cols-3', 'flex flex-3 lg:flex-1', 'columns-3 sm:columns-1'], 1),
      q('4-2', 4, 'What does container + mx-auto do?', ['Removes all padding', 'Centres content with a max-width constraint per breakpoint', 'Makes the element full-width', 'Applies a border to the container'], 1),
    ],
  },
  {
    lessonId: '4-3',
    questions: [
      q('4-3', 1, 'Which classes create a row with centred items and space between them?', ['flex items-center justify-between', 'grid center space-between', 'flex-row align-center justify-space', 'row items-middle'], 0),
      q('4-3', 2, 'What does flex-1 do to a flex child?', ['Makes it the first child', 'Allows it to grow and fill remaining space', 'Sets its flex-basis to 1px', 'Prevents it from shrinking'], 1),
      q('4-3', 3, 'How do you create a 3-column grid with a 1rem gap?', ['grid grid-cols-3 gap-4', 'flex flex-3 gap-1rem', 'columns-3 spacing-4', 'display-grid cols-3 gutter-4'], 0),
      q('4-3', 4, 'What does shrink-0 prevent?', ['The element from growing', 'The element from shrinking below its content size', 'The element from wrapping', 'The element from rendering'], 1),
    ],
  },
  {
    lessonId: '4-4',
    questions: [
      q('4-4', 1, 'How do you apply a text colour in Tailwind?', ['color-slate-700', 'text-slate-700', 'font-slate-700', 'c-slate-700'], 1),
      q('4-4', 2, 'Which variant applies styles in dark mode?', ['night:', 'dark:', 'theme-dark:', 'prefers-dark:'], 1),
      q('4-4', 3, 'How do you set a custom colour value not in the Tailwind palette?', ['custom-color="#ff5733"', 'text-custom-ff5733', 'text-[#ff5733]', 'color: ff5733'], 2),
      q('4-4', 4, 'Which class sets the largest default font weight?', ['font-heavy', 'font-bold', 'font-black', 'font-extrabold'], 2),
    ],
  },
  {
    lessonId: '4-5',
    questions: [
      q('4-5', 1, 'What is the base unit of Tailwind\'s spacing scale?', ['1px', '4px (0.25rem)', '8px', '16px'], 1),
      q('4-5', 2, 'What does p-4 equal in pixels (assuming default 16px root)?', ['4px', '8px', '16px', '32px'], 2),
      q('4-5', 3, 'How do you apply a custom height that is not in the scale?', ['height-[340px]', 'h-[340px]', 'size-340', 'h-custom-340'], 1),
      q('4-5', 4, 'What does mx-auto do on a block element with an explicit width?', ['Adds a horizontal margin of auto on one side', 'Centres it horizontally', 'Removes its horizontal margin', 'Sets its width to auto'], 1),
    ],
  },
  {
    lessonId: '4-6',
    questions: [
      q('4-6', 1, 'What directive maps CSS variables to Tailwind tokens in v4?', ['@config', '@theme', '@layer', '@apply'], 1),
      q('4-6', 2, 'Where do you define light-mode CSS variable values?', ['In tailwind.config.ts', 'In :root in your CSS file', 'In a .env file', 'In a theme.json file'], 1),
      q('4-6', 3, 'What does bg-primary resolve to when using CSS variable theming?', ['A hardcoded colour', 'The value of the --color-primary CSS variable', 'The browser\'s default blue', 'The first colour in the palette'], 1),
      q('4-6', 4, 'Which pattern does shadcn/ui use for its component colours?', ['Inline style attributes', 'JavaScript theme objects', 'CSS custom properties mapped via @theme', 'Class name overrides per component'], 2),
    ],
  },
  {
    lessonId: '4-7',
    questions: [
      q('4-7', 1, 'What does cva stand for?', ['Conditional Variant API', 'Class Variance Authority', 'Component Variant Abstraction', 'CSS Variable Automation'], 1),
      q('4-7', 2, 'What does the cn() utility do?', ['Generates random class names', 'Merges clsx and tailwind-merge to combine and deduplicate Tailwind classes', 'Validates Tailwind classes at runtime', 'Converts CSS to Tailwind classes'], 1),
      q('4-7', 3, 'What is the main benefit of using cva for component variants?', ['It removes all Tailwind classes from the markup', 'It enables a systematic, type-safe variant API while keeping classes co-located', 'It compiles variants to plain CSS at build time', 'It automatically generates dark mode variants'], 1),
      q('4-7', 4, 'Which library resolves conflicts when combining Tailwind class strings?', ['clsx', 'classnames', 'tailwind-merge', 'postcss'], 2),
    ],
  },
  {
    lessonId: '4-8',
    questions: [
      q('4-8', 1, 'Which class combination adds a smooth standard transition?', ['animate-smooth duration-200', 'transition-all duration-200 ease-in-out', 'motion-smooth 200ms', 'ease-all 200'], 1),
      q('4-8', 2, 'Where does tw-animate-css add named animations like zoom-in-90?', ['To the Tailwind config', 'As utility classes accessible via Tailwind', 'To a separate CSS animations file', 'Inline via JavaScript'], 1),
      q('4-8', 3, 'Which Tailwind variant applies styles only when the user has not requested reduced motion?', ['no-motion:', 'motion-reduce:', 'motion-safe:', 'prefers-motion:'], 2),
      q('4-8', 4, 'When should will-change-transform be used?', ['On all animated elements for performance', 'Sparingly — only on elements that animate frequently', 'Never — it is deprecated', 'Only on SVG elements'], 1),
    ],
  },
  {
    lessonId: '4-9',
    questions: [
      q('4-9', 1, 'Which classes create a visible keyboard focus ring on an input?', ['border-focus ring-2', 'focus:ring-2 focus:ring-ring', 'focus-visible ring ring-primary', 'focus:border-blue'], 1),
      q('4-9', 2, 'Which variant styles an input when its aria-invalid attribute is true?', ['invalid:', 'error:', 'aria-invalid:', 'input-invalid:'], 2),
      q('4-9', 3, 'How do you visually communicate a disabled button in Tailwind?', ['hide-disabled', 'disabled:opacity-50 disabled:cursor-not-allowed', 'cursor-disabled opacity-half', 'aria-disabled:hide'], 1),
      q('4-9', 4, 'Which CSS property do Tailwind\'s accent-color utilities control?', ['background-color', 'accent-color for native checkboxes and radio buttons', 'color', 'border-color'], 1),
    ],
  },
  {
    lessonId: '4-10',
    questions: [
      q('4-10', 1, 'How does Tailwind v4 know which classes to include in the production bundle?', ['You list them in a safelist', 'The Vite plugin scans source files and emits only used classes', 'All classes are always included', 'You run a separate purge command'], 1),
      q('4-10', 2, 'Why do dynamic class names built with template literals sometimes fail to be included?', ['Tailwind does not support template literals', 'Partial class names are not detected — only complete class strings are picked up', 'Tree-shaking removes them', 'They require a special plugin'], 1),
      q('4-10', 3, 'How do you force a class into the bundle when it is dynamically constructed?', ['Add it to a JavaScript array at the top of the file', 'Use @source inline or the safelist option', 'Import it from a CSS file', 'Use it at least once as a static string'], 1),
      q('4-10', 4, 'Are production Tailwind bundles larger or smaller than development bundles?', ['Larger — all classes are included in dev', 'Smaller — unused CSS is removed in production', 'The same size', 'Depends on the framework'], 1),
    ],
  },

  // ── Course 5: React Router in Depth ──────────────────────────────────────
  {
    lessonId: '5-1',
    questions: [
      q('5-1', 1, 'What is the recommended router creator for modern React Router apps?', ['createHashRouter', 'BrowserRouter', 'createBrowserRouter', 'createMemoryRouter'], 2),
      q('5-1', 2, 'What does RouterProvider do?', ['Renders a single route', 'Renders the router and manages all navigation logic', 'Wraps the router config in a Provider', 'Handles auth state'], 1),
      q('5-1', 3, 'Where does the router store its state?', ['Inside a React component\'s useState', 'Outside the React tree — it is a plain JavaScript object', 'In localStorage', 'In a Redux store'], 1),
      q('5-1', 4, 'Each route in a config array needs:', ['A component and a loader', 'A path and an element', 'A key and a component', 'A guard and a redirect'], 1),
    ],
  },
  {
    lessonId: '5-2',
    questions: [
      q('5-2', 1, 'What does <Outlet /> render?', ['A portal to a different DOM node', 'The matched child route\'s element', 'A loading spinner', 'The parent route\'s element'], 1),
      q('5-2', 2, 'How do you define nested routes in the config?', ['Using the nested property', 'Using the children array on the parent route', 'Using a flat list with parent IDs', 'Using React.cloneElement'], 1),
      q('5-2', 3, 'What is an index route?', ['A route at /index', 'A child route that renders at the parent\'s exact path', 'The first route in the config', 'A fallback 404 route'], 1),
      q('5-2', 4, 'How many levels of nesting are supported in React Router?', ['Two', 'Three', 'Unlimited — each level needs its own Outlet', 'One'], 2),
    ],
  },
  {
    lessonId: '5-3',
    questions: [
      q('5-3', 1, 'What does <Link to="/about"> render in the DOM?', ['A button element', 'An anchor <a> tag that navigates without a full page reload', 'A div with an onClick handler', 'A router-managed div'], 1),
      q('5-3', 2, 'What makes NavLink different from Link?', ['NavLink works only for absolute paths', 'NavLink provides an isActive flag for adding active styles', 'NavLink renders a button instead of an anchor', 'NavLink prevents navigating to the current page'], 1),
      q('5-3', 3, 'How do you navigate imperatively after a form submission?', ['window.location.href = "/path"', 'useNavigate() returns a navigate function', 'ReactRouter.go("/path")', 'Link.navigate("/path")'], 1),
      q('5-3', 4, 'What does navigate("/path", { replace: true }) do?', ['Navigates and adds a new history entry', 'Navigates and replaces the current history entry', 'Navigates back then forward', 'Navigates to an external URL'], 1),
    ],
  },
  {
    lessonId: '5-4',
    questions: [
      q('5-4', 1, 'How do you read the :courseId segment from the URL?', ['useParams().courseId', 'useRoute().params.courseId', 'usePathname().courseId', 'useDynamicSegment("courseId")'], 0),
      q('5-4', 2, 'What does useSearchParams return?', ['The current pathname', '[searchParams, setSearchParams] — similar to useState', 'An object of all URL params', 'The query string as a raw string'], 1),
      q('5-4', 3, 'Why should you always validate URL params?', ['TypeScript requires it', 'They are user-controlled strings and may not match your data', 'React Router throws without validation', 'To improve SEO'], 1),
      q('5-4', 4, 'What is a good use case for search params?', ['Storing auth tokens', 'Keeping filter, sort, and page state that should be bookmarkable', 'Replacing useState completely', 'Passing data between unrelated routes'], 1),
    ],
  },
  {
    lessonId: '5-5',
    questions: [
      q('5-5', 1, 'How is a route guard implemented in React Router?', ['By adding a guard prop to the route config', 'As a wrapper layout component that checks a condition and redirects or renders Outlet', 'Using the beforeEnter lifecycle hook', 'With a middleware function'], 1),
      q('5-5', 2, 'How do you pass the intended destination to the login page for a post-auth redirect?', ['Via a URL query param', 'Via location.state: <Navigate to="/login" state={{ from: location }} />', 'Via localStorage', 'Via a global variable'], 1),
      q('5-5', 3, 'After a successful login, how do you redirect to the intended destination?', ['window.history.back()', 'navigate(location.state.from, { replace: true })', 'useRedirect(location.state.from)', 'Link.push(from)'], 1),
      q('5-5', 4, 'Why separate guards for different access levels (auth, subscribed, admin)?', ['React Router requires it', 'To keep each guard focused on a single responsibility', 'To reduce component re-renders', 'To avoid TypeScript errors'], 1),
    ],
  },
  {
    lessonId: '5-6',
    questions: [
      q('5-6', 1, 'What does a loader function receive?', ['The component props', '{ params, request } — the route params and the fetch Request object', 'The Zustand store', 'The previous route\'s data'], 1),
      q('5-6', 2, 'How do you access loader data inside a route component?', ['props.loaderData', 'useLoaderData()', 'useRouteData()', 'const data = await loader()'], 1),
      q('5-6', 3, 'Do loaders for nested routes run in parallel or sequentially?', ['Sequentially — children wait for ancestors', 'In parallel — each matched route\'s loader runs simultaneously', 'Only the deepest loader runs', 'Only the root loader runs'], 1),
      q('5-6', 4, 'Loaders eliminate the need for:', ['useState', 'useEffect + fetch for initial route data loading states', 'TypeScript interfaces', 'React.memo'], 1),
    ],
  },
  {
    lessonId: '5-7',
    questions: [
      q('5-7', 1, 'How do you add a route-level error boundary in React Router?', ['Wrap the route in <ErrorBoundary>', 'Add errorElement: <ErrorPage /> to the route config', 'Use try/catch inside the component', 'Add onError to RouterProvider'], 1),
      q('5-7', 2, 'What does useRouteError() return?', ['The nearest parent route', 'The caught error in a route error boundary', 'The failed loader\'s URL', 'A boolean indicating if an error occurred'], 1),
      q('5-7', 3, 'How do you handle unmatched URLs (404) in React Router?', ['Add a notFound prop to RouterProvider', 'Add a route with path: "*" at the end of the config', 'Use a fallback prop on BrowserRouter', 'React Router handles 404s automatically'], 1),
      q('5-7', 4, 'Route error boundaries do NOT catch:', ['Errors thrown in loaders', 'Errors thrown during render', 'Errors thrown in event handlers', 'Errors thrown in actions'], 2),
    ],
  },

  // ── Course 6: Testing React Applications ─────────────────────────────────
  {
    lessonId: '6-1',
    questions: [
      q('6-1', 1, 'What are the three layers of the testing pyramid from bottom to top?', ['E2E, Integration, Unit', 'Unit, Integration, E2E', 'Snapshot, Visual, E2E', 'Component, Page, System'], 1),
      q('6-1', 2, 'Which type of test is typically the slowest to run?', ['Unit tests', 'Integration tests', 'End-to-end tests', 'Snapshot tests'], 2),
      q('6-1', 3, 'What does "test behaviour, not implementation" mean?', ['Only test event handlers', 'Tests should survive refactors — focus on what the user sees and does', 'Never mock anything', 'Only use snapshot tests'], 1),
      q('6-1', 4, 'In a React app, which test type typically delivers the highest value?', ['Unit tests for individual utilities', 'Component integration tests', 'Full E2E tests', 'Visual regression tests'], 1),
    ],
  },
  {
    lessonId: '6-2',
    questions: [
      q('6-2', 1, 'Why is Vitest fast in a Vite project?', ['It skips TypeScript checking', 'It reuses the Vite config and transform pipeline, avoiding double setup', 'It only runs changed files', 'It runs tests in a web worker'], 1),
      q('6-2', 2, 'Which option makes describe, test, and expect available without imports in Vitest?', ['autoImport: true', 'globals: true', 'inject: true', 'noImports: true'], 1),
      q('6-2', 3, 'How do you generate a test coverage report with Vitest?', ['vitest --report', 'vitest --coverage', 'vitest coverage run', 'vitest --stats'], 1),
      q('6-2', 4, 'What is the basic shape of a Vitest test?', ['describe("x", fn) + assert(value)', 'test("x", () => expect(value).toBe(expected))', 'it("x").assert(value).equals(expected)', 'check("x", value, expected)'], 1),
    ],
  },
  {
    lessonId: '6-3',
    questions: [
      q('6-3', 1, 'What is the preferred React Testing Library query?', ['getByTestId', 'getByClassName', 'getByRole', 'getBySelector'], 2),
      q('6-3', 2, 'Why should you avoid getByTestId?', ['It is deprecated', 'It leaks implementation details into tests and does not test accessibility', 'It only works in Enzyme', 'It is too slow'], 1),
      q('6-3', 3, 'Which query finds an input element associated with a label?', ['getByInput', 'getByLabel', 'getByLabelText', 'getByFormField'], 2),
      q('6-3', 4, 'React Testing Library\'s philosophy is to query the DOM:', ['The way the developer wrote it', 'The way a user perceives it — by role, label, and visible text', 'By CSS class names', 'By component name'], 1),
    ],
  },
  {
    lessonId: '6-4',
    questions: [
      q('6-4', 1, 'Why is userEvent preferred over fireEvent?', ['fireEvent is deprecated', 'userEvent simulates realistic event chains (keydown, keyup, input) not just single events', 'userEvent is faster', 'fireEvent does not work with async code'], 1),
      q('6-4', 2, 'How do you initialise userEvent in a test?', ['import userEvent from "@testing-library/user-event"', 'const user = userEvent.setup()', 'userEvent.init()', 'setupUserEvent()'], 1),
      q('6-4', 3, 'How do you assert on something that updates asynchronously?', ['Use expect().eventually()', 'Use waitFor(() => expect(...))', 'Use async expect()', 'Use setTimeout inside the test'], 1),
      q('6-4', 4, 'Which call simulates typing "hello" character by character?', ['fireEvent.type(input, "hello")', 'await user.type(input, "hello")', 'input.value = "hello"', 'user.setValue(input, "hello")'], 1),
    ],
  },
  {
    lessonId: '6-5',
    questions: [
      q('6-5', 1, 'What does vi.mock("./api") do?', ['Logs all calls to ./api', 'Replaces the ./api module with an auto-mock for the test file', 'Imports ./api in a sandboxed context', 'Deletes the ./api module from disk'], 1),
      q('6-5', 2, 'How do you make a mock function return a specific value?', ['mock.return = value', 'mockReturnValue(value) on the spy', 'vi.returns(mock, value)', 'mock.value = value'], 1),
      q('6-5', 3, 'What does vi.clearAllMocks() do in beforeEach?', ['Deletes all mock implementations', 'Resets call history and return values to prevent cross-test pollution', 'Removes all vi.mock calls', 'Clears the test console'], 1),
      q('6-5', 4, 'How do you spy on an existing method without replacing the module?', ['vi.mock(obj, "method")', 'vi.spyOn(obj, "method")', 'vi.watch(obj.method)', 'spy(obj, "method")'], 1),
    ],
  },
  {
    lessonId: '6-6',
    questions: [
      q('6-6', 1, 'How do you access the return value of a hook rendered with renderHook?', ['hook.state', 'result.current', 'hook.result', 'rendered.value'], 1),
      q('6-6', 2, 'What does act() do when wrapping a state update in a test?', ['It makes the test asynchronous', 'It batches React state updates so assertions see the settled state', 'It mocks React\'s scheduler', 'It renders the component fresh'], 1),
      q('6-6', 3, 'How do you simulate a prop change when using renderHook?', ['hook.update({ newProp })', 'rerender({ newProp: value })', 'renderHook({ newProp })', 'hook.setProps({ newProp })'], 1),
      q('6-6', 4, 'How do you provide context to a hook under test?', ['Wrap the assertion in a context check', 'Pass a wrapper component to renderHook', 'Import the context directly in the test', 'Use vi.mock to mock the context'], 1),
    ],
  },
  {
    lessonId: '6-7',
    questions: [
      q('6-7', 1, 'Which router wrapper is recommended for testing React Router components?', ['BrowserRouter', 'HashRouter', 'MemoryRouter', 'StaticRouter'], 2),
      q('6-7', 2, 'How do you set the initial URL in a MemoryRouter?', ['MemoryRouter url="/path"', 'MemoryRouter initialEntries={["/path"]}', 'MemoryRouter defaultPath="/path"', 'MemoryRouter startAt="/path"'], 1),
      q('6-7', 3, 'What does createMemoryRouter enable for testing?', ['Hash-based URL testing', 'Testing loader and action data router flows', 'Server-side rendering tests', 'Visual regression testing'], 1),
      q('6-7', 4, 'How should you assert navigation happened in a test?', ['Check window.location.href', 'Assert what was rendered as a result of navigation', 'Check router.currentRoute', 'Spy on history.push'], 1),
    ],
  },
  {
    lessonId: '6-8',
    questions: [
      q('6-8', 1, 'Why can Zustand store state leak between tests?', ['Zustand re-creates stores between tests', 'Zustand stores are global singletons that persist across test runs', 'vi.mock does not work with Zustand', 'Tests share a single React tree'], 1),
      q('6-8', 2, 'What is the simplest way to reset Zustand state before each test?', ['Re-create the store in beforeEach', 'Call useStore.setState(initialState) in beforeEach', 'Import resetAllStores from Zustand', 'Wrap each test in a new ZustandProvider'], 1),
      q('6-8', 3, 'When is it appropriate to mock the entire Zustand store module?', ['Always — it is the correct approach', 'When a component only reads from the store and you want to control the read value', 'Never — always use the real store', 'When the store uses the persist middleware'], 1),
      q('6-8', 4, 'What should you prefer asserting in a Zustand + component test?', ['The internal store state after each action', 'The visible component behaviour (rendered text, elements) driven by store state', 'The number of selector calls', 'The store\'s setState call count'], 1),
    ],
  },
  {
    lessonId: '6-9',
    questions: [
      q('6-9', 1, 'What does toMatchSnapshot() do the first time it runs?', ['Fails the test', 'Creates a snapshot file with the current rendered output', 'Compares against an existing snapshot', 'Takes a screenshot'], 1),
      q('6-9', 2, 'How do you update snapshots when a UI change is intentional?', ['Delete the __snapshots__ folder', 'Run vitest --update-snapshots', 'Change the test assertion', 'Mark the test as skipped'], 1),
      q('6-9', 3, 'When are snapshot tests most appropriate?', ['As the primary testing strategy', 'For preventing accidental regressions in stable, infrequently-changing components', 'For testing user interactions', 'For testing async data fetching'], 1),
      q('6-9', 4, 'What does Storybook + Chromatic provide?', ['Unit test coverage', 'Visual snapshot testing at the component level', 'E2E browser testing', 'Performance benchmarking'], 1),
    ],
  },
]

