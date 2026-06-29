const SCRAPED_TITLE_PREFIXES = [
  /^Share:\s*Favorite\s*\(\d+\)\s*/i,
]

export function normalizeBookTitle(value: string): string {
  let title = value.trim()

  for (const prefix of SCRAPED_TITLE_PREFIXES) {
    title = title.replace(prefix, '').trim()
  }

  return title
}
