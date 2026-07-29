export default function ExternalJobsLoading() {
  return <main className="min-h-screen bg-cl-surface px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl"><div className="h-4 w-40 animate-pulse rounded bg-slate-200" /><div className="mt-6 h-9 w-64 animate-pulse rounded bg-slate-200" /><div className="mt-6 grid gap-5 md:grid-cols-2">{[1, 2].map((item) => <div key={item} className="h-48 animate-pulse rounded-2xl border border-slate-200/60 bg-white" />)}</div></div></main>;
}
