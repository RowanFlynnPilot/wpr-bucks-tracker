// The editorial section header: a small-caps kicker over a big serif headline,
// sitting on the page background — not inside a box. Content below is only
// carded when it's genuinely tabular. This two-tier rhythm is what keeps the
// page from reading as a stack of identical rectangles.
export default function Section({ kicker, title, note, children }) {
  return (
    <section className="sect">
      {kicker && <div className="sect-kicker">{kicker}</div>}
      <h2 className="sect-title">{title}</h2>
      {note && <p className="section-note">{note}</p>}
      {children}
    </section>
  )
}
