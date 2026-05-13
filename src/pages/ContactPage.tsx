import { Mail, Phone, MessageCircle, Clock, ArrowUpRight } from 'lucide-react'
import {
  CONTACT_CHANNELS,
  BUSINESS_HOURS,
  CONTACT_INTRO,
  type ContactChannel,
} from '@/constants/contactInfo'

/**
 * Public Contact Us page.
 *
 * v1: no form — visitors reach us via mailto / tel / Messenger links from
 * src/constants/contactInfo.ts. If a real form is needed later, we can add
 * a Supabase Edge Function that relays submissions; the page layout stays
 * the same.
 */
export function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl space-y-10">
      <header className="space-y-2 text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Contact us
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Talk to a CLASS S reviewer
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto sm:mx-0">
          {CONTACT_INTRO}
        </p>
      </header>

      {/* Channels */}
      <section className="grid gap-3 sm:grid-cols-1 lg:grid-cols-3">
        {CONTACT_CHANNELS.map((c) => (
          <ChannelCard key={c.href} channel={c} />
        ))}
      </section>

      {/* Business hours */}
      <section className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Business hours
          </h2>
        </div>
        <ul className="divide-y -mx-6">
          {BUSINESS_HOURS.map((row) => (
            <li key={row.day} className="px-6 py-2.5 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{row.day}</span>
              <span className="font-medium tabular-nums">{row.hours}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function ChannelCard({ channel }: { channel: ContactChannel }) {
  const iconNode = renderIcon(channel)
  return (
    <a
      href={channel.href}
      target={channel.href.startsWith('http') ? '_blank' : undefined}
      rel={channel.href.startsWith('http') ? 'noopener noreferrer' : undefined}
      className="group flex flex-col gap-3 rounded-xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-card/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-primary/15 p-2">
          {iconNode}
        </div>
        <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {channel.label}
        </p>
        <p className="text-base font-semibold break-all">{channel.value}</p>
        {channel.helper && (
          <p className="text-xs text-muted-foreground leading-relaxed">{channel.helper}</p>
        )}
      </div>
    </a>
  )
}

function renderIcon(channel: ContactChannel) {
  const cls = 'size-5 text-primary'
  if (channel.href.startsWith('mailto:')) return <Mail          className={cls} />
  if (channel.href.startsWith('tel:'))    return <Phone         className={cls} />
  return                                       <MessageCircle className={cls} />
}
