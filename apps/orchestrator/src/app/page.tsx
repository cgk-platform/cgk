export default function Home(): React.JSX.Element {
  return (
    <div>
      <h1 className="text-3xl font-bold">Orchestrator Dashboard</h1>
      <p className="mt-4 text-muted-foreground">
        Internal super admin dashboard for managing all tenants and platform operations.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold">Active Tenants</h2>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold">Total Users</h2>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold">System Health</h2>
          <p className="mt-2 text-3xl font-bold text-green-500">OK</p>
        </div>
      </div>
    </div>
  )
}
