export default function FreelanceLoading() {
  return <main className="min-h-screen bg-amber-50 px-6 py-10 sm:px-10"><div className="mx-auto max-w-5xl"><div className="h-4 w-32 animate-pulse rounded bg-amber-200" /><div className="mt-20 h-14 max-w-2xl animate-pulse rounded bg-amber-200" /><div className="mt-16 grid gap-4 md:grid-cols-2">{[1, 2].map((item) => <div key={item} className="h-48 animate-pulse rounded-3xl bg-white" />)}</div></div></main>;
}
