const foundations = [
  ["01", "Approved baseline", "Immutable BoQ versions and controlled material allowances."],
  ["02", "Evidence chain", "Requests, receipt, batches, verification and exceptions remain connected."],
  ["03", "Human decision", "BuildProof prepares a recommendation; authorised professionals remain accountable."],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-950 px-6 py-10 text-stone-100 sm:px-10 lg:px-16">
      <section className="mx-auto flex min-h-[80vh] max-w-6xl flex-col justify-between rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,_rgba(192,120,43,.22),_transparent_35%),linear-gradient(145deg,_#10281d,_#111411_60%,_#1c120c)] p-8 shadow-2xl shadow-black/30 sm:p-12">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">
          <span>AuraFlow</span>
          <span>BuildProof / Foundation</span>
        </div>

        <div className="max-w-4xl py-16 sm:py-24">
          <p className="mb-5 text-sm font-medium uppercase tracking-[0.18em] text-emerald-300">Construction material control</p>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.055em] text-balance sm:text-7xl">
            Evidence that makes every construction decision defensible.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-300">
            BuildProof connects approved BoQs, field evidence, professional verification, exceptions and human release recommendations in one accountable record.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {foundations.map(([number, title, description]) => (
            <article key={number} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm">
              <p className="text-xs font-semibold tracking-[0.18em] text-amber-300">{number}</p>
              <h2 className="mt-6 text-lg font-semibold text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-stone-400">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
