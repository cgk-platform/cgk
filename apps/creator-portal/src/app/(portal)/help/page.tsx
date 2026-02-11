import { FAQAccordion } from '@/components/help/FAQAccordion'
import { SupportContact } from '@/components/help/SupportContact'

export default function HelpPage(): React.JSX.Element {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Help & FAQ</h1>
        <p className="mt-1 text-muted-foreground">
          Find answers to common questions about the Creator Portal
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* FAQ Section */}
        <div className="lg:col-span-2">
          <FAQAccordion />
        </div>

        {/* Support Contact */}
        <div>
          <SupportContact />
        </div>
      </div>
    </div>
  )
}
