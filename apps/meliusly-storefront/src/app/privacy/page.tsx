import type { Metadata } from 'next'
import { TraitsBar } from '@/components/sections/TraitsBar'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Learn how Meliusly collects, uses, and protects your personal information.',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="font-manrope mb-4 text-4xl font-semibold text-[#161F2B]">Privacy Policy</h1>
        <p className="font-manrope mb-8 text-[16px] leading-relaxed text-[#777777]">
          Last updated: March 2, 2026
        </p>

        <div className="space-y-8 text-[#777777]">
          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              1. Information We Collect
            </h2>
            <p className="font-manrope mb-4 text-[16px] leading-relaxed">
              We collect information you provide directly to us, including:
            </p>
            <ul className="font-manrope list-disc space-y-2 pl-6 text-[16px] leading-relaxed">
              <li>Name, email address, phone number, and shipping address</li>
              <li>Payment information (processed securely through our payment provider)</li>
              <li>Order history and product preferences</li>
              <li>Communications with our customer support team</li>
              <li>Account credentials if you create an account</li>
            </ul>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              2. How We Use Your Information
            </h2>
            <p className="font-manrope mb-4 text-[16px] leading-relaxed">
              We use the information we collect to:
            </p>
            <ul className="font-manrope list-disc space-y-2 pl-6 text-[16px] leading-relaxed">
              <li>Process and fulfill your orders</li>
              <li>Communicate with you about your orders and account</li>
              <li>Provide customer support</li>
              <li>Send you marketing communications (with your consent)</li>
              <li>Improve our products and services</li>
              <li>Prevent fraud and enhance security</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              3. Information Sharing
            </h2>
            <p className="font-manrope mb-4 text-[16px] leading-relaxed">
              We do not sell your personal information. We may share your information with:
            </p>
            <ul className="font-manrope list-disc space-y-2 pl-6 text-[16px] leading-relaxed">
              <li>
                <strong>Service Providers:</strong> Third-party companies that help us operate our
                business (payment processors, shipping carriers, email service providers)
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law or to protect our rights
              </li>
              <li>
                <strong>Business Transfers:</strong> In connection with any merger, sale, or
                transfer of our business
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              4. Cookies and Tracking Technologies
            </h2>
            <p className="font-manrope mb-4 text-[16px] leading-relaxed">
              We use cookies and similar tracking technologies to:
            </p>
            <ul className="font-manrope list-disc space-y-2 pl-6 text-[16px] leading-relaxed">
              <li>Remember your preferences and settings</li>
              <li>Understand how you use our website</li>
              <li>Improve website performance</li>
              <li>Deliver personalized content and advertisements</li>
            </ul>
            <p className="font-manrope mt-4 text-[16px] leading-relaxed">
              You can control cookies through your browser settings, but some features of our
              website may not function properly if cookies are disabled.
            </p>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              5. Data Security
            </h2>
            <p className="font-manrope text-[16px] leading-relaxed">
              We implement appropriate technical and organizational measures to protect your
              personal information against unauthorized access, alteration, disclosure, or
              destruction. However, no method of transmission over the Internet or electronic
              storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              6. Your Rights and Choices
            </h2>
            <p className="font-manrope mb-4 text-[16px] leading-relaxed">You have the right to:</p>
            <ul className="font-manrope list-disc space-y-2 pl-6 text-[16px] leading-relaxed">
              <li>Access and review your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your information (subject to legal obligations)</li>
              <li>Opt out of marketing communications</li>
              <li>Object to certain data processing activities</li>
            </ul>
            <p className="font-manrope mt-4 text-[16px] leading-relaxed">
              To exercise these rights, please contact us at privacy@meliusly.com.
            </p>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              7. Data Retention
            </h2>
            <p className="font-manrope text-[16px] leading-relaxed">
              We retain your personal information for as long as necessary to fulfill the purposes
              outlined in this Privacy Policy, unless a longer retention period is required or
              permitted by law.
            </p>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              8. Children's Privacy
            </h2>
            <p className="font-manrope text-[16px] leading-relaxed">
              Our website is not intended for children under 13 years of age. We do not knowingly
              collect personal information from children under 13. If you believe we have collected
              information from a child under 13, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              9. International Data Transfers
            </h2>
            <p className="font-manrope text-[16px] leading-relaxed">
              Your information may be transferred to and processed in countries other than your
              country of residence. These countries may have data protection laws that are different
              from the laws of your country. We take appropriate safeguards to ensure your
              information remains protected.
            </p>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              10. Changes to This Privacy Policy
            </h2>
            <p className="font-manrope text-[16px] leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes
              by posting the new Privacy Policy on this page and updating the "Last updated" date.
              You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="font-manrope mb-4 text-2xl font-semibold text-[#161F2B]">
              11. Contact Us
            </h2>
            <p className="font-manrope mb-4 text-[16px] leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us:
            </p>
            <div className="rounded-lg bg-[#F8F9FA] p-4">
              <p className="font-manrope mb-2 text-[16px] leading-relaxed">
                <strong>Email:</strong> privacy@meliusly.com
              </p>
              <p className="font-manrope mb-2 text-[16px] leading-relaxed">
                <strong>Support:</strong> support@meliusly.com
              </p>
              <p className="font-manrope text-[16px] leading-relaxed">
                <strong>Mail:</strong> Meliusly, LLC - Privacy Department
              </p>
            </div>
          </section>
        </div>
      </div>
      <TraitsBar />
    </main>
  )
}
