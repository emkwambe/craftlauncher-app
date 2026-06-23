import { useState, useCallback, useRef, useEffect } from 'react'

// ─── Config ──────────────────────────────────────────────────────────────────
const WORKER_URL = 'https://api.craftlauncher.dev'
const LC_TOKEN   = 'tLr5Mx4U8InG1puXTmevZKgVW2wNcfOy'

const FREE_PLATFORM_IDS = ['producthunt','twitter','hackernews','peerlist','indiehackers']

const PLATFORMS = [
  { id:'producthunt',  name:'Product Hunt',  cat:'Launch',    icon:'🐱', color:'#DA552F', api:false, url:'https://www.producthunt.com/posts/new',     desc:'Punchy tagline, emoji-friendly, problem → solution → CTA. Upbeat and maker-voiced.' },
  { id:'betalist',     name:'BetaList',      cat:'Launch',    icon:'🚀', color:'#1a1a2e', api:false, url:'https://betalist.com/submit',                desc:'Pre-launch focused. Short clear description. Emphasize early-access angle.' },
  { id:'betaboard',    name:'BetaBoard',     cat:'Launch',    icon:'📋', color:'#6c63ff', api:false, url:'https://betaboard.netlify.app',              desc:'Newsletter-first. Write for curious early adopters. Be concise.' },
  { id:'peerlist',     name:'Peerlist',      cat:'Launch',    icon:'🌿', color:'#00AA45', api:false, url:'https://peerlist.io/projects/new',           desc:'Professional dev/maker audience. Weekly launches. Lead with what you built, why, and your stack.' },
  { id:'microlaunch',  name:'Microlaunch',   cat:'Launch',    icon:'⚡', color:'#f59e0b', api:false, url:'https://microlaunch.net',                    desc:'Month-long launch exposure. Feedback-oriented. Be transparent about stage.' },
  { id:'openhunts',    name:'OpenHunts',     cat:'Launch',    icon:'🎯', color:'#ec4899', api:false, url:'https://openhunts.com',                      desc:'Product Hunt alternative. Maker-voiced. Lead with the problem, then the solution.' },
  { id:'hackernews',   name:'Hacker News',   cat:'Dev',       icon:'▲',  color:'#FF6600', api:false, url:'https://news.ycombinator.com/submit',        desc:'CRITICAL: Title must start with "Show HN:" and be MAXIMUM 80 characters total. Count every character. Body: terse, technical, zero hype. No marketing language. End with URL on its own line.' },
  { id:'devto',        name:'DEV Community', cat:'Dev',       icon:'💻', color:'#3b49df', api:true,  url:'https://dev.to/new',                         desc:'Developer write-up. Technical depth welcome. Use markdown. Educational tone.' },
  { id:'devhunt',      name:'DevHunt',       cat:'Dev',       icon:'🛠️', color:'#7c3aed', api:false, url:'https://devhunt.org/tool/new',               desc:'Dev tools only. Emphasize DX, problem it solves for developers, tech stack.' },
  { id:'lobsters',     name:'Lobsters',      cat:'Dev',       icon:'🦞', color:'#AC130D', api:false, url:'https://lobste.rs/stories/new',              desc:'Invite-only, highly technical. Zero self-promotion. Link to something technically interesting.' },
  { id:'indiehackers', name:'Indie Hackers', cat:'Founder',   icon:'⚙️', color:'#0070f3', api:false, url:'https://www.indiehackers.com/post',          desc:'Founder journey, transparency, MRR/numbers if any. Show build process, failures, lessons. Be real.' },
  { id:'starterstory', name:'Starter Story', cat:'Founder',   icon:'📖', color:'#16a34a', api:false, url:'https://www.starterstory.com/share',         desc:'Story-driven. Lead with your founder journey. Include revenue, timeline, pivots.' },
  { id:'reddit',       name:'Reddit',        cat:'Social',    icon:'👾', color:'#FF4500', api:true,  url:'https://reddit.com/r/SaaS/submit',           desc:'Conversational, no hard sell. Lead with the problem or your story. Be human. Write title + body separated by ---.' },
  { id:'linkedin',     name:'LinkedIn',      cat:'Social',    icon:'💼', color:'#0A66C2', api:true,  url:'https://linkedin.com/feed',                  desc:'Professional, story-driven. Hook → context → value → CTA. Short paragraphs, line breaks. 1-2 emojis max.' },
  { id:'twitter',      name:'X / Twitter',   cat:'Social',    icon:'𝕏',  color:'#1a1a1a', api:true,  url:'https://twitter.com/intent/tweet',           desc:'Thread (1/, 2/, 3/) or single tweet under 280 chars. Hook in line one. No fluff. Hashtags only at end.' },
  { id:'alternativeto',name:'AlternativeTo', cat:'Discovery', icon:'🔄', color:'#0090E7', api:false, url:'https://alternativeto.net/add',              desc:'List as alternative to existing tools. Be specific about what you replace and why you are better.' },
  { id:'g2',           name:'G2',            cat:'Discovery', icon:'⭐', color:'#FF492C', api:false, url:'https://sell.g2.com/free-listing',           desc:'B2B software directory. Feature-focused, professional. Highlight integrations and use cases.' },
  { id:'appsumo',      name:'AppSumo',       cat:'Discovery', icon:'🍣', color:'#FFCF00', api:false, url:'https://sell.appsumo.com',                   desc:'Lifetime deal audience. Lead with deal value. Stack value, list features, contrast with competitors pricing.' },
]

const TONES = ['Excited','Professional','Technical','Humble','Bold']

const SYSTEM_PROMPT = `You are a world-class startup marketer who writes platform-native launch posts.
You deeply understand the culture, tone, and expectations of each developer community.
You never use generic marketing language. You write as a real founder would.
CRITICAL RULES:
- Always include the product URL at or near the end of every post if one is provided
- Never omit the URL — it is the most important conversion element
- Hacker News titles MUST start with "Show HN:" and be MAXIMUM 80 characters total including spaces. Count every character. Shorten ruthlessly if needed.
- Always respond with valid JSON only — no markdown fences, no preamble`

const LAUNCHKIT_SYSTEM_PROMPT = `You are an expert conversion copywriter. Generate a complete, deployable HTML landing page for this product.
The page must follow this structure: [nav, hero, problem, solution, features, pricing, FAQ, footer CTA].
Use dark theme with CSS variables. The output must be a single self-contained HTML file.
Focus on converting cold traffic — strangers who arrived from a launch post.
One primary CTA throughout. No distractions. Persuasion sequence: problem → solution → proof → action.
Respond with ONLY the HTML. No markdown fences. No preamble.`

const THREAD_SYSTEM_PROMPT = `You are a build-in-public content strategist. Generate platform-native weekly progress posts for a founder.
This is NOT a launch post — it is a transparent weekly update showing the build journey.
Tone: honest, humble, specific. Show real numbers, real problems, real progress.
IH post: lead with what you learned, be transparent about failures.
Twitter: numbered thread, hook on tweet 1, specific details, end with a question.
LinkedIn: professional but personal, short paragraphs, what this means for customers.
Peerlist: maker-to-maker tone, stack details welcome.
Always include the product URL if provided.
Respond with valid JSON only: {twitter, indiehackers, linkedin, peerlist}`

// Fixed platform set for Thread (no picker). HN is optional — only rendered if returned.
const THREAD_CORE_IDS = ['twitter', 'indiehackers', 'linkedin', 'peerlist']

const LAUNCHDECK_SYSTEM_PROMPT = `You are an expert startup advisor who writes investor one-pagers.
Generate a single-page pitch document for this product.
Rules: No jargon. No buzzwords. Every sentence earns its place.
Lead with the problem — make the reader feel it.
Traction section: if numbers provided, lead with them. If not, be honest about stage.
One-pager means one page — ruthlessly concise.
The goal: reader understands the product, believes in the founder, and wants to learn more.
Respond with ONLY the HTML. Clean, print-ready formatting. No markdown fences.`

// ─── PostFlow (local service business mode) ────────────────────────────────────
const FREE_POSTFLOW_PLATFORM_IDS = ['instagram', 'facebook', 'tiktok', 'nextdoor', 'googlebusiness']

const POSTFLOW_PLATFORMS = [
  { id:'instagram',      name:'Instagram',       cat:'Social', icon:'📸', color:'#E1306C', api:false, url:'https://www.instagram.com',  desc:"Visual caption for Instagram. 125-150 words max. Emoji-forward. End with 3-5 relevant hashtags (mix broad + local + niche: #braidstyles #charlottebraider #knotlessboxbraids). Strong hook on line 1. Booking link prominent. Call to action: 'Link in bio to book' or direct URL." },
  { id:'facebook',       name:'Facebook',        cat:'Social', icon:'👥', color:'#1877F2', api:false, url:'https://www.facebook.com',   desc:"Facebook post for local community. Conversational, warm, neighborhood tone. 100-200 words. No hashtag overload — 2-3 max. Tag your city if relevant. End with direct booking link as a full URL (Facebook makes it clickable). Include a question to drive comments." },
  { id:'tiktok',         name:'TikTok',          cat:'Social', icon:'🎵', color:'#000000', api:false, url:'https://www.tiktok.com',     desc:"TikTok video caption. Under 150 chars for the caption itself. Hook must be in the first line — this is what shows before 'more'. Energy: high, authentic, trending. 3-5 hashtags. End with 'Link in bio to book'. The caption supports a video — write as if the viewer just watched your transformation video." },
  { id:'nextdoor',       name:'Nextdoor',        cat:'Local',  icon:'🏘️', color:'#00B246', api:false, url:'https://nextdoor.com',       desc:"Nextdoor neighborhood post. Hyperlocal tone — speak to your neighbors directly. 'Hi neighbors!' opener. Mention your specific neighborhood or area. No hashtags. Conversational, trust-building. End with phone number or booking link. Nextdoor users value local recommendations — sound like a neighbor, not an ad." },
  { id:'googlebusiness', name:'Google Business', cat:'Local',  icon:'🔍', color:'#4285F4', api:false, url:'https://business.google.com', desc:"Google Business post (shown in Google Maps and search results). 100-300 words. Professional, keyword-rich for local SEO. Include service name + city naturally (e.g. 'knotless box braids in Charlotte'). Clear CTA with booking link. No emojis — Google Business is a professional directory." },
  // Launcher-unlocked PostFlow platforms
  { id:'whatsapp_broadcast', name:'WhatsApp Broadcast', cat:'Messaging',  icon:'💬', color:'#25D366', api:false, url:'https://web.whatsapp.com',    desc:"WhatsApp broadcast message to existing clients. Short, personal, friendly — like texting a regular. 1-2 short paragraphs. Lead with the offer or news. End with the booking link. No hashtags. Feels one-to-one." },
  { id:'pinterest',          name:'Pinterest',          cat:'Discovery',  icon:'📌', color:'#E60023', api:false, url:'https://www.pinterest.com',   desc:"Pinterest pin description. Keyword-rich and searchable (style names, service, city). Inspirational tone. 2-4 sentences. 3-5 hashtags. Include the booking link. Written to support a portfolio image." },
  { id:'threads',            name:'Threads',            cat:'Social',     icon:'@',  color:'#000000', api:false, url:'https://www.threads.net',     desc:"Threads post. Casual, conversational, punchy. Under 500 chars. 1-2 hashtags max. Hook first line. End with booking link or 'link in bio'." },
  { id:'yelp',               name:'Yelp',               cat:'Local',      icon:'⭐', color:'#FF1A1A', api:false, url:'https://biz.yelp.com',        desc:"Yelp business update post. Professional, factual, trust-building. Highlight services and what makes you different. Mention city + service for local search. Include booking link. No emojis or hashtags." },
  { id:'linkedin_local',     name:'LinkedIn',           cat:'Professional', icon:'💼', color:'#0A66C2', api:false, url:'https://www.linkedin.com', desc:"LinkedIn post for a local service professional. Professional but personal. Share expertise or a client win. Short paragraphs. 1-2 hashtags. End with booking link. Builds authority in your trade." },
  { id:'twitter_local',      name:'X / Twitter',        cat:'Social',     icon:'𝕏',  color:'#1a1a1a', api:false, url:'https://twitter.com',         desc:"Short local-business tweet under 280 chars. Friendly, direct. Lead with the offer or service. 1-2 local hashtags. End with the booking link." },
]

const POSTFLOW_TONES = ['Welcoming', 'Professional', 'Community', 'Excited']

const POSTFLOW_SYSTEM_PROMPT = `You are an expert social media marketer for local service businesses.
You understand the culture and expectations of each local platform.
You write as the business owner would — warm, authentic, community-first.
You never use corporate language. You never sound like an ad.
CRITICAL RULES:
- The booking link MUST appear in every single post — it is the #1 conversion element
- Instagram: visual language, emojis, hashtags, "link in bio"
- Facebook: conversational, neighborhood warmth, full URL
- TikTok: high energy, assumes viewer just watched a video, "link in bio"
- Nextdoor: neighbor-to-neighbor tone, mention location, no hashtags
- Google Business: professional, SEO-aware, include city + service name naturally
- Always respond with valid JSON only — no markdown fences, no preamble`

// Detect the booking platform and return the appropriate CTA phrasing.
function bookingCTA(url) {
  if (!url) return 'Book here → [your booking link]'
  const u = url.toLowerCase()
  if (u.includes('booksy'))        return `Book your appointment → ${url}`
  if (u.includes('square'))        return `Book online → ${url}`
  if (u.includes('calendly'))      return `Schedule your session → ${url}`
  if (u.includes('acuity'))        return `Book now → ${url}`
  if (u.includes('glossgenius'))   return `Book with me → ${url}`
  if (u.includes('instagram.com')) return 'Link in bio 👆'
  return `Book here → ${url}`
}

// Combined lookup so Results/Vault can resolve platforms from either mode.
const ALL_PLATFORMS = [...PLATFORMS, ...POSTFLOW_PLATFORMS]
const findPlatform = (id) => ALL_PLATFORMS.find(p => p.id === id)

// ─── Styles ───────────────────────────────────────────────────────────────────
const C = {
  // Colors
  bg: '#080808', bg2: '#0f0f0f', bg3: '#141414',
  border: '#1c1c1c', border2: '#252525',
  text: '#e2ddd6', text2: '#8a8680', text3: '#444240',
  amber: '#f5a623', red: '#e8472a', green: '#4ade80',
}

const input = {
  width: '100%', background: C.bg3, border: `1px solid ${C.border2}`,
  borderRadius: 8, padding: '11px 14px', color: C.text, fontSize: 14,
  fontFamily: "'Instrument Sans', system-ui, sans-serif", outline: 'none',
  transition: 'border-color .2s', WebkitAppearance: 'none',
}

const btn = (active, color = C.amber) => ({
  padding: '7px 14px', borderRadius: 7,
  border: `1px solid ${active ? color : C.border2}`,
  background: active ? `${color}18` : 'transparent',
  color: active ? color : C.text2,
  cursor: 'pointer', fontSize: 12,
  fontFamily: "'Instrument Sans', system-ui, sans-serif",
  transition: 'all .15s', minHeight: 36,
})

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return mobile
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UsageBar({ usage, userEmail, setUserEmail, loadUsage, usageError, onUpgrade }) {
  const isMobile = useIsMobile()
  return (
    <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <input
          value={userEmail} onChange={e => setUserEmail(e.target.value)}
          onBlur={e => loadUsage(e.target.value)}
          placeholder="your@email.com — tracks usage"
          style={{ ...input, flex: 1, fontSize: 13 }}
          type="email" autoComplete="email"
        />
        <span style={{
          fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
          color: usage.plan === 'launcher' ? C.amber : C.text3,
          padding: '4px 10px', border: `1px solid ${usage.plan === 'launcher' ? C.amber + '44' : C.border2}`,
          borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {usage.plan === 'launcher' ? '✦ Launcher' : 'Free'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { label: 'Generations', used: usage.generationsThisPeriod, limit: usage.generationLimit, remaining: usage.generationsRemaining },
          { label: 'Auto-Posts',  used: usage.postsThisPeriod,       limit: usage.postLimit,       remaining: usage.postsRemaining },
        ].map(({ label, used, limit, remaining }) => {
          const isUnlimited = limit === 'unlimited'
          const pct   = isUnlimited ? 0 : Math.min(100, ((used || 0) / (limit || 1)) * 100)
          const color = isUnlimited ? C.amber : pct >= 80 ? C.red : pct >= 50 ? C.amber : C.green
          return (
            <div key={label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.text3, marginBottom: 5, fontFamily: "'JetBrains Mono', monospace" }}>
                <span>{label}</span>
                <span style={{ color }}>{isUnlimited ? '∞ unlimited' : `${remaining ?? limit} left / ${limit}`}</span>
              </div>
              {!isUnlimited && (
                <div style={{ height: 3, background: C.border, borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width .3s' }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
      {usageError && (
        <div style={{ marginTop: 10, fontSize: 12, color: C.red, fontFamily: "'JetBrains Mono', monospace" }}>
          ⚠ {usageError} &nbsp;
          <button onClick={onUpgrade} style={{ background: 'none', border: 'none', color: C.amber, cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}>
            Upgrade — $9/mo or $149/yr →
          </button>
        </div>
      )}
    </div>
  )
}

function PlatformGrid({ plan, selectedIds, onToggle, onUpgrade, allPlatforms = PLATFORMS, freeIds = FREE_PLATFORM_IDS }) {
  const isMobile = useIsMobile()
  const freePlatforms = freeIds.map(id => allPlatforms.find(p => p.id === id)).filter(Boolean)
  const lockedPlatforms = allPlatforms.filter(p => !freeIds.includes(p.id))

  if (plan !== 'launcher') {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: C.text3, letterSpacing: '.8px', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>
            Platforms — Free tier
          </label>
          <button onClick={onUpgrade} style={{ background: 'none', border: 'none', color: C.amber, cursor: 'pointer', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", textDecoration: 'underline', padding: 0 }}>
            Upgrade for all {allPlatforms.length} →
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 6, marginBottom: 8 }}>
          {freePlatforms.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 8, border: `1px solid ${p.color}44`, background: `${p.color}08` }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{p.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: C.text3, fontFamily: "'JetBrains Mono', monospace" }}>
                  {p.id === 'twitter' ? 'Free + API' : p.id === 'producthunt' ? 'Featured launch' : p.cat}
                </div>
              </div>
              {p.id === 'twitter' && <span style={{ fontSize: 9, background: '#f5a62322', color: C.amber, padding: '2px 6px', borderRadius: 4, border: '1px solid #f5a62344', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>API</span>}
              {i === 0 && <span style={{ fontSize: 9, background: '#4ade8022', color: C.green, padding: '2px 6px', borderRadius: 4, border: '1px solid #4ade8044', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>FREE</span>}
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {lockedPlatforms.slice(0, isMobile ? 6 : 10).map(p => (
              <span key={p.id} style={{ fontSize: 14, opacity: .3 }} title={p.name}>{p.icon}</span>
            ))}
            <span style={{ fontSize: 11, color: C.text3 }}>+{lockedPlatforms.length} more locked</span>
          </div>
          <span style={{ fontSize: 11, color: C.text3, flexShrink: 0 }}>🔒 Launcher</span>
        </div>
        <p style={{ fontSize: 11, color: C.text3, marginTop: 8, lineHeight: 1.5 }}>
          ✍ CraftLauncher writes the posts. You post from your own accounts — no login required here.
        </p>
      </div>
    )
  }

  // Launcher — full grid
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, color: C.text3, letterSpacing: '.8px', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", marginBottom: 10 }}>
        Platforms ({selectedIds.length} selected)
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(160px, 1fr))', gap: 6 }}>
        {allPlatforms.map(p => {
          const sel = selectedIds.includes(p.id)
          return (
            <button key={p.id} onClick={() => onToggle(p.id)} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
              borderRadius: 8, border: `1px solid ${sel ? p.color : C.border2}`,
              background: sel ? `${p.color}14` : C.bg3, cursor: 'pointer', textAlign: 'left',
              minHeight: 44, transition: 'all .15s',
            }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{p.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: sel ? C.text : C.text2, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize: 10, color: C.text3, fontFamily: "'JetBrains Mono', monospace" }}>{p.cat}</div>
              </div>
              {p.api && <span style={{ fontSize: 9, background: '#f5a62322', color: C.amber, padding: '1px 5px', borderRadius: 3, border: '1px solid #f5a62344', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>API</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PostViewer({ platform, post, onCopy, onRegen, onAutoPost, postStatus, copied, connectedApis, plan, onConnect, onLaunchKit, launchKitLoading, onLaunchDeck, launchDeckLoading }) {
  const isMobile = useIsMobile()
  if (!platform || !post) return null

  const firstLine = post.split('\n')[0] || ''
  const isHN = platform.id === 'hackernews'
  const hnLen = firstLine.length
  const hnOver = isHN && hnLen > 80

  return (
    <div style={{ animation: 'fadeIn .25s ease' }}>
      {/* Platform header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 9, background: `${platform.color}18`, border: `1px solid ${platform.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
          {platform.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{platform.name}</div>
          <div style={{ fontSize: 11, color: C.text3, marginTop: 2, lineHeight: 1.4 }}>{platform.desc.slice(0, 70)}…</div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {platform.url && (
          <a href={platform.url} target="_blank" rel="noopener noreferrer"
            onClick={() => onCopy(post)}
            style={{ ...btn(false), textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '8px 14px' }}>
            ↗ Open & Post
          </a>
        )}
        <button onClick={() => onCopy(post)} style={{ ...btn(copied, C.green), fontSize: 12, padding: '8px 14px' }}>
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
        {onLaunchKit && (
          <button onClick={onLaunchKit} disabled={launchKitLoading}
            style={{ ...btn(false, C.amber), fontSize: 12, padding: '8px 14px', opacity: launchKitLoading ? .6 : 1 }}>
            {launchKitLoading ? 'Generating…' : '🎨 LaunchKit'}
          </button>
        )}
        {onLaunchDeck && (
          <button onClick={onLaunchDeck} disabled={launchDeckLoading}
            style={{ ...btn(false, C.amber), fontSize: 12, padding: '8px 14px', opacity: launchDeckLoading ? .6 : 1 }}>
            {launchDeckLoading ? 'Generating…' : '📑 LaunchDeck'}
          </button>
        )}
        {platform.api && plan === 'launcher' && (
          connectedApis[platform.id]
            ? <button onClick={() => onAutoPost(platform.id)} disabled={postStatus === 'posting' || postStatus === 'posted'}
                style={{ ...btn(true, C.amber), fontSize: 12, padding: '8px 14px', opacity: postStatus === 'posted' ? .5 : 1 }}>
                {postStatus === 'posting' ? 'Posting…' : postStatus === 'posted' ? '✓ Posted' : '⚡ Auto-Post'}
              </button>
            : <button onClick={() => onConnect(platform.id)} style={{ ...btn(false, C.amber), fontSize: 12, padding: '8px 14px' }}>
                🔌 Connect
              </button>
        )}
      </div>

      {/* HN warning */}
      {isHN && (
        <div style={{ marginBottom: 10, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", padding: '8px 12px', borderRadius: 6, background: hnOver ? '#e8472a18' : '#4ade8018', border: `1px solid ${hnOver ? C.red + '44' : C.green + '44'}`, color: hnOver ? C.red : C.green }}>
          {hnOver ? `⚠ Title: ${hnLen} chars — ${hnLen - 80} over 80 limit. Hit Regenerate.` : `✓ Title: ${hnLen}/80 chars`}
        </div>
      )}

      {/* Post content */}
      <div style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 10, padding: '20px' }}>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: "'Instrument Sans', system-ui, sans-serif", fontSize: 14, lineHeight: 1.8, color: '#ccc' }}>
          {post}
        </pre>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <span style={{ fontSize: 11, color: C.text3, fontFamily: "'JetBrains Mono', monospace" }}>{post.length} chars</span>
        <button onClick={onRegen} style={{ ...btn(false), fontSize: 12 }}>↺ Regenerate</button>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const isMobile = useIsMobile()

  // ── State ──────────────────────────────────────────────────────────────────
  const [tab, setTab]             = useState('compose') // compose | results | vault | thread | automate
  const [resultMode, setResultMode] = useState('compose') // which generator filled the Results tab
  const [userEmail, setUserEmail] = useState('')
  const [usage, setUsage]         = useState({ generationsThisPeriod: 0, generationLimit: 3, generationsRemaining: 3, postsThisPeriod: 0, postLimit: 1, postsRemaining: 1, plan: 'free' })
  const [usageError, setUsageError] = useState('')
  const [form, setForm]           = useState({ productName: '', tagline: '', url: '', pricing: '', problem: '', solution: '', audience: '', techStack: '', tone: 'Excited' })
  const [selectedIds, setSelectedIds] = useState(FREE_PLATFORM_IDS)
  // PostFlow (local service business mode)
  const [mode, setMode]           = useState('launch') // 'launch' | 'postflow'
  const [pfForm, setPfForm]       = useState({ businessName: '', serviceType: '', differentiation: '', location: '', priceRange: '', promotion: '', bookingLink: '', tone: 'Welcoming' })
  const [pfSelectedIds, setPfSelectedIds] = useState(FREE_POSTFLOW_PLATFORM_IDS)
  const [posts, setPosts]         = useState({})
  const [activePlatform, setActivePlatform] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [copied, setCopied]       = useState(false)
  const [postStatus, setPostStatus] = useState({})
  const [connectedApis, setConnectedApis] = useState({})
  // Mobile: show post drawer
  const [drawerOpen, setDrawerOpen] = useState(false)
  // LaunchVault
  const [vault, setVault]           = useState({ plan: 'free', totalCount: 0, lockedCount: 0, limit: 3, sessions: [] })
  const [vaultLoading, setVaultLoading] = useState(false)
  const [activeSession, setActiveSession] = useState(null)
  // LaunchSignal
  const [currentSessionId, setCurrentSessionId] = useState('')
  const [signal, setSignal]         = useState(null)
  const [signalLoading, setSignalLoading] = useState(false)
  // LaunchKit
  const [lkOpen, setLkOpen]         = useState(false)
  const [lkLoading, setLkLoading]   = useState(false)
  const [lkGated, setLkGated]       = useState(false)
  const [lkGateMsg, setLkGateMsg]   = useState('')
  const [lkHtml, setLkHtml]         = useState('')
  const [lkSlug, setLkSlug]         = useState('')
  const [lkDeployMsg, setLkDeployMsg] = useState('')
  // LaunchThread
  const [threadForm, setThreadForm] = useState({ shipped: '', learned: '', next: '', productName: '', url: '', tone: 'Humble' })
  // LaunchDeck — traction inputs + modal
  const [traction, setTraction]     = useState({ mrr: '', users: '', launchDate: '', keyMetric: '', ask: '', founderName: '', twitter: '' })
  const [tractionOpen, setTractionOpen] = useState(false)
  const [ldOpen, setLdOpen]         = useState(false)
  const [ldLoading, setLdLoading]   = useState(false)
  const [ldGated, setLdGated]       = useState(false)
  const [ldGateMsg, setLdGateMsg]   = useState('')
  const [ldHtml, setLdHtml]         = useState('')
  const [ldMd, setLdMd]             = useState('')
  const [ldView, setLdView]         = useState('preview') // preview | markdown
  const [ldError, setLdError]       = useState('')

  const doneCount = Object.keys(posts).filter(k => posts[k] && !posts[k].startsWith('⏳')).length

  // ── API calls ──────────────────────────────────────────────────────────────
  const loadUsage = async (email) => {
    if (!email || !email.includes('@')) return
    try {
      const res = await fetch(`${WORKER_URL}/account/status`, {
        headers: { 'X-LaunchCraft-Token': LC_TOKEN, 'X-User-Email': email },
      })
      if (res.ok) setUsage(await res.json())
    } catch(e) { console.warn('Usage load failed:', e) }
  }

  const checkGenerationGate = async () => {
    if (!userEmail) return true
    try {
      const res = await fetch(`${WORKER_URL}/account/generate`, {
        method: 'POST',
        headers: { 'X-LaunchCraft-Token': LC_TOKEN, 'X-User-Email': userEmail, 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!data.allowed) {
        setUsageError(`${data.upgradeMessage}`)
        return false
      }
      setUsage(prev => ({ ...prev, generationsThisPeriod: data.used, generationsRemaining: data.remaining }))
      return true
    } catch(e) { return true }
  }

  const handleUpgrade = async () => {
    if (!userEmail) { alert('Enter your email first'); return }
    try {
      const res = await fetch(`${WORKER_URL}/account/upgrade`, {
        headers: { 'X-LaunchCraft-Token': LC_TOKEN, 'X-User-Email': userEmail },
      })
      const data = await res.json()
      if (data.checkoutUrl) window.open(data.checkoutUrl, '_blank')
    } catch(e) { console.error(e) }
  }

  // ── LaunchVault ─────────────────────────────────────────────────────────────
  const loadVault = async (email) => {
    const e = email || userEmail
    if (!e || !e.includes('@')) return
    setVaultLoading(true)
    try {
      const res = await fetch(`${WORKER_URL}/vault`, {
        headers: { 'X-LaunchCraft-Token': LC_TOKEN, 'X-User-Email': e },
      })
      if (res.ok) setVault(await res.json())
    } catch(err) { console.warn('Vault load failed:', err) }
    setVaultLoading(false)
  }

  const saveSession = async (brief, postsObj, platformIds, sessionMode = 'launch') => {
    if (!userEmail || !userEmail.includes('@')) return
    try {
      const res = await fetch(`${WORKER_URL}/vault/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-LaunchCraft-Token': LC_TOKEN, 'X-User-Email': userEmail },
        body: JSON.stringify({ brief, posts: postsObj, platforms: platformIds, mode: sessionMode }),
      })
      const data = await res.json()
      if (data?.id) setCurrentSessionId(data.id) // so auto-posts attach to this session
    } catch(err) { console.warn('Vault save failed:', err) }
  }

  const loadSignal = async (sessionId) => {
    if (!sessionId || !userEmail) return
    setSignalLoading(true); setSignal(null)
    try {
      const res = await fetch(`${WORKER_URL}/signal/${encodeURIComponent(sessionId)}`, {
        headers: { 'X-LaunchCraft-Token': LC_TOKEN, 'X-User-Email': userEmail },
      })
      setSignal(await res.json())
    } catch(err) { setSignal({ error: 'Failed to load signal.' }) }
    setSignalLoading(false)
  }

  const useAsTemplate = (session) => {
    const b = session.brief || {}
    if (session.mode === 'postflow') {
      setMode('postflow')
      setPfForm({
        businessName: b.businessName || '', serviceType: b.serviceType || '', differentiation: b.differentiation || '',
        location: b.location || '', priceRange: b.priceRange || '', promotion: b.promotion || '',
        bookingLink: b.bookingLink || '', tone: b.tone || 'Welcoming',
      })
      if (Array.isArray(session.platforms) && session.platforms.length) setPfSelectedIds(session.platforms)
    } else {
      setMode('launch')
      setForm({
        productName: b.productName || '', tagline: b.tagline || '', url: b.url || '',
        pricing: b.pricing || '', problem: b.problem || '', solution: b.solution || '',
        audience: b.audience || '', techStack: b.techStack || '', tone: b.tone || 'Excited',
      })
      if (Array.isArray(session.platforms) && session.platforms.length) setSelectedIds(session.platforms)
    }
    setActiveSession(null)
    setSignal(null)
    setTab('compose')
  }

  // Refresh vault whenever the Vault tab opens
  useEffect(() => {
    if (tab === 'vault') { setActiveSession(null); loadVault() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  // ── LaunchKit ───────────────────────────────────────────────────────────────
  const generateLaunchKit = async () => {
    if (!userEmail || !userEmail.includes('@')) { alert('Enter your email on the Compose tab first.'); return }
    setLkOpen(true); setLkGated(false); setLkHtml(''); setLkDeployMsg(''); setLkLoading(true)
    try {
      // 1. Launcher-only gate (Worker)
      const gate = await fetch(`${WORKER_URL}/launchkit/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-LaunchCraft-Token': LC_TOKEN, 'X-User-Email': userEmail },
        body: JSON.stringify({ brief: form }),
      })
      const gateData = await gate.json()
      if (!gate.ok || !gateData.allowed) {
        setLkGated(true)
        setLkGateMsg(gateData.upgradeMessage || 'LaunchKit is a Launcher feature.')
        setLkLoading(false)
        return
      }
      setLkSlug(gateData.slug || '')

      // 2. Generate the HTML client-side (same direct Anthropic pattern as generatePosts)
      const userPrompt = `Generate a complete, single-file HTML landing page for this product.

Product:
- Name: ${form.productName}
- Tagline: ${form.tagline || 'N/A'}
- Problem: ${form.problem}
- Solution: ${form.solution}
- Audience: ${form.audience || 'developers and makers'}
- Tech stack: ${form.techStack || 'N/A'}
- Pricing: ${form.pricing || 'N/A'}  ← reflect this exactly in the Pricing section
- URL: ${form.url || '#'}  ← every primary CTA links here
- Tone: ${form.tone}

Structure, in this exact order:
1. Nav — product name (left) + primary CTA button (right)
2. Hero — problem-aware headline, sub-headline, primary CTA → ${form.url || '#'}
3. Problem — 3 pain points, each with an emoji icon
4. Solution — how it works in 3 steps
5. Features — 3–4 feature cards
6. Pricing — match exactly: ${form.pricing || 'N/A'}
7. FAQ — 3 objections answered
8. Footer CTA — final push + link to ${form.url || '#'}

Dark theme — define these as CSS variables in :root:
--bg:#080808; --bg2:#0f0f0f; --bg3:#141414; --border:#1c1c1c; --text:#e2ddd6; --text2:#8a8680; --amber:#f5a623; --red:#e8472a; --green:#4ade80
CTA accent gradient: linear-gradient(135deg,#f5a623,#e8472a)
Google Fonts: 'DM Serif Display' (headings), 'Instrument Sans' (body), 'JetBrains Mono' (labels/eyebrows).

Self-contained: all CSS in one <style> tag, fully mobile-responsive, no JS frameworks, no external dependencies except the Google Fonts <link>.`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8000,
          system: [{ type: 'text', text: LAUNCHKIT_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: userPrompt }],
        }),
      })
      const data = await res.json()
      const text = data.content?.map(c => c.text || '').join('') || ''
      const html = text.replace(/```html|```/g, '').trim()
      if (!html) throw new Error('empty')
      setLkHtml(html)
    } catch (e) {
      setLkGated(false)
      setLkHtml('')
      setLkGateMsg('')
      setLkOpen(true)
      setLkDeployMsg('⚠ Landing page generation failed. Close and try again.')
    }
    setLkLoading(false)
  }

  const downloadLaunchKit = () => {
    const blob = new Blob([lkHtml], { type: 'text/html;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${lkSlug || 'landing'}.html`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const deployLaunchKit = () => {
    setLkDeployMsg(`Auto-deploy is coming soon. For now: download the .html and drop it into Cloudflare Pages — it'll live at craftlauncher.dev/${lkSlug}.`)
  }

  const closeLaunchKit = () => { setLkOpen(false); setLkHtml(''); setLkGated(false); setLkDeployMsg('') }

  // ── LaunchDeck ──────────────────────────────────────────────────────────────
  const deckSlug = () => ((form.productName || 'launchdeck').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'launchdeck')

  const generateLaunchDeck = async () => {
    if (!userEmail || !userEmail.includes('@')) { alert('Enter your email on the Compose tab first.'); return }
    setLdOpen(true); setLdGated(false); setLdHtml(''); setLdMd(''); setLdError(''); setLdView('preview'); setLdLoading(true)
    try {
      // 1. Launcher-only gate (Worker)
      const gate = await fetch(`${WORKER_URL}/launchdeck/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-LaunchCraft-Token': LC_TOKEN, 'X-User-Email': userEmail },
        body: JSON.stringify({ brief: form, traction }),
      })
      const gateData = await gate.json()
      if (!gate.ok || !gateData.allowed) {
        setLdGated(true)
        setLdGateMsg(gateData.upgradeMessage || 'LaunchDeck is a Launcher feature.')
        setLdLoading(false)
        return
      }

      // 2. Generate the one-pager HTML client-side (constraint #9 — key lives in the artifact env)
      const hasTraction = traction.mrr || traction.users || traction.keyMetric || traction.launchDate
      const userPrompt = `Generate a founder-voiced investor one-pager for this product.

Product:
- Name: ${form.productName}
- Tagline: ${form.tagline || 'N/A'}
- URL: ${form.url || 'N/A'}
- Problem: ${form.problem}
- Solution: ${form.solution}
- Audience: ${form.audience || 'N/A'}
- Tech stack: ${form.techStack || 'N/A'}
- Pricing / revenue model: ${form.pricing || 'N/A'}

Founder & contact:
- Founder name: ${traction.founderName || 'N/A'}
- Email: ${userEmail}
- Twitter/X: ${traction.twitter || 'N/A'}

Traction (${hasTraction ? 'use these real numbers — lead with them' : 'none provided — be honest about early stage'}):
- MRR: ${traction.mrr || 'N/A'}
- Users / signups: ${traction.users || 'N/A'}
- Launch date: ${traction.launchDate || 'N/A'}
- Key metric: ${traction.keyMetric || 'N/A'}
- Ask: ${traction.ask || 'N/A'}

Sections, in this exact order:
1. Header — product name, tagline, URL, founder name
2. Problem — 2-3 sentences, specific pain
3. Solution — what it does, for whom, how it's different
4. Traction — numbers if provided, otherwise "Early stage, launched ${traction.launchDate || '[date]'}"
5. Market — who else has this problem (1 paragraph)
6. Business model — pricing, revenue model
7. Ask — what you want from the reader${traction.ask ? `: ${traction.ask}` : ' (omit this section if no ask was provided)'}
8. Contact — email, URL${traction.twitter ? ', Twitter' : ''}

Formatting: clean, print-ready, ONE page. Light background, professional typography, generous whitespace. Self-contained single HTML file — all CSS inline in a <style> tag, no external dependencies.`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          system: [{ type: 'text', text: LAUNCHDECK_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: userPrompt }],
        }),
      })
      const data = await res.json()
      const html = (data.content?.map(c => c.text || '').join('') || '').replace(/```html|```/g, '').trim()
      if (!html) throw new Error('empty')
      setLdHtml(html)

      // 3. Derive a clean markdown version from the HTML (cheap haiku call, best-effort)
      try {
        const mdRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 2000,
            messages: [{ role: 'user', content: `Convert this investor one-pager into clean Markdown for pasting into a cold email. Preserve every section, heading, and number exactly. Respond with ONLY Markdown — no code fences, no preamble.\n\n${html}` }],
          }),
        })
        const mdData = await mdRes.json()
        const md = (mdData.content?.map(c => c.text || '').join('') || '').replace(/```markdown|```/g, '').trim()
        setLdMd(md)
      } catch { /* markdown is best-effort */ }
    } catch (e) {
      setLdError('⚠ One-pager generation failed. Close and try again.')
    }
    setLdLoading(false)
  }

  const downloadDeck = (kind) => {
    const isMd = kind === 'md'
    const blob = new Blob([isMd ? ldMd : ldHtml], { type: isMd ? 'text/markdown;charset=utf-8' : 'text/html;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${deckSlug()}-onepager.${isMd ? 'md' : 'html'}`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const closeLaunchDeck = () => { setLdOpen(false); setLdHtml(''); setLdMd(''); setLdGated(false); setLdError('') }

  // ── LaunchThread ────────────────────────────────────────────────────────────
  // Pre-fill product name / URL from the last brief when opening the Thread tab
  useEffect(() => {
    if (tab !== 'thread') return
    setThreadForm(t => ({
      ...t,
      productName: t.productName || form.productName || '',
      url:         t.url || form.url || '',
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const generateThread = async () => {
    if (!threadForm.shipped || !threadForm.learned || !threadForm.next) return
    setUsageError('')
    const allowed = await checkGenerationGate() // counts toward the 3 free sessions
    if (!allowed) return

    setLoading(true)
    setResultMode('thread')
    setTab('results')
    setPosts({})
    setActivePlatform(null)

    const userPrompt = `Generate platform-native weekly build-in-public posts for a founder.

This week:
- What I shipped: ${threadForm.shipped}
- What I learned: ${threadForm.learned}
- What's next: ${threadForm.next}
- Product: ${threadForm.productName || 'N/A'}
- URL: ${threadForm.url || 'N/A'}${threadForm.url ? ' ← include this URL in every post' : ''}
- Tone: ${threadForm.tone}

Platform style guides:
- twitter: numbered thread (1/, 2/, 3/), hook on tweet 1, specific details, end with a question
- indiehackers: transparent founder update — lead with what you learned, be honest about failures
- linkedin: professional but personal, short paragraphs, what this means for customers
- peerlist: maker-to-maker tone, stack details welcome

Optionally include a "hackernews" key ONLY if there is something genuinely technically interesting this week (Show HN style, title under 80 chars on the first line); otherwise omit it entirely.

Respond ONLY with valid JSON: {"twitter":"…","indiehackers":"…","linkedin":"…","peerlist":"…"} plus optional "hackernews".`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          system: [{ type: 'text', text: THREAD_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: userPrompt }],
        }),
      })
      const data = await res.json()
      const text  = data.content?.map(c => c.text || '').join('') || ''
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      setPosts(parsed)
      const order = [...THREAD_CORE_IDS, 'hackernews']
      setActivePlatform(order.find(id => parsed[id]) || null)
      if (isMobile) setDrawerOpen(true)
    } catch (e) {
      setPosts({ _error: 'Generation failed. Please try again.' })
    }
    setLoading(false)
  }

  const regenThreadOne = async (platform) => {
    if (!platform) return
    setPosts(prev => ({ ...prev, [platform.id]: '⏳ Regenerating…' }))
    const prompt = `Write a single ${platform.name} build-in-public weekly update post — a transparent progress update, NOT a launch announcement.
This week — shipped: ${threadForm.shipped}. Learned: ${threadForm.learned}. Next: ${threadForm.next}.
Product: ${threadForm.productName || 'N/A'}. URL: ${threadForm.url || 'N/A'}. Tone: ${threadForm.tone}.
Style: ${platform.desc}
Respond with ONLY the post text.`
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 600, messages: [{ role: 'user', content: prompt }] }),
      })
      const data = await res.json()
      const t = data.content?.map(c => c.text || '').join('') || ''
      setPosts(prev => ({ ...prev, [platform.id]: t.trim() }))
    } catch {
      setPosts(prev => ({ ...prev, [platform.id]: 'Error regenerating.' }))
    }
  }

  // ── Generate ──────────────────────────────────────────────────────────────
  const generatePosts = async () => {
    if (!form.productName || !form.problem || !form.solution) return
    setUsageError('')
    const allowed = await checkGenerationGate()
    if (!allowed) return

    const platforms = usage.plan === 'free'
      ? FREE_PLATFORM_IDS.map(id => PLATFORMS.find(p => p.id === id)).filter(Boolean)
      : PLATFORMS.filter(p => selectedIds.includes(p.id))

    setLoading(true)
    setResultMode('compose')
    setTab('results')
    setPosts({})
    setActivePlatform(null)

    const userPrompt = `Generate platform-native launch posts for this product.

Product:
- Name: ${form.productName}
- Tagline: ${form.tagline || 'N/A'}
- Problem: ${form.problem}
- Solution: ${form.solution}
- Audience: ${form.audience || 'developers and makers'}
- Tech stack: ${form.techStack || 'N/A'}
- Pricing: ${form.pricing || 'N/A'}
- URL: ${form.url || 'N/A'} ← MUST include this URL in every post
- Tone: ${form.tone}

Platform style guides:
${platforms.map(p => `- ${p.name} (id: ${p.id}): ${p.desc}`).join('\n')}

Rules:
- Hacker News: start with "Show HN:" and keep title under 80 chars total
- Twitter/X: numbered thread (1/, 2/, 3/) or single tweet under 280 chars
- Reddit: title line, then ---, then body
- LinkedIn: short paragraphs, line breaks

Respond ONLY with valid JSON:
{${platforms.map(p => `"${p.id}":"post here"`).join(',')}}`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: userPrompt }],
        }),
      })
      const data = await res.json()
      const text  = data.content?.map(c => c.text || '').join('') || ''
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      setPosts(parsed)
      setActivePlatform(platforms[0]?.id)
      if (isMobile) setDrawerOpen(true)
      // Save the session to LaunchVault (fire-and-forget)
      const cleanPosts = Object.fromEntries(
        Object.entries(parsed).filter(([k, v]) => k !== '_error' && typeof v === 'string' && !v.startsWith('⏳'))
      )
      if (Object.keys(cleanPosts).length) saveSession({ ...form }, cleanPosts, platforms.map(p => p.id), 'launch')
    } catch(e) {
      setPosts({ _error: 'Generation failed. Please try again.' })
    }
    setLoading(false)
  }

  // ── PostFlow generation ─────────────────────────────────────────────────────
  const generatePostFlow = async () => {
    if (!pfForm.businessName || !pfForm.serviceType || !pfForm.differentiation || !pfForm.bookingLink) return
    setUsageError('')
    const allowed = await checkGenerationGate() // same 3-session free gate as Launcher
    if (!allowed) return

    const platforms = usage.plan === 'free'
      ? FREE_POSTFLOW_PLATFORM_IDS.map(id => POSTFLOW_PLATFORMS.find(p => p.id === id)).filter(Boolean)
      : POSTFLOW_PLATFORMS.filter(p => pfSelectedIds.includes(p.id))

    setLoading(true)
    setResultMode('postflow')
    setTab('results')
    setPosts({})
    setActivePlatform(null)

    const cta = bookingCTA(pfForm.bookingLink)
    const userPrompt = `Generate platform-native posts for this local service business.

Business:
- Name: ${pfForm.businessName}
- Service type: ${pfForm.serviceType}
- What makes them different: ${pfForm.differentiation}
- Location/service area: ${pfForm.location || 'N/A'}
- Price range: ${pfForm.priceRange || 'N/A'}
- Current promotion: ${pfForm.promotion || 'N/A'}
- Booking link: ${pfForm.bookingLink || 'N/A'} ← MUST include in every post
- Tone: ${pfForm.tone}

Booking CTA style (use this phrasing for the call to action): "${cta}"

Platform style guides:
${platforms.map(p => `- ${p.name}: ${p.desc}`).join('\n')}

CRITICAL: The booking link must appear in every single post.
Respond with valid JSON only: {${platforms.map(p => `"${p.id}":"post here"`).join(',')}}`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          system: [{ type: 'text', text: POSTFLOW_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: userPrompt }],
        }),
      })
      const data = await res.json()
      const text  = data.content?.map(c => c.text || '').join('') || ''
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      setPosts(parsed)
      setActivePlatform(platforms[0]?.id)
      if (isMobile) setDrawerOpen(true)
      const cleanPosts = Object.fromEntries(
        Object.entries(parsed).filter(([k, v]) => k !== '_error' && typeof v === 'string' && !v.startsWith('⏳'))
      )
      if (Object.keys(cleanPosts).length) saveSession({ ...pfForm }, cleanPosts, platforms.map(p => p.id), 'postflow')
    } catch(e) {
      setPosts({ _error: 'Generation failed. Please try again.' })
    }
    setLoading(false)
  }

  const regenPostFlowOne = async (platform) => {
    if (!platform) return
    setPosts(prev => ({ ...prev, [platform.id]: '⏳ Regenerating…' }))
    const cta = bookingCTA(pfForm.bookingLink)
    const prompt = `Write a single ${platform.name} post for a local service business. Style: ${platform.desc}
Business: ${pfForm.businessName}. Service: ${pfForm.serviceType}. Different: ${pfForm.differentiation}. Location: ${pfForm.location}. Price: ${pfForm.priceRange}. Promo: ${pfForm.promotion}. Tone: ${pfForm.tone}.
The booking link MUST appear in the post. Booking CTA style: "${cta}"
Respond with ONLY the post text.`
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 600, messages: [{ role: 'user', content: prompt }] }),
      })
      const data = await res.json()
      const t = data.content?.map(c => c.text || '').join('') || ''
      setPosts(prev => ({ ...prev, [platform.id]: t.trim() }))
    } catch {
      setPosts(prev => ({ ...prev, [platform.id]: 'Error regenerating.' }))
    }
  }

  const regenOne = async (platform) => {
    if (!platform) return
    setPosts(prev => ({ ...prev, [platform.id]: '⏳ Regenerating…' }))
    const prompt = `Write a single ${platform.name} post. Style: ${platform.desc}
Product: ${form.productName}. ${form.tagline}. Problem: ${form.problem}. Solution: ${form.solution}. Audience: ${form.audience}. Tech: ${form.techStack}. Price: ${form.pricing}. URL: ${form.url}. Tone: ${form.tone}.
Respond with ONLY the post text.`
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 600, messages: [{ role: 'user', content: prompt }] }),
      })
      const data = await res.json()
      const t = data.content?.map(c => c.text || '').join('') || ''
      setPosts(prev => ({ ...prev, [platform.id]: t.trim() }))
    } catch {
      setPosts(prev => ({ ...prev, [platform.id]: 'Error regenerating.' }))
    }
  }

  const copyPost = (text) => {
    const fallback = () => {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0'
      document.body.appendChild(ta)
      ta.focus(); ta.select()
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch(e) {}
      document.body.removeChild(ta)
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(fallback)
    } else { fallback() }
  }

  const autoPost = async (platformId) => {
    const postText = posts[platformId]
    if (!postText || !userEmail) return
    setPostStatus(prev => ({ ...prev, [platformId]: 'posting' }))
    try {
      const bodyMap = {
        reddit:   { title: form.productName, text: postText, subreddit: 'SaaS' },
        linkedin: { text: postText },
        twitter:  { text: postText },
        devto:    { title: form.productName, body: postText, tags: ['showdev', 'webdev'], published: false },
      }
      const res = await fetch(`${WORKER_URL}/post/${platformId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-LaunchCraft-Token': LC_TOKEN, 'X-User-Email': userEmail },
        body: JSON.stringify({ ...(bodyMap[platformId] || { text: postText }), sessionId: currentSessionId || undefined }),
      })
      const data = await res.json()
      if (res.status === 429) {
        setUsageError(data.upgradeMessage || 'Post limit reached.')
        setPostStatus(prev => ({ ...prev, [platformId]: 'error' }))
      } else if (data.success) {
        setPostStatus(prev => ({ ...prev, [platformId]: 'posted' }))
        if (data.usage) setUsage(prev => ({ ...prev, postsThisPeriod: data.usage.used, postsRemaining: data.usage.remaining }))
      } else {
        setPostStatus(prev => ({ ...prev, [platformId]: 'error' }))
      }
    } catch { setPostStatus(prev => ({ ...prev, [platformId]: 'error' })) }
  }

  // ── Platform list for results sidebar ─────────────────────────────────────
  const resultPlatforms = resultMode === 'thread'
    ? [...THREAD_CORE_IDS, ...(posts.hackernews ? ['hackernews'] : [])].map(id => findPlatform(id)).filter(Boolean)
    : resultMode === 'postflow'
      ? (usage.plan === 'free'
          ? FREE_POSTFLOW_PLATFORM_IDS.map(id => findPlatform(id)).filter(Boolean)
          : POSTFLOW_PLATFORMS.filter(p => pfSelectedIds.includes(p.id)))
      : usage.plan === 'free'
        ? FREE_PLATFORM_IDS.map(id => findPlatform(id)).filter(Boolean)
        : PLATFORMS.filter(p => selectedIds.includes(p.id))

  const activePlatformData = findPlatform(activePlatform)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>

      {/* ── Header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: isMobile ? '12px 16px' : '14px 24px',
        borderBottom: `1px solid ${C.border}`, background: C.bg, flexShrink: 0,
        paddingTop: `calc(12px + var(--sat))`,
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#f5a623,#e8472a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, flexShrink: 0 }}>✦</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, letterSpacing: '-.3px', fontFamily: "'DM Serif Display', serif" }}>CraftLauncher</div>
          {!isMobile && <div style={{ fontSize: 10, color: C.text3, letterSpacing: '1px', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>{mode === 'postflow' ? 'Your services. Every platform.' : 'More platforms. Less writing.'}</div>}
        </div>
        <nav style={{ display: 'flex', gap: isMobile ? 4 : 8 }}>
          {[
            ['compose', isMobile ? '✍' : '✍ Compose'],
            ['results', isMobile ? `📄${doneCount > 0 ? doneCount : ''}` : `📄 Posts${doneCount > 0 ? ` (${doneCount})` : ''}${loading ? ' ⏳' : ''}`],
            ['vault', isMobile ? '🗄' : '🗄 Vault'],
            ['thread', isMobile ? '🧵' : '🧵 Thread'],
            ['automate', isMobile ? '⚡' : '⚡ Automate'],
          ].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              ...btn(tab === t), fontSize: isMobile ? 13 : 12,
              padding: isMobile ? '8px 10px' : '6px 14px', minHeight: 36,
            }}>
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Body ── */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', position: 'relative' }}>

        {/* ══ COMPOSE TAB ══ */}
        {tab === 'compose' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 16px' : '32px 40px' }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              {/* Mode selector */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {[
                  ['launch',   '🚀 Product Launch'],
                  ['postflow', '💈 PostFlow'],
                ].map(([m, label]) => (
                  <button key={m} onClick={() => setMode(m)} style={{ ...btn(mode === m), borderRadius: 20, padding: '8px 18px', minHeight: 38, fontSize: 13 }}>{label}</button>
                ))}
              </div>

              {mode === 'launch' ? (
                <>
                  <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: isMobile ? 28 : 36, fontWeight: 400, lineHeight: 1.1, marginBottom: 6, letterSpacing: '-.5px' }}>
                    One brief.<br/><span style={{ color: C.amber }}>
                      {usage.plan === 'free' ? '5 platforms free.' : `${PLATFORMS.length} platforms.`}
                    </span>
                  </h1>
                  <p style={{ color: C.text2, fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                    {usage.plan === 'free'
                      ? 'Describe your product once. Get tailored posts for 5 top communities. Upgrade for all 18+.'
                      : 'Describe your product once. Get tailored posts for every community.'}
                  </p>
                </>
              ) : (
                <>
                  <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: isMobile ? 28 : 36, fontWeight: 400, lineHeight: 1.1, marginBottom: 6, letterSpacing: '-.5px' }}>
                    Your services.<br/><span style={{ color: C.amber }}>Every platform.</span>
                  </h1>
                  <p style={{ color: C.text2, fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                    Tell people about your services. Send them to your booking page.
                  </p>
                </>
              )}

              <UsageBar usage={usage} userEmail={userEmail} setUserEmail={setUserEmail} loadUsage={loadUsage} usageError={usageError} onUpgrade={handleUpgrade} />

              {/* Form fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {mode === 'launch' && (<>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                  {[
                    ['productName', 'Product Name *', 'e.g. RealityDB', false],
                    ['tagline',     'Tagline',         'e.g. Synthetic data for SQL learners', false],
                    ['url',         'URL',             'https://realitydb.dev', false],
                    ['pricing',     'Pricing',         'e.g. Free + $39/module', false],
                  ].map(([k, label, ph]) => (
                    <div key={k}>
                      <label style={{ display: 'block', fontSize: 11, color: C.text3, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>{label}</label>
                      <input value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={ph} style={input} />
                    </div>
                  ))}
                </div>
                {[
                  ['problem',  'Problem it solves *', 'What pain does this eliminate?', 3],
                  ['solution', 'What it does *',       'How does it solve the problem?', 3],
                  ['audience', 'Target Audience',      'e.g. SQL learners, data teams', 2],
                  ['techStack','Tech Stack',            'e.g. Cloudflare Workers, Neon Postgres', 2],
                ].map(([k, label, ph, rows]) => (
                  <div key={k}>
                    <label style={{ display: 'block', fontSize: 11, color: C.text3, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>{label}</label>
                    <textarea value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={ph} rows={rows} style={{ ...input, resize: 'vertical' }} />
                  </div>
                ))}

                {/* Tone */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: C.text3, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>Tone</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {TONES.map(t => (
                      <button key={t} onClick={() => setForm(f => ({ ...f, tone: t }))} style={{ ...btn(form.tone === t), borderRadius: 20, padding: '6px 16px', minHeight: 36 }}>{t}</button>
                    ))}
                  </div>
                </div>

                {/* Traction (optional — powers LaunchDeck) */}
                <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: C.bg2, overflow: 'hidden' }}>
                  <button
                    onClick={() => setTractionOpen(o => !o)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>📑 Traction <span style={{ fontSize: 11, color: C.text3, fontWeight: 400 }}>— optional, for LaunchDeck</span></div>
                      <div style={{ fontSize: 11, color: C.text3, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>Numbers make your investor one-pager land harder.</div>
                    </div>
                    <span style={{ fontSize: 13, color: C.text3, transform: tractionOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>›</span>
                  </button>
                  {tractionOpen && (
                    <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                      {[
                        ['mrr',         'MRR ($)',          'e.g. $1,200'],
                        ['users',       'Users / signups',  'e.g. 340 signups'],
                        ['launchDate',  'Launch date',      'e.g. May 2026'],
                        ['keyMetric',   'Key metric',       'e.g. 47% week-over-week growth'],
                        ['ask',         'Ask (optional)',   'e.g. $50K pre-seed, YC application'],
                        ['founderName', 'Founder name',     'e.g. Eddy Mkwambe'],
                        ['twitter',     'Twitter / X',      'e.g. @mathoslab'],
                      ].map(([k, label, ph]) => (
                        <div key={k}>
                          <label style={{ display: 'block', fontSize: 11, color: C.text3, letterSpacing: '.6px', textTransform: 'uppercase', marginBottom: 5, fontFamily: "'JetBrains Mono', monospace" }}>{label}</label>
                          <input value={traction[k]} onChange={e => setTraction(t => ({ ...t, [k]: e.target.value }))} placeholder={ph} style={input} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Platforms */}
                <PlatformGrid plan={usage.plan} selectedIds={selectedIds} onToggle={id => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])} onUpgrade={handleUpgrade} />

                {/* Generate button */}
                <button
                  onClick={generatePosts}
                  disabled={!form.productName || !form.problem || !form.solution}
                  style={{
                    width: '100%', padding: '16px', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg,#f5a623,#e8472a)', color: '#080808',
                    fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '-.3px',
                    opacity: (!form.productName || !form.problem || !form.solution) ? .4 : 1,
                    minHeight: 52, fontFamily: "'Instrument Sans', system-ui, sans-serif",
                    transition: 'opacity .2s, transform .15s',
                  }}
                >
                  Generate {usage.plan === 'free' ? '5' : selectedIds.length} Posts ✦
                  {usage.plan === 'free' && <span style={{ fontSize: 11, marginLeft: 8, opacity: .7 }}>({usage.generationsRemaining ?? 3} sessions left)</span>}
                </button>
                </>)}

                {/* ── PostFlow form ── */}
                {mode === 'postflow' && (<>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: C.text3, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>Business Name *</label>
                    <input value={pfForm.businessName} onChange={e => setPfForm(f => ({ ...f, businessName: e.target.value }))} placeholder="Keisha's Knotless Studio" style={input} />
                  </div>
                  {[
                    ['serviceType',     'Service Type *',             'Knotless box braids, locs, twists, protective styles', 2],
                    ['differentiation', 'What Makes You Different *', '10+ years experience, gentle on natural hair, no shedding products', 2],
                  ].map(([k, label, ph, rows]) => (
                    <div key={k}>
                      <label style={{ display: 'block', fontSize: 11, color: C.text3, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>{label}</label>
                      <textarea value={pfForm[k]} onChange={e => setPfForm(f => ({ ...f, [k]: e.target.value }))} placeholder={ph} rows={rows} style={{ ...input, resize: 'vertical' }} />
                    </div>
                  ))}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                    {[
                      ['location',   'Location / Service Area', 'Charlotte, NC — also mobile in Mecklenburg County'],
                      ['priceRange', 'Price Range',             'Box braids from $150 · Locs from $200'],
                    ].map(([k, label, ph]) => (
                      <div key={k}>
                        <label style={{ display: 'block', fontSize: 11, color: C.text3, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>{label}</label>
                        <input value={pfForm[k]} onChange={e => setPfForm(f => ({ ...f, [k]: e.target.value }))} placeholder={ph} style={input} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: C.text3, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>Current Promotion</label>
                    <input value={pfForm.promotion} onChange={e => setPfForm(f => ({ ...f, promotion: e.target.value }))} placeholder="Book before July 4th — 15% off first visit" style={input} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: C.text3, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>Booking Link *</label>
                    <input value={pfForm.bookingLink} onChange={e => setPfForm(f => ({ ...f, bookingLink: e.target.value }))} placeholder="https://booksy.com/en-us/your-profile OR square link OR calendly" style={input} />
                    {pfForm.bookingLink && (
                      <div style={{ fontSize: 11, color: C.amber, marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>↳ CTA: {bookingCTA(pfForm.bookingLink)}</div>
                    )}
                  </div>

                  {/* Tone */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: C.text3, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>Tone</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {POSTFLOW_TONES.map(t => (
                        <button key={t} onClick={() => setPfForm(f => ({ ...f, tone: t }))} style={{ ...btn(pfForm.tone === t), borderRadius: 20, padding: '6px 16px', minHeight: 36 }}>{t}</button>
                      ))}
                    </div>
                  </div>

                  {/* Platforms */}
                  <PlatformGrid plan={usage.plan} selectedIds={pfSelectedIds} onToggle={id => setPfSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])} onUpgrade={handleUpgrade} allPlatforms={POSTFLOW_PLATFORMS} freeIds={FREE_POSTFLOW_PLATFORM_IDS} />

                  {/* Generate */}
                  <button
                    onClick={generatePostFlow}
                    disabled={!pfForm.businessName || !pfForm.serviceType || !pfForm.differentiation || !pfForm.bookingLink}
                    style={{
                      width: '100%', padding: '16px', borderRadius: 10, border: 'none',
                      background: 'linear-gradient(135deg,#f5a623,#e8472a)', color: '#080808',
                      fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '-.3px',
                      opacity: (!pfForm.businessName || !pfForm.serviceType || !pfForm.differentiation || !pfForm.bookingLink) ? .4 : 1,
                      minHeight: 52, fontFamily: "'Instrument Sans', system-ui, sans-serif",
                    }}
                  >
                    Generate {usage.plan === 'free' ? '5' : pfSelectedIds.length} Posts 💈
                    {usage.plan === 'free' && <span style={{ fontSize: 11, marginLeft: 8, opacity: .7 }}>({usage.generationsRemaining ?? 3} sessions left)</span>}
                  </button>
                </>)}
              </div>

              {/* Bottom safe area */}
              <div style={{ height: `calc(20px + var(--sab))` }} />
            </div>
          </div>
        )}

        {/* ══ RESULTS TAB ══ */}
        {tab === 'results' && (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* Sidebar — desktop only */}
            {!isMobile && (
              <div style={{ width: 200, borderRight: `1px solid ${C.border}`, overflowY: 'auto', flexShrink: 0, padding: '20px 0' }}>
                <div style={{ padding: '0 14px 10px', fontSize: 10, color: C.text3, letterSpacing: '1px', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>Posts</div>
                {resultPlatforms.map(p => {
                  const isActive = activePlatform === p.id
                  const isDone   = posts[p.id] && !posts[p.id].startsWith('⏳')
                  return (
                    <button key={p.id} onClick={() => setActivePlatform(p.id)} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                      padding: '10px 14px', background: isActive ? C.bg2 : 'none', border: 'none',
                      borderLeft: `3px solid ${isActive ? p.color : 'transparent'}`, cursor: 'pointer', textAlign: 'left',
                    }}>
                      <span style={{ fontSize: 16 }}>{p.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: isActive ? C.text : C.text2, fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      </div>
                      {loading && !isDone && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#444', animation: 'pulse 1s infinite', flexShrink: 0 }} />}
                      {isDone && <span style={{ color: C.green, fontSize: 10, flexShrink: 0 }}>✓</span>}
                    </button>
                  )
                })}
                {loading && <div style={{ padding: '12px 14px', fontSize: 11, color: C.text3 }}>Generating…</div>}
              </div>
            )}

            {/* Main content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 16px' : '28px 36px' }}>

              {/* Loading state */}
              {loading && Object.keys(posts).length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 16 }}>
                  <div style={{ fontSize: 32, animation: 'spin 2s linear infinite' }}>✦</div>
                  <div style={{ color: C.text, fontSize: 15, fontWeight: 600 }}>Crafting platform-native posts…</div>
                  <div style={{ color: C.text3, fontSize: 12, textAlign: 'center', maxWidth: 280, lineHeight: 1.6, fontFamily: "'JetBrains Mono', monospace" }}>
                    Generating {resultPlatforms.length}{resultMode === 'thread' ? ' build-in-public' : ''} tailored posts.<br/>
                    Usually 10–20 seconds.
                  </div>
                </div>
              )}

              {/* Mobile: platform chips */}
              {isMobile && !loading && resultPlatforms.length > 0 && (
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16, marginBottom: 8, WebkitOverflowScrolling: 'touch' }}>
                  {resultPlatforms.map(p => {
                    const isDone = posts[p.id] && !posts[p.id].startsWith('⏳')
                    return (
                      <button key={p.id} onClick={() => setActivePlatform(p.id)} style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
                        borderRadius: 20, border: `1px solid ${activePlatform === p.id ? p.color : C.border2}`,
                        background: activePlatform === p.id ? `${p.color}18` : C.bg2,
                        cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, minHeight: 36,
                      }}>
                        <span style={{ fontSize: 14 }}>{p.icon}</span>
                        <span style={{ fontSize: 12, color: activePlatform === p.id ? C.text : C.text2 }}>{p.name}</span>
                        {isDone && <span style={{ color: C.green, fontSize: 10 }}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Post viewer */}
              {activePlatform && posts[activePlatform] && activePlatformData && (
                <PostViewer
                  platform={activePlatformData}
                  post={posts[activePlatform]}
                  onCopy={copyPost}
                  onRegen={() => (resultMode === 'thread' ? regenThreadOne(activePlatformData) : resultMode === 'postflow' ? regenPostFlowOne(activePlatformData) : regenOne(activePlatformData))}
                  onAutoPost={autoPost}
                  postStatus={postStatus[activePlatform]}
                  copied={copied}
                  connectedApis={connectedApis}
                  plan={usage.plan}
                  onConnect={() => setTab('automate')}
                  onLaunchKit={resultMode === 'compose' ? generateLaunchKit : undefined}
                  launchKitLoading={lkLoading}
                  onLaunchDeck={resultMode === 'compose' ? generateLaunchDeck : undefined}
                  launchDeckLoading={ldLoading}
                />
              )}

              {!loading && !activePlatform && Object.keys(posts).length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 12 }}>
                  <div style={{ fontSize: 32, opacity: .3 }}>📄</div>
                  <div style={{ color: C.text3, fontSize: 14 }}>No posts yet — go to Compose to generate</div>
                  <button onClick={() => setTab('compose')} style={{ ...btn(false), marginTop: 8 }}>← Back to Compose</button>
                </div>
              )}

              <div style={{ height: `calc(20px + var(--sab))` }} />
            </div>
          </div>
        )}

        {/* ══ VAULT TAB ══ */}
        {tab === 'vault' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 16px' : '32px 40px' }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 12 }}>
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: isMobile ? 24 : 28, fontWeight: 400 }}>
                  {activeSession ? 'Saved launch' : 'Vault'}
                </h2>
                <span style={{ fontSize: 11, color: C.text3, fontFamily: "'JetBrains Mono', monospace" }}>
                  {vault.plan === 'launcher' ? '∞ unlimited history' : `last ${vault.limit} sessions`}
                </span>
              </div>
              <p style={{ color: C.text2, fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
                {activeSession ? 'Every post from this generation. Copy any, or reuse the brief as a template.'
                  : 'Every brief you generate is saved here. Reopen, copy, or reuse as a template.'}
              </p>

              {/* No email */}
              {(!userEmail || !userEmail.includes('@')) && (
                <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, opacity: .3, marginBottom: 10 }}>🗄</div>
                  <div style={{ color: C.text2, fontSize: 14, marginBottom: 12 }}>Enter your email on the Compose tab to track and save your launches.</div>
                  <button onClick={() => setTab('compose')} style={{ ...btn(false) }}>← Go to Compose</button>
                </div>
              )}

              {/* Loading */}
              {userEmail && userEmail.includes('@') && vaultLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '40px 0' }}>
                  <div style={{ fontSize: 26, animation: 'spin 2s linear infinite' }}>✦</div>
                  <div style={{ color: C.text3, fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>Loading your vault…</div>
                </div>
              )}

              {/* Session detail */}
              {userEmail && userEmail.includes('@') && !vaultLoading && activeSession && (
                <div style={{ animation: 'fadeIn .25s ease' }}>
                  <button onClick={() => { setSignal(null); setActiveSession(null) }} style={{ ...btn(false), marginBottom: 16 }}>← All launches</button>
                  <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>
                          {activeSession.mode === 'postflow' ? '💈 ' : '🚀 '}
                          {(activeSession.mode === 'postflow' ? activeSession.brief?.businessName : activeSession.brief?.productName) || 'Untitled'}
                        </div>
                        {activeSession.brief?.tagline && <div style={{ fontSize: 13, color: C.text2, marginTop: 3 }}>{activeSession.brief.tagline}</div>}
                        <div style={{ fontSize: 11, color: C.text3, marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                          {new Date(activeSession.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <button onClick={() => useAsTemplate(activeSession)} style={{ ...btn(true, C.amber), fontSize: 12, whiteSpace: 'nowrap' }}>
                        ↻ Use as template
                      </button>
                    </div>
                  </div>

                  {/* LaunchSignal — only for Launcher sessions with auto-posted content */}
                  {vault.plan === 'launcher' && activeSession.postedIds && Object.keys(activeSession.postedIds).length > 0 && (
                    <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: (signal || signalLoading) ? 14 : 0 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>📊 LaunchSignal</div>
                          <div style={{ fontSize: 11, color: C.text3, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>Engagement across your auto-posted platforms</div>
                        </div>
                        <button onClick={() => loadSignal(activeSession.id)} disabled={signalLoading} style={{ ...btn(true, C.amber), fontSize: 12, whiteSpace: 'nowrap', opacity: signalLoading ? .6 : 1 }}>
                          {signalLoading ? 'Loading…' : signal ? '↻ Refresh' : 'Load Signal'}
                        </button>
                      </div>

                      {signal && signal.error && (
                        <div style={{ fontSize: 13, color: C.red }}>{signal.error}</div>
                      )}

                      {signal && !signal.error && signal.ready === false && (
                        <div style={{ fontSize: 13, color: C.amber, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6 }}>
                          ⏳ {signal.message || `Signal available in ${signal.hoursRemaining} hours`}<br/>
                          <span style={{ color: C.text3 }}>Metrics mature 24h after posting.</span>
                        </div>
                      )}

                      {signal && !signal.error && signal.ready === true && (
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 12 }}>
                            {signal.platforms?.twitter && (
                              <div style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 14px' }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 }}>𝕏 Twitter</div>
                                {signal.platforms.twitter.error
                                  ? <div style={{ fontSize: 11, color: C.text3 }}>{signal.platforms.twitter.error}</div>
                                  : <div style={{ fontSize: 12, color: C.text2, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.7 }}>
                                      {signal.platforms.twitter.impressions ?? 0} impressions<br/>
                                      {signal.platforms.twitter.likes ?? 0} likes · {signal.platforms.twitter.retweets ?? 0} RTs
                                    </div>}
                              </div>
                            )}
                            {signal.platforms?.reddit && (
                              <div style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 14px' }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 }}>👾 Reddit</div>
                                {signal.platforms.reddit.error
                                  ? <div style={{ fontSize: 11, color: C.text3 }}>{signal.platforms.reddit.error}</div>
                                  : <div style={{ fontSize: 12, color: C.text2, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.7 }}>
                                      {signal.platforms.reddit.upvotes ?? 0} upvotes<br/>
                                      {signal.platforms.reddit.comments ?? 0} comments
                                    </div>}
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: signal.best ? C.green : C.text3, fontWeight: 600 }}>
                            {signal.best ? `🏆 Best platform: ${signal.best}` : signal.message}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {Object.entries(activeSession.posts || {}).map(([pid, text]) => {
                      const p = findPlatform(pid)
                      return (
                        <div key={pid} style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                              <span style={{ fontSize: 16 }}>{p?.icon || '•'}</span>
                              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p?.name || pid}</span>
                            </div>
                            <button onClick={() => copyPost(text)} style={{ ...btn(false, C.green), fontSize: 11, padding: '6px 12px' }}>Copy</button>
                          </div>
                          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: "'Instrument Sans', system-ui, sans-serif", fontSize: 13, lineHeight: 1.7, color: '#bbb' }}>
                            {text}
                          </pre>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Session list */}
              {userEmail && userEmail.includes('@') && !vaultLoading && !activeSession && (
                <>
                  {vault.sessions.length === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '40px 0' }}>
                      <div style={{ fontSize: 32, opacity: .3 }}>🗄</div>
                      <div style={{ color: C.text3, fontSize: 14 }}>No saved launches yet — generate posts to fill your vault</div>
                      <button onClick={() => setTab('compose')} style={{ ...btn(false), marginTop: 4 }}>← Back to Compose</button>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {vault.sessions.map(s => {
                      const ids = s.platforms && s.platforms.length ? s.platforms : Object.keys(s.posts || {})
                      return (
                        <button key={s.id} onClick={() => { setSignal(null); setActiveSession(s) }} style={{
                          display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', textAlign: 'left',
                          background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10, cursor: 'pointer', width: '100%',
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {s.mode === 'postflow' ? '💈 ' : '🚀 '}
                              {(s.mode === 'postflow' ? s.brief?.businessName : s.brief?.productName) || 'Untitled'}
                            </div>
                            <div style={{ fontSize: 11, color: C.text3, marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>
                              {new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · {ids.length} post{ids.length === 1 ? '' : 's'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                            {ids.slice(0, 6).map(id => (
                              <span key={id} style={{ fontSize: 14 }} title={findPlatform(id)?.name || id}>
                                {findPlatform(id)?.icon || '•'}
                              </span>
                            ))}
                            {ids.length > 6 && <span style={{ fontSize: 11, color: C.text3, alignSelf: 'center' }}>+{ids.length - 6}</span>}
                          </div>
                          {vault.plan === 'launcher' && s.postedIds && Object.keys(s.postedIds).length > 0 && (
                            <span style={{ fontSize: 9, background: '#4ade8022', color: C.green, padding: '2px 6px', borderRadius: 4, border: '1px solid #4ade8044', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>📊 Signal</span>
                          )}
                          <span style={{ color: C.text3, fontSize: 14, flexShrink: 0 }}>›</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Locked rows + upgrade CTA for free users with more history */}
                  {vault.plan !== 'launcher' && vault.lockedCount > 0 && (
                    <div style={{ marginTop: 12 }}>
                      {Array.from({ length: Math.min(vault.lockedCount, 3) }).map((_, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', marginBottom: 10,
                          background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10,
                          filter: 'blur(1.5px)', opacity: .5, userSelect: 'none', pointerEvents: 'none',
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: C.text2 }}>████████ Launch</div>
                            <div style={{ fontSize: 11, color: C.text3, marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>•••• · ██ posts</div>
                          </div>
                          <span style={{ fontSize: 14 }}>🔒</span>
                        </div>
                      ))}
                      <div style={{ background: '#f5a62308', border: `1px solid ${C.amber}33`, borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.5 }}>
                          🔒 {vault.lockedCount} older launch{vault.lockedCount === 1 ? '' : 'es'} hidden — free keeps your last {vault.limit}.
                        </div>
                        <button onClick={handleUpgrade} style={{ ...btn(true, C.amber), fontSize: 12, whiteSpace: 'nowrap' }}>
                          Upgrade for full history →
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div style={{ height: `calc(20px + var(--sab))` }} />
            </div>
          </div>
        )}

        {/* ══ THREAD TAB ══ */}
        {tab === 'thread' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 16px' : '32px 40px' }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: isMobile ? 28 : 36, fontWeight: 400, lineHeight: 1.1, marginBottom: 6, letterSpacing: '-.5px' }}>
                3 sentences a week.<br/><span style={{ color: C.amber }}>5 communities stay warm.</span>
              </h1>
              <p style={{ color: C.text2, fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                Build-in-public, not launch hype. Drop this week's progress — get a transparent update tailored to each platform.
              </p>

              <UsageBar usage={usage} userEmail={userEmail} setUserEmail={setUserEmail} loadUsage={loadUsage} usageError={usageError} onUpgrade={handleUpgrade} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  ['shipped', 'What I shipped this week *', 'Launched the billing flow, fixed a CORS bug, wrote the privacy policy', 3],
                  ['learned', 'What I learned *',           "Lemon Squeezy's webhook fires faster than I expected. Custom data works perfectly.", 3],
                  ['next',    "What's next *",              'Post on Indie Hackers, build LaunchVault, onboard first 10 users', 3],
                ].map(([k, label, ph, rows]) => (
                  <div key={k}>
                    <label style={{ display: 'block', fontSize: 11, color: C.text3, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>{label}</label>
                    <textarea value={threadForm[k]} onChange={e => setThreadForm(f => ({ ...f, [k]: e.target.value }))} placeholder={ph} rows={rows} style={{ ...input, resize: 'vertical' }} />
                  </div>
                ))}

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                  {[
                    ['productName', 'Product Name', 'e.g. CraftLauncher'],
                    ['url',         'Product URL',  'https://craftlauncher.dev'],
                  ].map(([k, label, ph]) => (
                    <div key={k}>
                      <label style={{ display: 'block', fontSize: 11, color: C.text3, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>{label}</label>
                      <input value={threadForm[k]} onChange={e => setThreadForm(f => ({ ...f, [k]: e.target.value }))} placeholder={ph} style={input} />
                    </div>
                  ))}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, color: C.text3, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>Tone</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {TONES.map(t => (
                      <button key={t} onClick={() => setThreadForm(f => ({ ...f, tone: t }))} style={{ ...btn(threadForm.tone === t), borderRadius: 20, padding: '6px 16px', minHeight: 36 }}>{t}</button>
                    ))}
                  </div>
                </div>

                <div style={{ fontSize: 11, color: C.text3, lineHeight: 1.6, fontFamily: "'JetBrains Mono', monospace" }}>
                  → Generates for: 𝕏 Twitter · ⚙️ Indie Hackers · 💼 LinkedIn · 🌿 Peerlist (+ ▲ Hacker News if there's something technical)
                </div>

                <button
                  onClick={generateThread}
                  disabled={!threadForm.shipped || !threadForm.learned || !threadForm.next}
                  style={{
                    width: '100%', padding: '16px', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg,#f5a623,#e8472a)', color: '#080808',
                    fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '-.3px',
                    opacity: (!threadForm.shipped || !threadForm.learned || !threadForm.next) ? .4 : 1,
                    minHeight: 52, fontFamily: "'Instrument Sans', system-ui, sans-serif",
                  }}
                >
                  Generate Thread Posts 🧵
                  {usage.plan === 'free' && <span style={{ fontSize: 11, marginLeft: 8, opacity: .7 }}>({usage.generationsRemaining ?? 3} sessions left)</span>}
                </button>
              </div>

              <div style={{ height: `calc(20px + var(--sab))` }} />
            </div>
          </div>
        )}

        {/* ══ AUTOMATE TAB ══ */}
        {tab === 'automate' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 16px' : '32px 40px' }}>
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: isMobile ? 24 : 28, fontWeight: 400, marginBottom: 8 }}>API Connections</h2>
              <p style={{ color: C.text2, fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
                Connect your accounts to auto-post. Credentials stored in-session only.
              </p>

              {/* X/Twitter note */}
              <div style={{ background: '#f5a62308', border: `1px solid ${C.amber}33`, borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: C.amber, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>⚡ X / Twitter — Pay Per Use</div>
                <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.6 }}>
                  X API requires a developer account with billing set up at <a href="https://developer.twitter.com" target="_blank" rel="noopener noreferrer" style={{ color: C.amber }}>developer.twitter.com</a>. Cost is ~$0.01 per tweet. Your credentials stay in your Worker — never stored by CraftLauncher.
                </div>
              </div>

              {[
                { id: 'twitter',  name: 'X / Twitter', color: '#1a1a1a', fields: ['API Key','API Secret','Access Token','Access Token Secret'], docs: 'https://developer.twitter.com' },
                { id: 'reddit',   name: 'Reddit',      color: '#FF4500', fields: ['Client ID','Client Secret','Username','Password','Subreddit'], docs: 'https://www.reddit.com/prefs/apps' },
                { id: 'linkedin', name: 'LinkedIn',     color: '#0A66C2', fields: ['Access Token','Author URN'], docs: 'https://developer.linkedin.com' },
                { id: 'devto',    name: 'DEV.to',       color: '#3b49df', fields: ['API Key'], docs: 'https://dev.to/settings/extensions' },
              ].map(platform => (
                <div key={platform.id} style={{ background: C.bg2, border: `1px solid ${connectedApis[platform.id] ? C.green + '33' : C.border}`, borderRadius: 12, padding: '18px 20px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: connectedApis[platform.id] ? 0 : 14 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: `${platform.color}18`, border: `1px solid ${platform.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: platform.color, flexShrink: 0 }}>
                      {platform.name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{platform.name}</div>
                      <div style={{ fontSize: 11, color: C.text3 }}>{connectedApis[platform.id] ? 'Connected' : 'Not connected'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <a href={platform.docs} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: C.text3, textDecoration: 'none' }}>Docs ↗</a>
                      {connectedApis[platform.id]
                        ? <button onClick={() => setConnectedApis(c => ({ ...c, [platform.id]: false }))} style={{ ...btn(false, C.red), fontSize: 12 }}>Disconnect</button>
                        : <button onClick={() => setConnectedApis(c => ({ ...c, [platform.id]: true }))} style={{ ...btn(true, C.green), fontSize: 12 }}>Connect</button>
                      }
                    </div>
                  </div>
                  {!connectedApis[platform.id] && (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                      {platform.fields.map(f => (
                        <div key={f}>
                          <label style={{ display: 'block', fontSize: 11, color: C.text3, letterSpacing: '.6px', textTransform: 'uppercase', marginBottom: 5, fontFamily: "'JetBrains Mono', monospace" }}>{f}</label>
                          <input type="password" placeholder={`Enter ${f}`} style={input} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div style={{ height: `calc(20px + var(--sab))` }} />
            </div>
          </div>
        )}
      </main>

      {/* ══ LAUNCHKIT MODAL ══ */}
      {lkOpen && (
        <div
          onClick={closeLaunchKit}
          style={{
            position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.72)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: isMobile ? 0 : 24, backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: C.bg2, border: `1px solid ${C.border2}`,
              borderRadius: isMobile ? 0 : 14, width: '100%', maxWidth: 920,
              height: isMobile ? '100%' : '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
              paddingTop: isMobile ? 'var(--sat)' : 0,
            }}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              <span style={{ fontSize: 16 }}>🎨</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "'DM Serif Display', serif" }}>LaunchKit</div>
                <div style={{ fontSize: 11, color: C.text3, fontFamily: "'JetBrains Mono', monospace" }}>
                  {lkGated ? 'Launcher feature' : lkLoading ? 'Generating…' : lkSlug ? `craftlauncher.dev/${lkSlug}` : 'Landing page'}
                </div>
              </div>
              <button onClick={closeLaunchKit} style={{ ...btn(false), fontSize: 13, padding: '6px 12px' }}>✕ Close</button>
            </div>

            {/* Modal body */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

              {/* Loading */}
              {lkLoading && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <div style={{ fontSize: 30, animation: 'spin 2s linear infinite' }}>✦</div>
                  <div style={{ color: C.text, fontSize: 15, fontWeight: 600 }}>Generating your landing page…</div>
                  <div style={{ color: C.text3, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>Usually 15–30 seconds.</div>
                </div>
              )}

              {/* Gated (free user) */}
              {!lkLoading && lkGated && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 28, textAlign: 'center' }}>
                  <div style={{ fontSize: 30 }}>🔒</div>
                  <div style={{ color: C.text, fontSize: 17, fontWeight: 700, fontFamily: "'DM Serif Display', serif" }}>LaunchKit is a Launcher feature</div>
                  <div style={{ color: C.text2, fontSize: 14, lineHeight: 1.6, maxWidth: 420 }}>{lkGateMsg}</div>
                  <button onClick={() => { closeLaunchKit(); handleUpgrade() }} style={{
                    padding: '13px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg,#f5a623,#e8472a)', color: '#080808', fontSize: 14, fontWeight: 700,
                    fontFamily: "'Instrument Sans', system-ui, sans-serif",
                  }}>
                    Upgrade — $9/mo or $149/yr →
                  </button>
                </div>
              )}

              {/* Preview + actions */}
              {!lkLoading && !lkGated && lkHtml && (
                <>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '12px 18px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                    <button onClick={() => copyPost(lkHtml)} style={{ ...btn(copied, C.green), fontSize: 12, padding: '8px 14px' }}>
                      {copied ? 'Copied ✓' : 'Copy HTML'}
                    </button>
                    <button onClick={downloadLaunchKit} style={{ ...btn(false), fontSize: 12, padding: '8px 14px' }}>⬇ Download .html</button>
                    <button onClick={deployLaunchKit} style={{ ...btn(true, C.amber), fontSize: 12, padding: '8px 14px' }}>
                      ↗ Deploy to craftlauncher.dev/{(lkSlug || 'slug').slice(0, 18)}…
                    </button>
                  </div>
                  {lkDeployMsg && (
                    <div style={{ padding: '10px 18px', fontSize: 12, color: C.amber, background: '#f5a62308', borderBottom: `1px solid ${C.border}`, lineHeight: 1.5, fontFamily: "'JetBrains Mono', monospace" }}>
                      {lkDeployMsg}
                    </div>
                  )}
                  <iframe
                    title="LaunchKit preview"
                    srcDoc={lkHtml}
                    sandbox=""
                    style={{ flex: 1, width: '100%', border: 'none', background: '#080808' }}
                  />
                </>
              )}

              {/* Error fallback (failed generation) */}
              {!lkLoading && !lkGated && !lkHtml && lkDeployMsg && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 28, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, opacity: .4 }}>📄</div>
                  <div style={{ color: C.red, fontSize: 14 }}>{lkDeployMsg}</div>
                </div>
              )}
            </div>

            {!isMobile && <div style={{ height: 'var(--sab)' }} />}
          </div>
        </div>
      )}

      {/* ══ LAUNCHDECK MODAL ══ */}
      {ldOpen && (
        <div
          onClick={closeLaunchDeck}
          style={{
            position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.72)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: isMobile ? 0 : 24, backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: C.bg2, border: `1px solid ${C.border2}`,
              borderRadius: isMobile ? 0 : 14, width: '100%', maxWidth: 920,
              height: isMobile ? '100%' : '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
              paddingTop: isMobile ? 'var(--sat)' : 0,
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              <span style={{ fontSize: 16 }}>📑</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "'DM Serif Display', serif" }}>LaunchDeck</div>
                <div style={{ fontSize: 11, color: C.text3, fontFamily: "'JetBrains Mono', monospace" }}>
                  {ldGated ? 'Launcher feature' : ldLoading ? 'Generating…' : 'Investor one-pager'}
                </div>
              </div>
              <button onClick={closeLaunchDeck} style={{ ...btn(false), fontSize: 13, padding: '6px 12px' }}>✕ Close</button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

              {ldLoading && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <div style={{ fontSize: 30, animation: 'spin 2s linear infinite' }}>✦</div>
                  <div style={{ color: C.text, fontSize: 15, fontWeight: 600 }}>Generating your one-pager…</div>
                  <div style={{ color: C.text3, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>HTML + markdown. Usually 15–30 seconds.</div>
                </div>
              )}

              {!ldLoading && ldGated && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 28, textAlign: 'center' }}>
                  <div style={{ fontSize: 30 }}>🔒</div>
                  <div style={{ color: C.text, fontSize: 17, fontWeight: 700, fontFamily: "'DM Serif Display', serif" }}>LaunchDeck is a Launcher feature</div>
                  <div style={{ color: C.text2, fontSize: 14, lineHeight: 1.6, maxWidth: 420 }}>{ldGateMsg}</div>
                  <button onClick={() => { closeLaunchDeck(); handleUpgrade() }} style={{
                    padding: '13px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg,#f5a623,#e8472a)', color: '#080808', fontSize: 14, fontWeight: 700,
                    fontFamily: "'Instrument Sans', system-ui, sans-serif",
                  }}>
                    Upgrade — $9/mo or $149/yr →
                  </button>
                </div>
              )}

              {!ldLoading && !ldGated && ldHtml && (
                <>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: '12px 18px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                    {/* View toggle */}
                    <div style={{ display: 'flex', gap: 4, marginRight: 'auto' }}>
                      <button onClick={() => setLdView('preview')} style={{ ...btn(ldView === 'preview'), fontSize: 12, padding: '7px 12px' }}>Preview</button>
                      <button onClick={() => setLdView('markdown')} style={{ ...btn(ldView === 'markdown'), fontSize: 12, padding: '7px 12px' }} disabled={!ldMd}>
                        Markdown{!ldMd ? ' (n/a)' : ''}
                      </button>
                    </div>
                    <button onClick={() => copyPost(ldView === 'markdown' && ldMd ? ldMd : ldHtml)} style={{ ...btn(copied, C.green), fontSize: 12, padding: '7px 12px' }}>
                      {copied ? 'Copied ✓' : ldView === 'markdown' ? 'Copy MD' : 'Copy HTML'}
                    </button>
                    <button onClick={() => downloadDeck('html')} style={{ ...btn(false), fontSize: 12, padding: '7px 12px' }}>⬇ .html</button>
                    <button onClick={() => downloadDeck('md')} style={{ ...btn(false), fontSize: 12, padding: '7px 12px', opacity: ldMd ? 1 : .5 }} disabled={!ldMd}>⬇ .md</button>
                  </div>
                  {ldView === 'preview' ? (
                    <iframe title="LaunchDeck preview" srcDoc={ldHtml} sandbox=""
                      style={{ flex: 1, width: '100%', border: 'none', background: '#fff' }} />
                  ) : (
                    <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
                      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, lineHeight: 1.7, color: C.text2 }}>
                        {ldMd || 'Markdown version unavailable — use the HTML.'}
                      </pre>
                    </div>
                  )}
                </>
              )}

              {!ldLoading && !ldGated && !ldHtml && ldError && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 28, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, opacity: .4 }}>📑</div>
                  <div style={{ color: C.red, fontSize: 14 }}>{ldError}</div>
                </div>
              )}
            </div>

            {!isMobile && <div style={{ height: 'var(--sab)' }} />}
          </div>
        </div>
      )}
    </div>
  )
}
