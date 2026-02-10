export default function Home(): React.JSX.Element {
  return (
    <div>
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <p className="mt-4 text-muted-foreground">
        Welcome to your brand administration portal.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border p-6">
          <h2 className="text-sm font-medium text-muted-foreground">Orders Today</h2>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>
        <div className="rounded-lg border p-6">
          <h2 className="text-sm font-medium text-muted-foreground">Revenue Today</h2>
          <p className="mt-2 text-3xl font-bold">$0</p>
        </div>
        <div className="rounded-lg border p-6">
          <h2 className="text-sm font-medium text-muted-foreground">Active Creators</h2>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>
        <div className="rounded-lg border p-6">
          <h2 className="text-sm font-medium text-muted-foreground">Pending Tasks</h2>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>
      </div>
    </div>
  )
}
