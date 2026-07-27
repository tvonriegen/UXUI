export default function ExternalJobsLoading() {
  return <main className="min-h-screen bg-slate-950 px-6 py-10 sm:px-10"><div className="mx-auto max-w-5xl"><div className="h-4 w-40 animate-pulse rounded bg-slate-700" /><div className="mt-16 h-10 w-64 animate-pulse rounded bg-slate-700" /><div className="mt-10 grid gap-4 md:grid-cols-2">{[1, 2].map((item) => <div key={item} className="h-48 animate-pulse rounded-3xl bg-white/10" />)}</div></div></main>;
}
