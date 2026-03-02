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
        <h2 className="font-manrope text-meliusly-dark mb-12 text-center text-[32px] leading-tight font-semibold md:mb-16 md:text-[40px]">
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
                  <div className="bg-meliusly-primary/10 group-hover:bg-meliusly-primary/15 flex h-16 w-16 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110">
                    <Icon className="text-meliusly-primary h-8 w-8" strokeWidth={1.5} />
                  </div>
                </div>

                {/* Content */}
                <div className="text-center">
                  <h3 className="font-manrope text-meliusly-dark mb-3 text-[20px] leading-tight font-semibold">
                    {feature.title}
                  </h3>
                  <p className="font-manrope text-meliusly-grayText text-[16px] leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Subtle hover effect accent */}
                <div className="from-meliusly-primary to-meliusly-primary/60 absolute bottom-0 left-0 h-1 w-full scale-x-0 bg-gradient-to-r transition-transform duration-300 group-hover:scale-x-100" />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
