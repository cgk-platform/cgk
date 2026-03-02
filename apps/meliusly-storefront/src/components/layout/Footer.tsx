/**
 * Footer Component
 *
 * Site footer for Meliusly storefront.
 * Exact match to Figma design 1:1345.
 * Features: Logo, contact info, navigation columns, newsletter signup, payment icons.
 */

import Link from 'next/link'
import { Mail } from 'lucide-react'

export function Footer() {
  return (
    <footer className="w-full bg-[#161f2b]">
      {/* Main Footer Content */}
      <div className="flex items-start gap-[50px] p-[50px]">
        {/* Left Column - Logo & Contact */}
        <div className="flex flex-col gap-[30px]">
          {/* Logo */}
          <div className="relative h-[32px] w-[141px]">
            <img
              src="/assets/69bb33a6f2ea1403b208fab9c38e49c39bcb12bf.png"
              alt="Meliusly"
              className="h-full w-full object-cover"
            />
          </div>

          {/* Contact Info Box */}
          <div className="flex w-[328px] flex-col gap-[24px] rounded-[8px] border border-solid border-[#0268a0] px-[16px] py-[20px]">
            <p className="font-manrope text-[13px] leading-[1.15] font-bold tracking-[0.26px] text-white uppercase">
              contact
            </p>
            <div className="font-manrope text-[13px] leading-[1.8] font-medium tracking-[-0.13px] text-white">
              <p className="mb-0">Meliusly Ventures LLC</p>
              <p className="mb-0">8 THE GRN # 21810</p>
              <p className="mb-0">DOVER, DE, 19901</p>
            </div>
            <div className="flex items-center gap-[4px]">
              <Mail className="size-[13px] text-white" strokeWidth={2} />
              <p className="font-manrope text-[13px] leading-[1.8] font-medium tracking-[-0.13px] text-white">
                support@meliusly.com
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links Columns */}
        <div className="flex items-start gap-[50px] py-[30px]">
          {/* Shop Column */}
          <div className="flex w-[152px] flex-col gap-[24px]">
            <p className="font-manrope text-[13px] leading-[1.15] font-bold tracking-[0.26px] text-white uppercase">
              shop
            </p>
            <Link
              href="/collections/sleeper-sofa-support"
              className="font-manrope text-[13px] leading-[1.8] font-medium tracking-[-0.13px] text-white transition-colors hover:text-[#6abfef]"
            >
              Sleeper Sofa Support
            </Link>
            <Link
              href="/collections/sofa-chair-support"
              className="font-manrope text-[13px] leading-[1.8] font-medium tracking-[-0.13px] text-white transition-colors hover:text-[#6abfef]"
            >
              Sofa & Chair Support
            </Link>
            <Link
              href="/collections/bed-support"
              className="font-manrope text-[13px] leading-[1.8] font-medium tracking-[-0.13px] text-white transition-colors hover:text-[#6abfef]"
            >
              Bed Support
            </Link>
          </div>

          {/* Meliusly Column */}
          <div className="flex w-[152px] flex-col gap-[24px]">
            <p className="font-manrope text-[13px] leading-[1.15] font-bold tracking-[0.26px] text-white uppercase">
              MELIUSLY
            </p>
            <Link
              href="/about"
              className="font-manrope text-[13px] leading-[1.8] font-medium tracking-[-0.13px] text-white transition-colors hover:text-[#6abfef]"
            >
              About Us
            </Link>
            <Link
              href="/blog"
              className="font-manrope text-[13px] leading-[1.8] font-medium tracking-[-0.13px] text-white transition-colors hover:text-[#6abfef]"
            >
              Blog
            </Link>
          </div>

          {/* Help Column */}
          <div className="flex w-[152px] flex-col gap-[24px]">
            <p className="font-manrope text-[13px] leading-[1.15] font-bold tracking-[0.26px] text-white uppercase">
              help
            </p>
            <Link
              href="/contact"
              className="font-manrope text-[13px] leading-[1.8] font-medium tracking-[-0.13px] text-white transition-colors hover:text-[#6abfef]"
            >
              Contact
            </Link>
            <Link
              href="/refund-policy"
              className="font-manrope text-[13px] leading-[1.8] font-medium tracking-[-0.13px] text-white transition-colors hover:text-[#6abfef]"
            >
              Refund Policy
            </Link>
            <Link
              href="/terms-of-service"
              className="font-manrope text-[13px] leading-[1.8] font-medium tracking-[-0.13px] text-white transition-colors hover:text-[#6abfef]"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy-policy"
              className="font-manrope text-[13px] leading-[1.8] font-medium tracking-[-0.13px] text-white transition-colors hover:text-[#6abfef]"
            >
              Privacy Policy
            </Link>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="flex flex-1 flex-col items-center justify-center gap-[30px]">
          {/* Headline */}
          <div className="flex w-full flex-col items-center justify-center gap-[20px]">
            <h3 className="font-manrope text-[24px] leading-[1.3] font-semibold text-white capitalize">
              Sign up & Get <span className="text-[#6abfef]">$XX</span> off
            </h3>
            <p className="font-manrope text-center text-[15px] leading-[1.6] font-medium tracking-[-0.15px] text-white">
              Join our newsletter and get exclusive access to giveaways, discounts, and new releases
            </p>
          </div>

          {/* Form */}
          <div className="flex w-full flex-col gap-[10px]">
            <input
              type="email"
              placeholder="Enter email address"
              className="font-manrope h-[56px] rounded-[8px] border border-solid border-[#dfdfdf] bg-white px-[20px] text-[15px] leading-[1.6] font-medium tracking-[-0.15px] text-[#222] placeholder:text-[#222] placeholder:opacity-50"
            />
            <button className="font-manrope h-[56px] rounded-[8px] bg-[#0268a0] px-[24px] py-[21px] text-[16px] leading-[1.2] font-semibold text-white capitalize transition-colors hover:bg-[#0268a0]/90">
              Get my $XX Discount
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="relative flex items-center justify-between border-t border-white/10 px-[50px] pt-[20px] pb-[30px]">
        <div className="flex-1">
          <p className="font-gibson text-[13px] leading-[1.55] tracking-[0.26px] text-white">
            © 2026 Meliusly | Powered by Shopify
          </p>
        </div>

        {/* Payment Icons */}
        <div className="relative h-[22px] w-[266px]">
          <img
            src="/assets/ff2955183893b53c18d41564462afc7d13faba4d.png"
            alt="Payment methods"
            className="h-full w-full object-contain"
          />
        </div>
      </div>
    </footer>
  )
}
