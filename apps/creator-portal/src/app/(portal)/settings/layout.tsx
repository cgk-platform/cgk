import { SettingsNav } from '@/components/settings/SettingsNav'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Navigation */}
        <div className="w-full shrink-0 lg:w-56">
          <SettingsNav />
        </div>

        {/* Content */}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}
