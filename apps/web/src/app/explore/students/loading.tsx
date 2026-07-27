export default function ExploreStudentsLoading() {
  return <main className="min-h-screen bg-slate-50 px-6 py-10 sm:px-10"><div className="mx-auto max-w-6xl"><div className="h-4 w-32 animate-pulse rounded bg-slate-200" /><div className="mt-14 h-10 w-80 animate-pulse rounded bg-slate-200" /><div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-52 animate-pulse rounded-3xl bg-white shadow-sm" />)}</div></div></main>;
}
