# CraftLauncher App — Setup & Deploy

## Structure
```
craftlauncher-app/
├── index.html
├── vite.config.js
├── package.json
├── public/
│   └── _headers
└── src/
    ├── main.jsx
    ├── index.css
    └── App.jsx
```

## Install & Build

```powershell
cd C:\Users\HP\Documents\craftlauncher-app
npm install
npm run build
```

## Deploy to Cloudflare Pages

```powershell
wrangler pages deploy dist --project-name craftlauncher-app --commit-dirty=true
```

First deploy will ask to create the project — accept.

## Add Custom Domain

Cloudflare Dashboard → Workers & Pages → craftlauncher-app → Custom Domains
Add: app.craftlauncher.dev

## Responsive Breakpoints

- Mobile:  375px–767px  — single column, touch-optimized
- Tablet:  768px–1023px — wider single column
- Desktop: 1024px+      — two-column results (sidebar + viewer)

## Key Features

- Safe area insets for notched phones (env(safe-area-inset-*))
- Min 44px touch targets on all buttons
- Horizontal scroll for platform chips on mobile results
- No sidebar on mobile — platform chips instead
- Clipboard fallback (textarea execCommand) for non-HTTPS
- Usage loads from Worker on email blur
- Generation gate calls Worker before Claude API
