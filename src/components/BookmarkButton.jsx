import { useEffect, useRef, useState } from 'react'
import { WPR_NEWS } from '../config.js'
import { track } from '../format.js'

// Stickiness nudge: "bookmark this page and come back." No browser exposes a
// programmatic add-bookmark API, so the honest path is the OS-correct shortcut —
// and because the tool runs in an iframe, Ctrl/⌘+D bookmarks the *host WPR page*,
// exactly what we want. Phones have no shortcut, so a one-tap copy-link (the WPR
// Bucks page) is the reliable path there. Pure client UI; every branch fails soft.

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '')
const isTouch = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(pointer: coarse)').matches

// Where a bookmark/copy should point: the WPR Bucks page when embedded (readers
// land back on the news site, not the bare iframe), else the standalone tracker.
function bookmarkUrl() {
  if (window.self === window.top) return window.location.href
  return WPR_NEWS?.archive || document.referrer || window.location.href
}

const Key = ({ children }) => <kbd className="key">{children}</kbd>

export default function BookmarkButton() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const wrap = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) track('Bookmark')
  }

  const copy = () => {
    if (!navigator.clipboard) return
    navigator.clipboard.writeText(bookmarkUrl()).then(() => {
      setCopied(true)
      track('Bookmark', { action: 'copy' })
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  return (
    <div ref={wrap} className="bookmark-wrap">
      <button className="bookmark-btn" onClick={toggle} aria-expanded={open} aria-label="Bookmark this page">
        <span className="star" aria-hidden="true">★</span> Bookmark
      </button>

      {open && (
        <div role="dialog" aria-label="Bookmark this page" className="bookmark-pop">
          <div className="bm-title">Keep the Bucks handy</div>
          <div className="bm-body">
            {isTouch
              ? <>Open your browser menu and tap <strong>Add Bookmark</strong> (or Add to Home Screen) to check back anytime.</>
              : <>Press <Key>{isMac ? '⌘' : 'Ctrl'}</Key>+<Key>D</Key> to save this page and check back anytime.</>}
          </div>
          <button className={`bm-copy ${copied ? 'done' : ''}`} onClick={copy}>
            {copied ? '✓ Link copied' : 'Copy link'}
          </button>
        </div>
      )}
    </div>
  )
}
