import { Component } from 'react'
import { track } from '../format.js'

// The one place a render throw is allowed to land. Feed failures are handled where they're
// fetched (fail loud on first load, keep-last-good on refresh); this only catches what nothing
// else expected, so a bad payload shows a note instead of blanking the widget out of WPR's page.
export default class ErrorBoundary extends Component {
  state = { broken: false }
  static getDerivedStateFromError() { return { broken: true } }
  componentDidCatch(err) { track('Widget Error', { message: String(err?.message || err).slice(0, 120) }) }
  render() {
    if (!this.state.broken) return this.props.children
    return (
      <div className="status-block error">
        <div>The tracker hit a snag — the stats feeds are fine, this one's on us.</div>
        <button className="copy-link" style={{ marginTop: 12 }} onClick={() => window.location.reload()}>
          Reload the tracker
        </button>
      </div>
    )
  }
}
