import { Diamond, Lightbulb, Settings, Flag } from 'lucide-react'

interface Feature {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: Diamond,
    title: 'Premium Materials',
    description:
      'High-density materials that provide firm, reliable support and help extend the life of your furniture.',
  },
  {
    icon: Lightbulb,
    title: 'Patent-Pending Innovation',
    description:
      'Pioneering furniture support designs developed to solve real structural problems.',
  },
  {
    icon: Settings,
    title: 'Engineer-Founded',
    description:
      'Created by an engineer couple focused on practical, structurally sound solutions.',
  },
  {
    icon: Flag,
    title: 'US-Based & Family-Run',
    description:
      'Operated in the US with domestic customer support and a commitment to standing behind every product.',
  },
]

export function WhyMeliusly() {
  return (
    <section className="bg-[#F8F9FA] px-4 py-16 md:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl">
        {/* Section Heading */}
        <h2 className="font-manrope mb-12 text-center text-[32px] leading-tight font-semibold text-[#161F2B] md:mb-16 md:text-[40px]">
          Why Choose Meliusly
        </h2>

        {/* Features Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="group relative overflow-hidden rounded-2xl bg-white p-8 transition-all duration-300 hover:shadow-lg"
              >
                {/* Icon Container */}
                <div className="mb-6 flex items-center justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#0268A0]/10 transition-all duration-300 group-hover:scale-110 group-hover:bg-[#0268A0]/15">
                    <Icon className="h-8 w-8 text-[#0268A0]" strokeWidth={1.5} />
                  </div>
                </div>

                {/* Content */}
                <div className="text-center">
                  <h3 className="font-manrope mb-3 text-[20px] leading-tight font-semibold text-[#161F2B]">
                    {feature.title}
                  </h3>
                  <p className="font-manrope text-[16px] leading-relaxed text-[#777777]">
                    {feature.description}
                  </p>
                </div>

                {/* Subtle hover effect accent */}
                <div className="absolute bottom-0 left-0 h-1 w-full scale-x-0 bg-gradient-to-r from-[#0268A0] to-[#0268A0]/60 transition-transform duration-300 group-hover:scale-x-100" />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
