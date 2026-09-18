# Frontend architecture pointer

The current frontend topology is documented in
[architecture/current.md](architecture/current.md), and local commands are in
[architecture/local-development.md](architecture/local-development.md).

Landing owns the production marketing and `/portal/*` student routes. Portal is
the local/source student workspace. Admin is a separate application. Shared
pages and features remain in the root `src/` directory and are consumed through
the app Vite aliases.
