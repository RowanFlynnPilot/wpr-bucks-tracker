import { useCallback, useEffect, useRef, useState } from 'react'

// The always-on refresh every live surface shares — the full tracker and the
// minis. Refetches every `restMs` (2 minutes by default), every 60s while
// `isLive(data)` says a game is on, and whenever the reader returns to the
// tab — so a page opened before tip-off flips to Live on its own.
//
// The FIRST load fails loud (the caller shows `error`; the next tick retries
// on its own). Once data is on screen a failed refresh keeps the last good
// numbers and logs to the console — replacing a working scoreboard with an
// error over one transient blip mid-game is worse than briefly stale numbers.
//
// A tab-return load can race a timer load; responses are sequence-numbered and
// only the newest request may land, so older data never overwrites newer.
// `loader` must be a stable (module-level) function.
export const REFRESH_MS = 120_000
export const LIVE_REFRESH_MS = 60_000

export function useRefreshingData(loader, isLive, restMs = REFRESH_MS) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const hasData = useRef(false)
  const seq = useRef(0)

  const load = useCallback(() => {
    const mine = ++seq.current
    loader()
      .then((next) => {
        if (mine !== seq.current) return
        hasData.current = true
        setData(next)
        setUpdatedAt(Date.now())
        setError(null)
      })
      .catch((err) => {
        if (mine !== seq.current) return
        if (!hasData.current) setError(err.message)
        else console.error('Refresh failed:', err)
      })
  }, [loader])

  const live = data ? isLive(data) : false

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) load() }, live ? LIVE_REFRESH_MS : restMs)
    const onVisible = () => { if (!document.hidden) load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [load, live, restMs])

  return { data, error, updatedAt }
}
