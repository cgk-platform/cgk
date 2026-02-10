export default function Home(): React.JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to CGK Platform
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Full-featured e-commerce platform with Admin, Storefront, and Creator
          Portal
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <a
            href="/admin"
            className="rounded-lg border p-6 hover:border-primary hover:bg-accent"
          >
            <h2 className="font-semibold">Admin Portal</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage orders, customers, and settings
            </p>
          </a>
          <a
            href="/store"
            className="rounded-lg border p-6 hover:border-primary hover:bg-accent"
          >
            <h2 className="font-semibold">Storefront</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Browse products and make purchases
            </p>
          </a>
          <a
            href="/creator"
            className="rounded-lg border p-6 hover:border-primary hover:bg-accent"
          >
            <h2 className="font-semibold">Creator Portal</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Track earnings and manage projects
            </p>
          </a>
        </div>
        <div className="mt-8">
          <a
            href="https://cgk.dev/docs"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Documentation →
          </a>
        </div>
      </div>
    </main>
  )
}
