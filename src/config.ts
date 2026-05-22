// Re-export shim — real implementation now lives in @s-class/config.
// Kept so existing `import config from '@/config'` callsites continue to work
// during the monorepo migration. Will be removed in Phase 5 once /src is
// fully decommissioned.
export { default } from '@s-class/config'
