export interface Course {
  id: string
  title: string
  description: string
  thumbnail: string   // CSS gradient used as background
  category: string
  lessons: number
  duration: string
}

export const COURSES: Course[] = [
  {
    id: '1',
    title: 'React Fundamentals',
    description:
      'Learn the core concepts of React including components, props, state, and the component lifecycle.',
    thumbnail: 'from-blue-400 to-cyan-500',
    category: 'Frontend',
    lessons: 12,
    duration: '6h 30m',
  },
  {
    id: '2',
    title: 'TypeScript Deep Dive',
    description:
      'Master TypeScript from basic types and interfaces to advanced generics and utility types.',
    thumbnail: 'from-violet-500 to-purple-600',
    category: 'Language',
    lessons: 8,
    duration: '4h 15m',
  },
  {
    id: '3',
    title: 'State Management with Zustand',
    description:
      'Build scalable React applications using Zustand for lightweight, flexible global state management.',
    thumbnail: 'from-orange-400 to-rose-500',
    category: 'Frontend',
    lessons: 5,
    duration: '2h 45m',
  },
  {
    id: '4',
    title: 'Tailwind CSS Mastery',
    description:
      'Rapidly build modern UIs with utility-first CSS. Covers responsive design, theming, and custom components.',
    thumbnail: 'from-teal-400 to-emerald-500',
    category: 'Styling',
    lessons: 10,
    duration: '5h 00m',
  },
  {
    id: '5',
    title: 'React Router in Depth',
    description:
      'Everything you need to know about client-side routing — nested routes, loaders, guards, and more.',
    thumbnail: 'from-pink-400 to-fuchsia-500',
    category: 'Frontend',
    lessons: 7,
    duration: '3h 20m',
  },
  {
    id: '6',
    title: 'Testing React Applications',
    description:
      'Write reliable tests using Vitest and React Testing Library. Unit, integration, and component testing.',
    thumbnail: 'from-yellow-400 to-orange-500',
    category: 'Testing',
    lessons: 9,
    duration: '4h 50m',
  },
]
