import { useEffect, useState } from 'react'
import {
  ArrowUpRight,
  Clock,
  Link as LinkIcon,
  Mail,
  MessageCircle,
  Phone,
} from 'lucide-react'
import {
  DEFAULT_CONTACT_PAGE_CONTENT,
  homeContentApi,
} from '@s-class/api/homeContentApi'
import type {
  ContactChannelIcon,
  ContactPageChannelContent,
  ContactPageContent,
} from '@s-class/types/home'
import { ROUTES } from '@/constants/routes'
import { CanonicalLink } from '@/components/CanonicalLink'

/**
 * Public Contact Us page.
 *
 * v1: no form — visitors reach us via mailto / tel / Messenger links from
 * admin-editable Contact Page content. If a real form is needed later, we can
 * add a Supabase Edge Function that relays submissions; the page layout stays
 * the same.
 */
export function ContactPage() {
  const [content, setContent] =
    useState<ContactPageContent>(DEFAULT_CONTACT_PAGE_CONTENT)

  useEffect(() => {
    let cancelled = false

    homeContentApi.getContactPage()
      .then((nextContent) => { if (!cancelled) setContent(nextContent) })
      .catch(() => { if (!cancelled) setContent(DEFAULT_CONTACT_PAGE_CONTENT) })

    return () => { cancelled = true }
  }, [])

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl space-y-10">
      <CanonicalLink path={ROUTES.CONTACT} owner="landing" />
      <header className="space-y-2 text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          {content.heroEyebrow}
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          {content.heroTitle}
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto sm:mx-0">
          {content.heroDescription}
        </p>
      </header>

      {/* Channels */}
      <section className="grid gap-3 sm:grid-cols-1 lg:grid-cols-3">
        {content.channels.map((c) => (
          <ChannelCard key={c.id} channel={c} />
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
          <li className="px-6 py-2.5 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Monday – Friday</span>
            <span className="font-medium tabular-nums">{content.businessHours.weekdays}</span>
          </li>
          <li className="px-6 py-2.5 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Saturday</span>
            <span className="font-medium tabular-nums">{content.businessHours.saturday}</span>
          </li>
          <li className="px-6 py-2.5 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Sunday</span>
            <span className="font-medium tabular-nums">{content.businessHours.sunday}</span>
          </li>
        </ul>
      </section>
    </div>
  )
}

function ChannelCard({ channel }: { channel: ContactPageChannelContent }) {
  const iconNode = renderIcon(channel.icon)
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

function renderIcon(icon: ContactChannelIcon) {
  const cls = 'size-5 text-primary'
  if (icon === 'email') return <Mail className={cls} />
  if (icon === 'phone') return <Phone className={cls} />
  if (icon === 'messenger') return <MessageCircle className={cls} />
  return <LinkIcon className={cls} />
}
