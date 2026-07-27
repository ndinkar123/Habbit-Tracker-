# Habits Pro — Habit Tracker PWA

A lightweight, privacy-first habit tracking app. All data stays on your device — no backend, no sign-up, no tracking.

## What's New in This Version

✅ **Security Fixes**
- XSS protection: all user text is escaped before rendering (no `innerHTML` string concat)
- Import validation: backups are sanitized before loading
- CSP header in HTML prevents injected scripts

✅ **Data Reliability**
- IndexedDB storage with localStorage fallback (bigger quota, more stable)
- Auto-migration from old versions (your existing data is preserved)
- Validated state on every load (corrupted data can't crash the app)

✅ **Bug Fixes**
- Delete habit now removes historical data (previously orphaned it)
- Congratulations popup resets at midnight (not just on page reload)
- Badge thresholds now in one place (easier to maintain, no duplicates)
- Service worker cache invalidates on update (no more stale versions)

✅ **Performance**
- Note saves debounced (500ms, not on every keystroke)
- DOM rendering uses fragments (fewer layout recalcs)
- No inline event handlers (better CSP compliance)

---

## File Structure

Place these files in your GitHub Pages repository root:

```
/
├── index.html          # Main HTML (entry point)
├── app.js              # App logic & event handlers
├── storage.js          # Storage layer (IndexedDB + localStorage)
├── style.css           # All styles (external, not inline)
├── sw.js               # Service worker (caching, offline)
├── manifest.json       # PWA metadata
├── icon.svg            # App icon (favicon + PWA icon)
└── README.md           # This file
```

---

## Setup for GitHub Pages

### 1. Create a new GitHub repository

```bash
git init
git remote add origin https://github.com/YOUR_USERNAME/habits-pro.git
```

### 2. Copy all files to your local repo

Copy these 7 files to the root of your repo:
- `index.html`
- `app.js`
- `storage.js`
- `style.css`
- `sw.js`
- `manifest.json`
- `icon.svg`

### 3. Push to GitHub

```bash
git add .
git commit -m "Initial Habits Pro release"
git push -u origin main
```

### 4. Enable GitHub Pages

In your GitHub repo settings:
1. Go to **Settings** → **Pages**
2. Set **Source** to "Deploy from a branch"
3. Select **main** branch, root folder
4. Click Save

Your app will be live at: `https://YOUR_USERNAME.github.io/habits-pro/`

---

## Troubleshooting

### "App loads but nothing appears"
- Check browser console (F12) for JavaScript errors
- Verify all 7 files exist in your GitHub repo
- Clear browser cache: Settings → Clear browsing data (all time)
- Try a different browser

### "Data isn't saving"
- Check if IndexedDB is available: open DevTools → Application → Storage
- Confirm localStorage is enabled (not in private browsing)
- On first load, app will migrate data from old versions automatically

### "Install button doesn't work"
- HTTPS required (GitHub Pages provides this automatically)
- Install only works on mobile or desktop in "Add to Home Screen" context
- Some browsers (like Firefox Desktop) may not support PWA install

### "Changes aren't showing after I update the files"
- GitHub Pages can take 1-2 minutes to deploy
- Clear browser cache or do a hard refresh (Ctrl+Shift+R)
- Service worker caches assets; the app will show "New version available" toast and allow refresh

### "Data disappeared after deleting site cache"
- Browser "Clear site data" also clears IndexedDB
- Always export a backup first: Settings → Export Data
- Import it back if needed

---

## Feature Overview

### Habits
- Create, rename, delete habits
- Change emoji for each habit
- Mark daily completions

### Streaks
- Current day streak (50%+ habits completed)
- Best streak (all time)
- Habit-specific streaks shown next to each habit

### Calendar
- Monthly heatmap (color intensity = completion %)
- Daily notes (tap a day to view/edit)
- Weekly performance chart

### Analytics
- 14-day consistency trend (up/down/stable)
- Per-habit completion rate this month
- Best streak & total completions badges

### Rewards & Gamification
- Add custom rewards to a "mystery box"
- Random reward shown when you complete 100% of habits in a day
- 6 unlockable badges (First Step → Habit Hero)

### Settings
- Dark mode toggle
- Import/export backups as JSON
- Reset all data (warning shown)

---

## How Data is Stored

- **IndexedDB** (primary): Bigger quota (~50MB on modern browsers), structured storage
- **localStorage** (fallback): Used if IndexedDB unavailable (some private browsers, older devices)
- **No server**: Everything stays on your device. No cloud sync, no account required.

### Exporting a Backup

1. Go to Settings
2. Tap "Export Data"
3. Save the `.json` file somewhere safe
4. To restore: Settings → Import → select the file

---

## Security & Privacy

- **XSS Protection**: All user-supplied text (habit names, notes, rewards) is HTML-escaped before rendering
- **CSP Header**: Content Security Policy blocks inline scripts and external resources
- **No Analytics**: No tracking, no ads, no external API calls
- **No Syncing**: Data never leaves your browser
- **Offline-First**: Works without internet

---

## Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 15+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile, Samsung Internet)

PWA install works best on:
- Android: Chrome, Samsung Internet, Firefox
- iOS: Must use "Add to Home Screen" (Safari only, not installable like Android)
- Desktop: Edge, Chrome (on Windows 11+)

---

## License

Open source. Use and modify freely.
