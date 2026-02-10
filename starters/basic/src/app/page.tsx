export default function Home(): React.JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to CGK Admin
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Your admin portal is ready. Run{' '}
          <code className="rounded bg-muted px-2 py-1">cgk setup</code> to
          configure.
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <a
            href="/admin"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Go to Admin
          </a>
          <a
            href="https://cgk.dev/docs"
            className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-accent"
          >
            Documentation
          </a>
        </div>
      </div>
    </main>
  )
}
