import { useEffect, useRef, useState } from 'react'

// The hand-rolled SVG charts draw at their container's real pixel width
// (viewBox units = CSS pixels), so axis text stays 11px on a phone. A fixed
// 820-wide viewBox scaled into a 343px column shrank it to ~4.5px. The ref
// must be on an element that is ALWAYS rendered (including empty states), or
// the observer never attaches. `width` is null until the first measurement.
export function useChartWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(null)
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}
