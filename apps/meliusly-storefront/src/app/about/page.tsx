import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about Meliusly and our mission to bring comfort to every sleeper sofa.',
}

export default function AboutPage() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#F8F9FA] to-white px-6 py-16 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-[1440px] text-center">
          <h1 className="font-manrope mb-6 text-[40px] leading-[1.3] font-semibold text-[#161F2B] lg:text-[56px]">
            About Meliusly
          </h1>
          <p className="font-manrope mx-auto max-w-[768px] text-[18px] leading-relaxed text-[#777777] lg:text-[20px]">
            Premium furniture support solutions designed by engineers for lasting comfort.
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="px-6 py-16 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-[960px]">
          <div className="mb-12">
            <h2 className="font-manrope mb-6 text-[32px] leading-[1.3] font-semibold text-[#161F2B]">
              Our Story
            </h2>
            <p className="font-manrope mb-4 text-[16px] leading-relaxed text-[#777777]">
              Meliusly was founded by an engineer couple who experienced firsthand the discomfort of
              sleeping on a sofa bed with metal bars pressing through the thin mattress. They knew
              there had to be a better solution.
            </p>
            <p className="font-manrope text-[16px] leading-relaxed text-[#777777]">
              After months of research and development, they created a support system that
              permanently installs in the sofa bed frame, eliminating the metal bar problem while
              providing firm, even support across the entire sleeping surface.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="font-manrope mb-6 text-[32px] leading-[1.3] font-semibold text-[#161F2B]">
              Our Mission
            </h2>
            <p className="font-manrope text-[16px] leading-relaxed text-[#777777]">
              To transform every sofa bed into a comfortable sleeping experience. We believe that
              guests deserve a good night's sleep, and furniture should be built to last.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="text-center">
              <div className="mb-4 text-[48px]">🇺🇸</div>
              <h3 className="font-manrope mb-2 text-[20px] font-semibold text-[#161F2B]">
                US-Based
              </h3>
              <p className="font-manrope text-[14px] leading-relaxed text-[#777777]">
                Family-run business operated in the United States
              </p>
            </div>

            <div className="text-center">
              <div className="mb-4 text-[48px]">⚙️</div>
              <h3 className="font-manrope mb-2 text-[20px] font-semibold text-[#161F2B]">
                Engineer-Founded
              </h3>
              <p className="font-manrope text-[14px] leading-relaxed text-[#777777]">
                Designed with precision and structural integrity
              </p>
            </div>

            <div className="text-center">
              <div className="mb-4 text-[48px]">⭐</div>
              <h3 className="font-manrope mb-2 text-[20px] font-semibold text-[#161F2B]">
                500K+ Customers
              </h3>
              <p className="font-manrope text-[14px] leading-relaxed text-[#777777]">
                Trusted by customers across the United States
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#F8F9FA] px-6 py-16 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-[768px] text-center">
          <h2 className="font-manrope mb-4 text-[32px] leading-[1.3] font-semibold text-[#161F2B]">
            Experience the Meliusly Difference
          </h2>
          <p className="font-manrope mb-8 text-[16px] leading-relaxed text-[#777777]">
            Join thousands of satisfied customers who have transformed their sofa beds.
          </p>
          <a
            href="/collections/all"
            className="font-manrope inline-block rounded-lg bg-[#0268A0] px-8 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-[#015580]"
          >
            Shop Now
          </a>
        </div>
      </section>
    </div>
  )
}
