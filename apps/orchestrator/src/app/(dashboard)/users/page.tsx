import { PlatformUserList } from '../../../components/users'

export const metadata = {
  title: 'Users | CGK Orchestrator',
  description: 'Manage all platform users',
}

/**
 * Platform-wide user management page for super admins
 */
export default function UsersPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          View and manage all users across the platform
        </p>
      </div>

      <PlatformUserList />
    </div>
  )
}
