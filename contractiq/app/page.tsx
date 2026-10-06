import Link from 'next/link'
import './globals.css'

const features = [
  {
    icon: '⚡',
    title: 'Extract in seconds',
    description:
      'Upload any NDA or MSA and get 20–30 key terms extracted automatically — Parties, Governing Law, Liability Cap, and more — with page-level attribution.',
  },
  {
    icon: '🎯',
    title: 'Confidence scoring',
    description:
      'Every extracted term shows a confidence score so you know exactly which clauses to verify. Low-confidence terms are flagged with a warning.',
  },
  {
    icon: '💬',
    title: 'Chat with your contract',
    description:
      'Ask plain-English questions and get answers grounded strictly in your document — never from general legal knowledge. Every answer cites a page number.',
  },
]

const steps = [
  { step: '01', title: 'Upload your contract', body: 'Drag and drop any text-layer PDF (NDA or MSA, up to 10 MB / 20 pages).' },
  { step: '02', title: 'AI extracts key terms', body: 'GPT-4o identifies the clauses that matter — with page numbers, confidence scores, and verbatim source sentences.' },
  { step: '03', title: 'Review, chat, decide', body: 'Browse extracted terms, ask follow-up questions, edit any value inline, and share your review.' },
]

const plans = [
  {
    name: 'Free Trial',
    price: '$0',
    period: '14 days',
    features: ['5 contract analyses', 'NDA + MSA extraction', 'Contract chat', 'Full feature access'],
    cta: 'Start free trial',
    href: '/signup',
    highlight: false,
  },
  {
    name: 'Starter',
    price: '$19',
    period: '/month',
    features: ['10 contract analyses/month', 'NDA + MSA extraction', 'Contract chat', 'Custom key terms'],
    cta: 'Get started',
    href: '/signup',
    highlight: true,
  },
  {
    name: 'Growth',
    price: '$49',
    period: '/month',
    features: ['40 contract analyses/month', 'Everything in Starter', 'Export to CSV', 'Priority support'],
    cta: 'Get started',
    href: '/signup',
    highlight: false,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-grey-900">
      {/* Nav */}
      <nav className="border-b border-grey-100 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold text-brand">ContractIQ</span>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-grey-500 hover:text-grey-900 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-700 to-brand px-6 py-28 text-center text-white">
        <div className="mx-auto max-w-3xl">
          <span className="mb-4 inline-block rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-brand-100">
            AI-powered contract review
          </span>
          <h1 className="mt-4 text-5xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
            Review NDAs and MSAs
            <br />
            <span className="text-brand-300">in minutes, not hours</span>
          </h1>
          <p className="mt-6 text-lg text-brand-200 leading-relaxed max-w-2xl mx-auto">
            ContractIQ extracts the 20–30 terms that matter from any NDA or MSA — with page
            numbers, confidence scores, and a plain-English chat interface. No legal background
            required.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="rounded-md bg-white px-8 py-3.5 text-base font-semibold text-brand hover:bg-brand-50 transition-colors shadow-lg"
            >
              Start free — no credit card
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 transition-colors"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-4 text-sm text-brand-300">
            5 free contract analyses · No credit card required · Cancel any time
          </p>
        </div>
      </section>

      {/* Social proof strip */}
      <div className="border-y border-grey-100 bg-grey-25 py-4 text-center text-sm text-grey-400">
        <p>
          Reduces review time from{' '}
          <strong className="text-grey-700">90 minutes to under 15 minutes</strong>
          {' '}·{' '}
          <strong className="text-grey-700">≥ 88% extraction accuracy</strong>
          {' '}·{' '}
          Powered by{' '}
          <strong className="text-grey-700">GPT-4o</strong>
        </p>
      </div>

      {/* Features */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-grey-900">
              Everything you need to review a contract with confidence
            </h2>
            <p className="mt-3 text-grey-400 max-w-xl mx-auto">
              Built for founders, ops leads, and freelancers who sign contracts regularly but
              don&rsquo;t have a lawyer on speed dial.
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-grey-100 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-4 text-3xl">{f.icon}</div>
                <h3 className="mb-2 text-lg font-semibold text-grey-900">{f.title}</h3>
                <p className="text-sm text-grey-400 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-grey-25 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-16 text-center text-3xl font-bold text-grey-900">How it works</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.step} className="relative">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand">
                  {s.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-grey-900">{s.title}</h3>
                <p className="text-sm text-grey-400 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-grey-900">Simple, transparent pricing</h2>
            <p className="mt-3 text-grey-400">
              Less than 5 minutes of lawyer time — for 10 full contract reviews.
            </p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-8 ${
                  plan.highlight
                    ? 'border-brand bg-brand shadow-lg shadow-brand/10'
                    : 'border-grey-100 bg-white shadow-sm'
                }`}
              >
                <h3
                  className={`text-lg font-bold ${plan.highlight ? 'text-white' : 'text-grey-900'}`}
                >
                  {plan.name}
                </h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span
                    className={`text-4xl font-extrabold ${plan.highlight ? 'text-white' : 'text-grey-900'}`}
                  >
                    {plan.price}
                  </span>
                  <span
                    className={`text-sm ${plan.highlight ? 'text-brand-200' : 'text-grey-400'}`}
                  >
                    {plan.period}
                  </span>
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feat) => (
                    <li
                      key={feat}
                      className={`flex items-start gap-2 text-sm ${
                        plan.highlight ? 'text-brand-100' : 'text-grey-500'
                      }`}
                    >
                      <span className={plan.highlight ? 'text-white' : 'text-success'}>✓</span>
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`mt-8 block rounded-md px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
                    plan.highlight
                      ? 'bg-white text-brand hover:bg-brand-50'
                      : 'bg-brand text-white hover:bg-brand-700'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-grey-100 bg-grey-25 px-6 py-10 text-center text-sm text-grey-400">
        <p className="font-semibold text-grey-700">ContractIQ</p>
        <p className="mt-1">
          AI-assisted contract review · Not legal advice · Powered by OpenAI GPT-4o
        </p>
        <div className="mt-4 flex justify-center gap-6">
          <Link href="/login" className="hover:text-grey-700 transition-colors">
            Sign in
          </Link>
          <Link href="/signup" className="hover:text-grey-700 transition-colors">
            Sign up
          </Link>
        </div>
      </footer>
    </div>
  )
}
