import Link from 'next/link'

export default function TaxLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tax Management</h1>
      </div>

      <nav className="flex gap-4 border-b pb-2">
        <Link
          href="/admin/tax"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Dashboard
        </Link>
        <Link
          href="/admin/tax/1099s"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          1099 Forms
        </Link>
        <Link
          href="/admin/tax/filing"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          IRS Filing
        </Link>
        <Link
          href="/admin/tax/w9-status"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          W-9 Status
        </Link>
        <Link
          href="/admin/tax/annual-payments"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Annual Payments
        </Link>
        <Link
          href="/admin/tax/settings"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Settings
        </Link>
      </nav>

      {children}
    </div>
  )
}
