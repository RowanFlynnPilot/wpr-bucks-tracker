import { useEffect, useState } from 'react'
import { WPR_NEWS } from '../config.js'
import { fetchCoverage } from '../wpr.js'
import { track } from '../format.js'
import Section from './Section.jsx'

// WPR's latest Bucks stories — the bridge from the widget back to the newsroom.
// Coverage is an enhancement, not core data: on failure the section renders nothing.
export default function Coverage() {
  const [posts, setPosts] = useState(null)

  useEffect(() => {
    fetchCoverage().then(setPosts).catch(() => setPosts([]))
  }, [])

  if (!posts || posts.length === 0) return null

  return (
    <Section kicker="From the newsroom" title="WPR Bucks coverage">
      {posts.map((p) => (
        <a
          className="coverage-row"
          key={p.link}
          href={p.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('Coverage Click')}
        >
          {p.image && <img src={p.image} alt="" loading="lazy" />}
          <span className="cov-body">
            <span className="cov-title">{p.title}</span>
            {p.excerpt && <span className="cov-excerpt">{p.excerpt}</span>}
            <span className="cov-date">
              {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </span>
        </a>
      ))}
      <a
        className="copy-link cov-more"
        href={WPR_NEWS.archive}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('Coverage Click', { link: 'archive' })}
      >
        More Bucks coverage <span aria-hidden="true">→</span>
      </a>
    </Section>
  )
}
