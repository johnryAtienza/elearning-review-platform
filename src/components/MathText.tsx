/**
 * MathText
 *
 * Renders a string that may contain inline LaTeX math delimited by `$...$`.
 *
 * Examples:
 *   "Evaluate: $((ab^n)^n)^n$"
 *   → "Evaluate: " + KaTeX rendered ((ab^n)^n)^n
 *
 *   "Plain text without math"
 *   → rendered as a plain span, no KaTeX involved
 *
 * Non-math segments are rendered as plain text.
 * KaTeX errors fall back to the raw LaTeX source so the page never crashes.
 */

import katex from 'katex'
import 'katex/dist/katex.min.css'

interface MathTextProps {
  /** The string to render, with optional $...$ math segments */
  text: string
  className?: string
}

export function MathText({ text, className }: MathTextProps) {
  const parts = parseMathSegments(text)

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.type === 'math' ? (
          <KatexSpan key={i} latex={part.value} />
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
    </span>
  )
}

// ── KatexSpan ─────────────────────────────────────────────────────────────────

function KatexSpan({ latex }: { latex: string }) {
  let html: string
  try {
    html = katex.renderToString(latex, {
      throwOnError: false,
      output: 'html',
      displayMode: false,
    })
  } catch {
    // Fallback: show raw source if KaTeX can't parse it
    html = latex
  }

  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

// ── Parser ────────────────────────────────────────────────────────────────────

type Segment = { type: 'text' | 'math'; value: string }

function parseMathSegments(input: string): Segment[] {
  const segments: Segment[] = []
  // Match $...$ — handles nested braces but NOT nested $
  const re = /\$([^$]+)\$/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: input.slice(lastIndex, match.index) })
    }
    segments.push({ type: 'math', value: match[1] })
    lastIndex = re.lastIndex
  }

  if (lastIndex < input.length) {
    segments.push({ type: 'text', value: input.slice(lastIndex) })
  }

  return segments
}
