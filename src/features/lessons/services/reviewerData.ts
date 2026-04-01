import type { ReviewerContent } from '../types'

export const REVIEWER_CONTENT: Record<string, ReviewerContent> = {
  // ── Course 1: React Fundamentals ──────────────────────────────────────────
  '1-1': {
    summary: 'JSX is syntactic sugar over React.createElement. Babel transforms it at build time, producing a description of the UI — not real DOM nodes. React then reconciles this virtual tree with the actual DOM, applying only the minimal set of changes needed.',
    keyPoints: [
      'JSX expressions must have a single root element — use <></> fragments to avoid extra DOM nodes.',
      'The virtual DOM is a plain JavaScript object tree; diffing it is cheaper than touching the real DOM.',
      'JavaScript expressions inside JSX are wrapped in curly braces; statements are not allowed.',
      'class becomes className, for becomes htmlFor — JSX maps to DOM property names, not HTML attributes.',
    ],
  },
  '1-2': {
    summary: 'Components are the building blocks of a React UI. Props are read-only inputs that flow from parent to child. TypeScript interfaces let you document and enforce the contract a component expects from its callers.',
    keyPoints: [
      'A component is just a function that accepts props and returns JSX.',
      'Props are immutable inside the component — never mutate them directly.',
      'Use interface or type to describe the props shape and get autocomplete + type safety.',
      'Default prop values can be set with destructuring defaults: function Btn({ size = "md" }).',
    ],
  },
  '1-3': {
    summary: 'useState stores values that change over time and triggers a re-render when updated. State updates are asynchronous and batched. Always use the functional updater form when the new value depends on the previous one.',
    keyPoints: [
      'const [value, setValue] = useState(initialValue) — the setter replaces, not merges, for primitives.',
      'Never mutate state directly (e.g. push to an array); always produce a new reference.',
      'Use the functional form setValue(prev => prev + 1) to avoid stale closure bugs.',
      'State is local to each component instance — siblings do not share it automatically.',
    ],
  },
  '1-4': {
    summary: 'useEffect synchronises a component with an external system (APIs, timers, subscriptions). The cleanup function prevents memory leaks. The dependency array controls when the effect re-runs.',
    keyPoints: [
      'An empty dependency array [] means the effect runs once after the initial render.',
      'Return a cleanup function to cancel subscriptions, clear timers, or abort fetches.',
      'Every reactive value used inside the effect must be listed in the dependency array.',
      'In Strict Mode, effects run twice in development to surface missing cleanup.',
    ],
  },
  '1-5': {
    summary: 'React wraps native events in SyntheticEvent, a cross-browser normalised wrapper. Controlled inputs keep the form value in state, making React the single source of truth for all input data.',
    keyPoints: [
      'Pass event handlers as props: onClick={handleClick} — no parentheses, just a reference.',
      'Call e.preventDefault() to stop default browser behaviour (e.g. form submission reload).',
      'A controlled input ties value to state and onChange to a setter.',
      'Uncontrolled inputs use refs and are suitable for file inputs or third-party DOM libraries.',
    ],
  },
  '1-6': {
    summary: 'React lets you conditionally render JSX using standard JavaScript expressions. Choose the pattern that best communicates intent — ternaries for if/else, && for simple flags, and early returns for complex guards.',
    keyPoints: [
      'Ternary: {isLoading ? <Spinner /> : <Content />} — use for mutually exclusive states.',
      'Short-circuit: {hasError && <ErrorBanner />} — but be careful with 0, which renders as "0".',
      'Early returns at the top of a component keep the main render path clean.',
      'null, undefined, and false render nothing — use them to hide elements without removing from the tree.',
    ],
  },
  '1-7': {
    summary: 'Rendering a list requires mapping data to JSX and providing stable, unique key props. Keys help React identify which items changed, were added, or were removed — they are critical to correct reconciliation.',
    keyPoints: [
      'Keys must be unique among siblings, not globally unique.',
      'Avoid using array indexes as keys when items can reorder or be removed.',
      'Keys are not passed as props — the component cannot read its own key.',
      'Stable IDs from your data (e.g. item.id) are always the best choice for keys.',
    ],
  },
  '1-8': {
    summary: 'Composition lets you build complex UIs from simple, single-responsibility components. The children prop and the compound component pattern are the two most common techniques for creating flexible component APIs.',
    keyPoints: [
      'children is just a prop — components do not need to know what they render.',
      'Compound components share implicit state through React Context to coordinate related parts.',
      'Prefer composition over configuration: pass components as props instead of boolean flags.',
      'Render props are a legacy pattern; custom hooks usually express the same logic more cleanly.',
    ],
  },
  '1-9': {
    summary: 'useRef gives you a mutable object whose .current property persists for the full lifetime of the component without causing re-renders when changed. It is the right tool for DOM access, timers, and previous-value tracking.',
    keyPoints: [
      'Attach a ref to a DOM element with the ref prop: <input ref={inputRef} />.',
      'Access the element imperatively: inputRef.current.focus().',
      'Refs do not trigger re-renders — use state if you need the UI to respond to the change.',
      'Store interval IDs and previous values in refs to keep them stable across renders.',
    ],
  },
  '1-10': {
    summary: 'Context provides a way to share values through the component tree without explicit prop drilling. It is best suited for low-frequency updates (themes, locale, auth state) — high-frequency updates belong in a dedicated state library.',
    keyPoints: [
      'Create a context with createContext, provide it with <Context.Provider value={...}>.',
      'Consume with useContext(MyContext) — the component re-renders when the value changes.',
      'Splitting contexts by update frequency avoids unnecessary re-renders.',
      'Context does not replace state management; it is a delivery mechanism, not a store.',
    ],
  },
  '1-11': {
    summary: 'Custom hooks extract stateful logic into reusable functions. They follow the same rules as built-in hooks and compose naturally. A good custom hook has a single responsibility and a name that communicates its purpose.',
    keyPoints: [
      'Custom hooks must start with "use" so React can enforce the rules of hooks.',
      'They can call other hooks — including other custom hooks — freely.',
      'Return only what the consumer needs; do not expose internal implementation details.',
      'Custom hooks are the idiomatic replacement for higher-order components and render props.',
    ],
  },
  '1-12': {
    summary: 'Performance optimisation in React starts with measurement. React.memo, useMemo, and useCallback prevent unnecessary work — but they themselves have a cost and should only be applied where profiling shows a genuine bottleneck.',
    keyPoints: [
      'React.memo wraps a component and skips re-renders if props have not shallowly changed.',
      'useMemo caches a computed value; useCallback caches a function reference.',
      'The React DevTools Profiler shows which components render and how long they take.',
      'Optimise last — premature optimisation adds complexity without guaranteed benefit.',
    ],
  },

  // ── Course 2: TypeScript Deep Dive ────────────────────────────────────────
  '2-1': {
    summary: 'TypeScript infers types from context — you rarely need to annotate everything. Explicit annotations are most valuable at function boundaries (parameters and return types) where inference cannot cross the boundary.',
    keyPoints: [
      'TypeScript infers the type of a variable from its initial value.',
      'Annotate function parameters explicitly; return types are often inferred.',
      'Prefer const for values that do not change — it gives TypeScript more to work with.',
      'any disables type checking; prefer unknown for values of truly unknown shape.',
    ],
  },
  '2-2': {
    summary: 'Interfaces and type aliases are largely interchangeable for object shapes. Interfaces support declaration merging and are slightly preferred for public API contracts. Type aliases are more powerful for union types and mapped types.',
    keyPoints: [
      'Interfaces can be extended with extends; type aliases use & intersection.',
      'Only interfaces support declaration merging — useful for augmenting library types.',
      'Type aliases can describe unions, tuples, and primitives — interfaces cannot.',
      'Pick one convention per project and be consistent.',
    ],
  },
  '2-3': {
    summary: 'Union types model values that can be one of several types, while intersection types combine multiple types into one. Discriminated unions add a literal-type tag that TypeScript uses to narrow inside conditionals.',
    keyPoints: [
      'Union: string | number — the value is one or the other.',
      'Intersection: A & B — the value must satisfy both shapes simultaneously.',
      'A discriminated union has a shared literal field (e.g. kind: "circle" | "square").',
      'TypeScript narrows a union inside an if/switch based on the discriminant.',
    ],
  },
  '2-4': {
    summary: 'Generics let you write code that works for many types while preserving type information. Constraints (extends) limit what types are accepted. Generic functions infer their type arguments from the values you pass.',
    keyPoints: [
      'function identity<T>(value: T): T — T is inferred from the argument.',
      'Constraints: <T extends object> means T must be an object type.',
      'Generic interfaces and classes parameterise entire data structures (e.g. Stack<T>).',
      'Default type arguments: <T = string> provide a fallback when T is not specified.',
    ],
  },
  '2-5': {
    summary: 'TypeScript ships with utility types that transform existing types — saving you from writing repetitive mapped types by hand. Knowing the built-in set is essential for productive TypeScript work.',
    keyPoints: [
      'Partial<T> makes all properties optional; Required<T> makes them all required.',
      'Pick<T, K> and Omit<T, K> select or exclude specific properties.',
      'Record<K, V> constructs an object type with keys K and values V.',
      'ReturnType<typeof fn> extracts the return type of a function.',
    ],
  },
  '2-6': {
    summary: 'TypeScript narrows union types inside conditional branches automatically. You can teach it to narrow with custom type predicates and discriminated unions, enabling safe access to type-specific properties.',
    keyPoints: [
      'typeof narrows primitives: if (typeof x === "string").',
      'instanceof narrows class instances: if (x instanceof Date).',
      'Type predicates: function isString(v: unknown): v is string { return typeof v === "string"; }.',
      'Discriminated unions narrow based on a shared literal-type field.',
    ],
  },
  '2-7': {
    summary: 'Mapped types iterate over the keys of a type to produce a new type. Conditional types select between two types based on a condition. Together they power the entire built-in utility type library.',
    keyPoints: [
      'Mapped type syntax: { [K in keyof T]: T[K] } mirrors the original shape.',
      'Add or remove modifiers: +readonly, -readonly, +?, -?.',
      'Conditional type: T extends U ? X : Y — evaluated per union member.',
      'infer extracts a type from within a conditional type: infer R in Promise<infer R>.',
    ],
  },
  '2-8': {
    summary: 'Typing React correctly with TypeScript eliminates whole categories of runtime errors. Key areas are component props, event handler types, hook return types, and ref generics.',
    keyPoints: [
      'Component props: React.FC is optional — typing the function directly is equally valid.',
      'Event types: React.ChangeEvent<HTMLInputElement>, React.FormEvent<HTMLFormElement>.',
      'useRef: useRef<HTMLInputElement>(null) — the generic matches the attached element.',
      'Use ComponentProps<typeof Comp> to extract a component\'s prop types from outside.',
    ],
  },

  // ── Course 3: State Management with Zustand ───────────────────────────────
  '3-1': {
    summary: 'Zustand is a minimal state management library built on React hooks. Its API surface is tiny compared to Redux, and it avoids the boilerplate of Context + useReducer while still enabling fine-grained subscriptions.',
    keyPoints: [
      'No Provider required — the store lives outside the React tree.',
      'Components subscribe to slices of state via selector functions.',
      'Zustand uses referential equality by default — selectors should return stable values.',
      'The devtools middleware connects to Redux DevTools for time-travel debugging.',
    ],
  },
  '3-2': {
    summary: 'A Zustand store is created by calling create() with a function that receives set and get. State and actions live in the same object. set performs a shallow merge by default.',
    keyPoints: [
      'set({ key: value }) merges the new values into the current state shallowly.',
      'set(state => ({ count: state.count + 1 })) uses the functional form to read current state.',
      'get() reads the current state from inside an action without subscribing.',
      'Actions are just functions — no action creators, reducers, or dispatch calls needed.',
    ],
  },
  '3-3': {
    summary: 'Selectors extract a slice of store state and are the primary tool for preventing unnecessary re-renders. A component only re-renders when the value returned by its selector changes.',
    keyPoints: [
      'useStore(state => state.count) — the component re-renders only when count changes.',
      'Return primitives from selectors when possible — object literals always fail equality.',
      'For derived state, combine useShallow or compute outside the selector.',
      'Multiple selectors in one component are fine — each creates an independent subscription.',
    ],
  },
  '3-4': {
    summary: 'The persist middleware serialises store state to a storage backend (localStorage by default) and rehydrates it on page load. partialize lets you persist only the fields you care about.',
    keyPoints: [
      'Wrap the store creator with persist(fn, { name: "my-store" }).',
      'partialize: state => ({ user: state.user }) persists only selected fields.',
      'The storage option accepts any object with getItem, setItem, and removeItem.',
      'Version and migrate options handle schema changes across deploys.',
    ],
  },
  '3-5': {
    summary: 'Zustand stores are plain functions, making them easy to test. The devtools middleware integrates with the Redux DevTools extension. Resetting state between tests prevents cross-test pollution.',
    keyPoints: [
      'Call the store\'s setState directly in tests to set up initial conditions.',
      'Use the devtools middleware second (after persist) so it wraps the whole store.',
      'Reset state between tests with a resetStore action or by re-creating the store.',
      'The Zustand TypeScript types are strict — test files benefit from the same type coverage.',
    ],
  },

  // ── Course 4: Tailwind CSS Mastery ────────────────────────────────────────
  '4-1': {
    summary: 'Tailwind\'s utility-first approach means styling by composing small, single-purpose classes directly in markup. This eliminates the overhead of naming things and prevents CSS from growing unbounded over time.',
    keyPoints: [
      'Each class does one thing: text-sm sets font size, font-bold sets weight.',
      'No custom CSS means no specificity conflicts and no dead code.',
      'Co-locating styles with markup makes it obvious what a component looks like.',
      'Tailwind v4 uses a Vite plugin — no tailwind.config.ts required for basic use.',
    ],
  },
  '4-2': {
    summary: 'Tailwind\'s responsive prefixes apply styles at and above a given breakpoint. The default scale is mobile-first: unprefixed utilities apply everywhere, prefixed ones override at larger sizes.',
    keyPoints: [
      'Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px).',
      'Mobile-first: write base styles first, then add prefixes for larger screens.',
      'container + mx-auto centres content with max-width constraints per breakpoint.',
      'Responsive grid: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3.',
    ],
  },
  '4-3': {
    summary: 'Tailwind provides a complete set of Flexbox and CSS Grid utilities that map directly to their CSS properties. Combining them covers virtually every layout need without writing a single line of custom CSS.',
    keyPoints: [
      'flex, items-center, justify-between — the most common flex combo for navbars.',
      'grid grid-cols-3 gap-4 — creates a 3-column grid with a 1rem gap.',
      'gap replaces the old row-gap + column-gap; use gap-x and gap-y to set each independently.',
      'flex-1 lets an element grow to fill remaining space; shrink-0 prevents shrinking.',
    ],
  },
  '4-4': {
    summary: 'Tailwind\'s typography and colour utilities map to a carefully designed scale. The dark: variant applies styles when the user prefers dark mode, and CSS variables enable dynamic theming.',
    keyPoints: [
      'Text scale: text-xs through text-9xl; weights: font-light through font-black.',
      'Colour format: text-slate-700, bg-emerald-500 — palette name + shade (50–950).',
      'dark:bg-gray-900 applies only when the OS or document is in dark mode.',
      'Arbitrary values: text-[#ff5733] escape the scale when you need a specific value.',
    ],
  },
  '4-5': {
    summary: 'Tailwind\'s spacing scale is based on a 4px (0.25rem) unit. All margin, padding, width, and height utilities share this scale, creating a harmonious visual rhythm across the UI.',
    keyPoints: [
      'p-4 = 1rem (16px); p-0.5 = 0.125rem (2px); the scale is non-linear at the top.',
      'mx-auto centres a block element horizontally when it has an explicit width.',
      'w-full = 100%; w-screen = 100vw; max-w-sm/md/lg/xl/2xl = preset max widths.',
      'Arbitrary sizing: w-[340px], h-[calc(100vh-64px)].',
    ],
  },
  '4-6': {
    summary: 'Tailwind v4 uses CSS custom properties for theming via the @theme directive. This replaces the JavaScript config and enables runtime theme switching with zero JavaScript.',
    keyPoints: [
      '@theme inline maps CSS variables to Tailwind tokens (--color-primary → bg-primary).',
      'Define variables in :root for light mode and .dark or @media (prefers-color-scheme: dark) for dark.',
      'shadcn/ui uses this pattern — all component colours are driven by CSS variables.',
      'Custom properties cascade like any CSS — child elements inherit and can override.',
    ],
  },
  '4-7': {
    summary: 'Extracting component variants with cva (class-variance-authority) keeps utility classes co-located while enabling systematic variant APIs — the same approach used by shadcn/ui components.',
    keyPoints: [
      'cva("base classes", { variants: { size: { sm: "...", lg: "..." } } }) defines a variant map.',
      'Call the returned function with the desired variant to get the class string.',
      'cn (clsx + twMerge) resolves conflicts when combining cva output with extra classes.',
      'Variant types are inferred automatically — no need to write them by hand.',
    ],
  },
  '4-8': {
    summary: 'Tailwind\'s transition and animation utilities add motion with minimal markup. For more complex keyframe animations, tw-animate-css provides a ready-to-use library of named animations.',
    keyPoints: [
      'transition-all duration-200 ease-in-out — the standard smooth transition combo.',
      'hover:scale-105 animate-in and zoom-in-90 come from tw-animate-css.',
      'Use will-change-transform sparingly — only on elements that animate frequently.',
      'Respect prefers-reduced-motion — Tailwind has motion-safe: and motion-reduce: variants.',
    ],
  },
  '4-9': {
    summary: 'Tailwind makes it possible to style accessible, production-ready form controls without leaving utility classes. Focus states, error states, and disabled states each have dedicated variant prefixes.',
    keyPoints: [
      'focus:ring-2 focus:ring-ring creates a visible keyboard focus indicator.',
      'aria-invalid:border-destructive styles invalid inputs based on ARIA state.',
      'disabled:opacity-50 disabled:cursor-not-allowed communicates disabled state visually.',
      'Use accent-color utilities to style native checkboxes and radio buttons.',
    ],
  },
  '4-10': {
    summary: 'Tailwind v4 with the Vite plugin produces an optimised CSS bundle automatically — only the classes used in your source files are emitted. There is no separate purge configuration step.',
    keyPoints: [
      'The @tailwindcss/vite plugin scans your source files and emits only used classes.',
      'Dynamic class names (template literals) must be complete strings — partial class names are not detected.',
      'Safelist specific classes with @source inline in CSS or via the safelist option.',
      'Production builds are smaller than dev builds — unused CSS is removed by default.',
    ],
  },

  // ── Course 5: React Router in Depth ──────────────────────────────────────
  '5-1': {
    summary: 'React Router v6+ uses a component-based, declarative API. createBrowserRouter is the recommended entry point for modern apps as it enables the data router features (loaders, actions, error boundaries).',
    keyPoints: [
      'createBrowserRouter takes a route config array and returns a router instance.',
      'RouterProvider renders the router and handles all navigation logic.',
      'Each route has a path and an element; the element is rendered when the path matches.',
      'The router lives outside the React tree — state changes trigger renders via context.',
    ],
  },
  '5-2': {
    summary: 'Nested routes allow child routes to render inside a parent layout. The parent renders an Outlet where the matched child element will appear. This pattern enables persistent layouts with swappable content areas.',
    keyPoints: [
      'Place <Outlet /> in the parent component where child routes should render.',
      'The children array on a route config defines its nested routes.',
      'The index route (index: true) renders at the parent\'s exact path with no extra segment.',
      'Multiple levels of nesting are supported — each level needs its own Outlet.',
    ],
  },
  '5-3': {
    summary: 'Link renders an <a> tag that navigates without a full page reload. NavLink adds active styling. useNavigate provides imperative navigation for programmatic redirects after actions like form submission.',
    keyPoints: [
      'Link to="/path" navigates on click; to="../" navigates relative to the current route.',
      'NavLink receives an isActive boolean in its className and style functions.',
      'useNavigate() returns a navigate function: navigate("/path") or navigate(-1) to go back.',
      'The replace option replaces the current history entry instead of pushing a new one.',
    ],
  },
  '5-4': {
    summary: 'URL parameters are dynamic segments in the path (e.g. :id). Search parameters are key-value pairs in the query string. Both are read with dedicated hooks and are part of the URL — bookmarkable and shareable.',
    keyPoints: [
      'useParams() returns an object with all matched URL params.',
      'useSearchParams() returns [searchParams, setSearchParams] — similar to useState.',
      'Always validate params — they are user-controlled strings and may not match your data.',
      'Search params persist across navigation; use them for filter/sort/page state.',
    ],
  },
  '5-5': {
    summary: 'Route guards are wrapper components that check a condition and either render an Outlet (pass) or redirect with Navigate (fail). Storing the intended destination in location.state enables post-auth redirects.',
    keyPoints: [
      'A guard wraps protected routes in the route config as a layout route with no path.',
      'Navigate to="/login" state={{ from: location }} passes the intended destination.',
      'After login, read location.state.from and redirect there with replace.',
      'Separate guards for different access levels (auth, subscribed, admin) keep each focused.',
    ],
  },
  '5-6': {
    summary: 'Loaders co-locate data fetching with routes. They run before the component renders, eliminating loading states for initial data. The useLoaderData hook retrieves the resolved data inside the component.',
    keyPoints: [
      'Add a loader function to the route config: { path: "...", loader: fetchUser, element: <Page /> }.',
      'The loader receives { params, request } — use params to fetch route-specific data.',
      'useLoaderData() returns the resolved loader value — it is always available synchronously.',
      'Loaders run in parallel for all matched routes; nested routes do not wait for ancestors.',
    ],
  },
  '5-7': {
    summary: 'React Router lets you handle route-level errors with the errorElement property. Catch-all routes (path: "*") handle 404s. The useRouteError hook gives you access to the thrown error inside an error boundary.',
    keyPoints: [
      'Add errorElement: <ErrorPage /> to any route to catch thrown errors in that subtree.',
      'useRouteError() returns the caught error — check isRouteErrorResponse for HTTP errors.',
      'A catch-all route { path: "*" } renders when no other route matches — use it for 404s.',
      'Error boundaries do not catch errors in event handlers — only render-time errors.',
    ],
  },

  // ── Course 6: Testing React Applications ─────────────────────────────────
  '6-1': {
    summary: 'The testing pyramid guides how to allocate test effort: many fast unit tests, fewer integration tests, and a small number of slow end-to-end tests. In React apps, component integration tests often deliver the highest value.',
    keyPoints: [
      'Unit tests verify a single function or component in isolation.',
      'Integration tests verify how multiple units work together.',
      'E2E tests run a real browser — valuable but slow and brittle.',
      'Test behaviour, not implementation — tests that survive refactors are more valuable.',
    ],
  },
  '6-2': {
    summary: 'Vitest is a Vite-native test runner with Jest-compatible API. It is fast because it reuses your existing Vite config and runs tests in the same transform pipeline as your source code.',
    keyPoints: [
      'vitest.config.ts (or vite.config.ts) is the single config for both build and test.',
      'test("description", () => { expect(value).toBe(expected) }) — the basic test shape.',
      'vitest --coverage generates an Istanbul coverage report.',
      'The globals option makes describe, test, expect available without imports.',
    ],
  },
  '6-3': {
    summary: 'React Testing Library renders components and exposes queries that find elements the way users do — by accessible role, label text, or visible content. This keeps tests focused on behaviour rather than implementation.',
    keyPoints: [
      'getByRole is the preferred query — it tests accessibility at the same time.',
      'getByLabelText finds form inputs associated with a label.',
      'getByText finds elements by their visible text content.',
      'Avoid getByTestId — it leaks implementation details into tests.',
    ],
  },
  '6-4': {
    summary: 'userEvent simulates realistic user interactions: typing fires keydown/keyup/input events, not just onChange. It is more accurate than fireEvent and should be preferred for testing user flows.',
    keyPoints: [
      'Set up userEvent once: const user = userEvent.setup() before each test.',
      'await user.type(input, "hello") types character by character.',
      'await user.click(button) fires the full event chain including focus.',
      'Use waitFor(() => expect(...)) for assertions that depend on async state updates.',
    ],
  },
  '6-5': {
    summary: 'vi.mock replaces a module with a mock for the duration of a test file. Spy functions record calls and let you assert how a function was invoked. Both are essential for isolating units from their dependencies.',
    keyPoints: [
      'vi.mock("./api") at the top of a file replaces the entire module.',
      'vi.fn() creates a spy; vi.spyOn(obj, "method") spies on an existing method.',
      'mockReturnValue and mockResolvedValue configure what the mock returns.',
      'vi.clearAllMocks() in beforeEach prevents state from leaking between tests.',
    ],
  },
  '6-6': {
    summary: 'renderHook renders a hook in a minimal wrapper component, letting you test its behaviour directly. The act utility batches state updates so your assertions see the settled state.',
    keyPoints: [
      'const { result } = renderHook(() => useMyHook()) — access hook return via result.current.',
      'Wrap state-updating calls in act(() => { ... }) to flush React\'s update queue.',
      'Use rerender to simulate prop changes: rerender({ newProp: value }).',
      'For hooks that need context, pass a wrapper component to renderHook.',
    ],
  },
  '6-7': {
    summary: 'Components that use React Router hooks (useNavigate, useParams) must be rendered inside a router. MemoryRouter is the test-friendly option — it holds history in memory without touching the browser URL.',
    keyPoints: [
      'Wrap the rendered component in <MemoryRouter initialEntries={["/path"]}>.',
      'Use <Routes> and <Route> inside the wrapper to test routing behaviour.',
      'createMemoryRouter (data router) is available for testing loader/action flows.',
      'Assert navigation by checking what was rendered, not internal router state.',
    ],
  },
  '6-8': {
    summary: 'Zustand stores are global singletons — state from one test can leak into the next. The solution is to expose a reset action or use the store\'s setState to restore initial values in beforeEach.',
    keyPoints: [
      'Add a reset action to the store: reset: () => set(initialState).',
      'Call useStore.setState(initialState) directly from tests — no need for an action.',
      'Mock the entire store module if a component only needs to read, not write.',
      'Prefer testing the component behaviour over asserting store internals directly.',
    ],
  },
  '6-9': {
    summary: 'Snapshot tests capture the rendered output of a component and fail if it changes unexpectedly. They are useful for preventing accidental UI regressions but become a maintenance burden when overused.',
    keyPoints: [
      'expect(component).toMatchSnapshot() — creates or compares a snapshot file.',
      'Update snapshots with vitest --update-snapshots when changes are intentional.',
      'Prefer targeted assertions (getByText, getByRole) over full-tree snapshots.',
      'Storybook provides visual snapshot testing with tools like Chromatic.',
    ],
  },
}
