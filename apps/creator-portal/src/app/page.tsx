export default function Home(): React.JSX.Element {
  return (
    <div>
      <h1 className="text-3xl font-bold">Creator Dashboard</h1>
      <p className="mt-4 text-muted-foreground">
        Welcome back! Here&apos;s an overview of your activity.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-6">
          <h2 className="text-sm font-medium text-muted-foreground">Active Projects</h2>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>
        <div className="rounded-lg border p-6">
          <h2 className="text-sm font-medium text-muted-foreground">Pending Earnings</h2>
          <p className="mt-2 text-3xl font-bold">$0.00</p>
        </div>
        <div className="rounded-lg border p-6">
          <h2 className="text-sm font-medium text-muted-foreground">Available Balance</h2>
          <p className="mt-2 text-3xl font-bold">$0.00</p>
        </div>
      </div>
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="rounded-lg border p-6 text-center text-muted-foreground">
          No recent activity. Start a project to see updates here.
        </div>
      </div>
    </div>
  )
}
