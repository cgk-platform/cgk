import React from 'react'

interface PressQuote {
  quote: string
  attribution: string
  publication: string
}

interface PressAwardsProps {
  quotes?: PressQuote[]
}

export function PressAwards({ quotes }: PressAwardsProps) {
  // Default quote from Figma
  const defaultQuotes: PressQuote[] = [
    {
      quote: 'Everyday home comfort redefined',
      attribution: 'Recommended By',
      publication: 'New York Times Wirecutter',
    },
  ]

  const displayQuotes = quotes && quotes.length > 0 ? quotes : defaultQuotes

  return (
    <section className="w-full bg-[#F7F7F7] py-16 md:py-20">
      <div className="mx-auto max-w-4xl px-6 md:px-12">
        <div className="flex flex-col items-center justify-center space-y-6 text-center">
          {displayQuotes.map((item, index) => (
            <div
              key={index}
              className="flex flex-col items-center space-y-4"
              style={{
                animation: 'fadeInUp 0.8s ease-out forwards',
                animationDelay: `${index * 0.2}s`,
                opacity: 0,
              }}
            >
              {/* Attribution - Publication name */}
              <p className="font-manrope text-sm leading-relaxed font-medium tracking-wide text-[#161F2B] md:text-[14px]">
                {item.attribution} {item.publication}
              </p>

              {/* Quote - Large, centered */}
              <blockquote className="relative">
                <p className="font-manrope text-2xl leading-tight font-medium text-[#0268A0] md:text-[32px] md:leading-[1.4]">
                  "{item.quote}"
                </p>
              </blockquote>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default PressAwards
