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

function PlatformGrid({ plan, selectedIds, onToggle, onUpgrade }) {
  const isMobile = useIsMobile()
  const freePlatforms = FREE_PLATFORM_IDS.map(id => PLATFORMS.find(p => p.id === id)).filter(Boolean)
  const lockedPlatforms = PLATFORMS.filter(p => !FREE_PLATFORM_IDS.includes(p.id))

  if (plan !== 'launcher') {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: C.text3, letterSpacing: '.8px', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>
            Platforms — Free tier
          </label>
          <button onClick={onUpgrade} style={{ background: 'none', border: 'none', color: C.amber, cursor: 'pointer', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", textDecoration: 'underline', padding: 0 }}>
            Upgrade for all 18+ →
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
        {PLATFORMS.map(p => {
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

function PostViewer({ platform, post, onCopy, onRegen, onAutoPost, postStatus, copied, connectedApis, plan, onConnect }) {
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
  const [tab, setTab]             = useState('compose') // compose | results | automate
  const [userEmail, setUserEmail] = useState('')
  const [usage, setUsage]         = useState({ generationsThisPeriod: 0, generationLimit: 3, generationsRemaining: 3, postsThisPeriod: 0, postLimit: 1, postsRemaining: 1, plan: 'free' })
  const [usageError, setUsageError] = useState('')
  const [form, setForm]           = useState({ productName: '', tagline: '', url: '', pricing: '', problem: '', solution: '', audience: '', techStack: '', tone: 'Excited' })
  const [selectedIds, setSelectedIds] = useState(FREE_PLATFORM_IDS)
  const [posts, setPosts]         = useState({})
  const [activePlatform, setActivePlatform] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [copied, setCopied]       = useState(false)
  const [postStatus, setPostStatus] = useState({})
  const [connectedApis, setConnectedApis] = useState({})
  // Mobile: show post drawer
  const [drawerOpen, setDrawerOpen] = useState(false)

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
    } catch(e) {
      setPosts({ _error: 'Generation failed. Please try again.' })
    }
    setLoading(false)
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
        body: JSON.stringify(bodyMap[platformId] || { text: postText }),
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
  const resultPlatforms = usage.plan === 'free'
    ? FREE_PLATFORM_IDS.map(id => PLATFORMS.find(p => p.id === id)).filter(Boolean)
    : PLATFORMS.filter(p => selectedIds.includes(p.id))

  const activePlatformData = PLATFORMS.find(p => p.id === activePlatform)

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
          {!isMobile && <div style={{ fontSize: 10, color: C.text3, letterSpacing: '1px', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>More platforms. Less writing.</div>}
        </div>
        <nav style={{ display: 'flex', gap: isMobile ? 4 : 8 }}>
          {[
            ['compose', isMobile ? '✍' : '✍ Compose'],
            ['results', isMobile ? `📄${doneCount > 0 ? doneCount : ''}` : `📄 Posts${doneCount > 0 ? ` (${doneCount})` : ''}${loading ? ' ⏳' : ''}`],
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

              <UsageBar usage={usage} userEmail={userEmail} setUserEmail={setUserEmail} loadUsage={loadUsage} usageError={usageError} onUpgrade={handleUpgrade} />

              {/* Form fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                    Generating {usage.plan === 'free' ? 5 : selectedIds.length} tailored posts.<br/>
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
                  onRegen={() => regenOne(activePlatformData)}
                  onAutoPost={autoPost}
                  postStatus={postStatus[activePlatform]}
                  copied={copied}
                  connectedApis={connectedApis}
                  plan={usage.plan}
                  onConnect={() => setTab('automate')}
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
    </div>
  )
}
