export default function WorkspaceLoading() {
  return <main className="workspace-loading" aria-label="Loading secured workspace">
    <aside />
    <section>
      <header />
      <div className="workspace-loading-hero" />
      <div className="workspace-loading-grid">{Array.from({ length: 8 }, (_, index) => <i key={index} />)}</div>
    </section>
  </main>;
}
