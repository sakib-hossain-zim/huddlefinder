import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-brand-charcoal text-white">

      {/* ── DESKTOP footer — unchanged ── */}
      <div className="hidden md:block">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-4 gap-8 mb-10">

            {/* Brand */}
            <div className="col-span-1">
              <img
                src="/logo.svg"
                alt="Huddlefinder"
                className="h-12 w-auto mb-4 brightness-0 invert"
              />
              <p className="text-white/50 text-sm leading-relaxed">
                Canada's live sports finder. Find your venue. Show up. Join the huddle.
              </p>
            </div>

            {/* Navigate */}
            <div>
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">
                Navigate
              </p>
              <ul className="space-y-3">
                <li>
                  <Link href="/" className="text-sm text-white/70 hover:text-white transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/search" className="text-sm text-white/70 hover:text-white transition-colors">
                    Find a venue
                  </Link>
                </li>
                <li>
                  <Link href="/auth/signup?role=venue_owner" className="text-sm text-white/70 hover:text-white transition-colors">
                    List your venue
                  </Link>
                </li>
                <li>
                  <Link href="/venue-dashboard/upgrade" className="text-sm text-white/70 hover:text-white transition-colors">
                    Plans
                  </Link>
                </li>
              </ul>
            </div>

            {/* Cities */}
            <div>
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">
                Cities
              </p>
              <ul className="space-y-3">
                {['Vancouver', 'Toronto', 'Calgary', 'Montreal'].map(city => (
                  <li key={city}>
                    <Link href={`/search?city=${city}`} className="text-sm text-white/70 hover:text-white transition-colors">
                      {city}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">
                Company
              </p>
              <ul className="space-y-3">
                <li>
                  <a href="mailto:info@huddlefinder.com" className="text-sm text-white/70 hover:text-white transition-colors">
                    Contact us
                  </a>
                </li>
                <li>
                  <Link href="/terms" className="text-sm text-white/70 hover:text-white transition-colors">
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-sm text-white/70 hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="text-sm text-white/70 hover:text-white transition-colors">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>

          </div>

          <div className="border-t border-white/10 pt-6 flex items-center justify-between">
            <p className="text-white/40 text-xs">
              © {new Date().getFullYear()} Huddlefinder. All rights reserved.
            </p>
            <p className="text-white/40 text-xs">Made in Vancouver 🇨🇦</p>
          </div>
        </div>
      </div>

      {/* ── MOBILE footer — compact, sits above bottom nav ── */}
      <div className="md:hidden px-5 pt-8 pb-6">

        {/* Logo + tagline */}
        <div className="flex items-center gap-3 mb-6">
          <img
            src="/logo.svg"
            alt="Huddlefinder"
            className="h-8 w-auto brightness-0 invert flex-shrink-0"
          />
          <p className="text-white/50 text-xs leading-relaxed">
            Canada's live sports finder.
            Find your venue. Show up. Join the chant.
          </p>
        </div>

        {/* Links — two columns */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-6">
          <Link href="/" className="text-xs text-white/60 hover:text-white transition-colors">
            Home
          </Link>
          <Link href="/search" className="text-xs text-white/60 hover:text-white transition-colors">
            Find a venue
          </Link>
          <Link href="/auth/signup?role=venue_owner" className="text-xs text-white/60 hover:text-white transition-colors">
            List your venue
          </Link>
          <Link href="/venue-dashboard/upgrade" className="text-xs text-white/60 hover:text-white transition-colors">
            Plans & pricing
          </Link>
          <Link href="/faq" className="text-xs text-white/60 hover:text-white transition-colors">
            FAQ
          </Link>
          <a href="mailto:info@huddlefinder.com" className="text-xs text-white/60 hover:text-white transition-colors">
            Contact us
          </a>
          <Link href="/terms" className="text-xs text-white/60 hover:text-white transition-colors">
            Terms & Conditions
          </Link>
          <Link href="/privacy" className="text-xs text-white/60 hover:text-white transition-colors">
            Privacy Policy
          </Link>
        </div>

        {/* Cities row */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
            Cities:
          </p>
          {['Vancouver', 'Toronto', 'Calgary', 'Montreal'].map((city, i, arr) => (
            <span key={city} className="flex items-center gap-3">
              <Link
                href={`/search?city=${city}`}
                className="text-xs text-white/50 hover:text-white transition-colors"
              >
                {city}
              </Link>
              {i < arr.length - 1 && (
                <span className="text-white/20 text-xs">·</span>
              )}
            </span>
          ))}
        </div>

        {/* Bottom line */}
        <div className="border-t border-white/10 pt-4 flex items-center justify-between">
          <p className="text-white/30 text-[10px]">
            © {new Date().getFullYear()} Huddlefinder
          </p>
          <p className="text-white/30 text-[10px]">Made in Vancouver 🇨🇦</p>
        </div>

      </div>
    </footer>
  )
}