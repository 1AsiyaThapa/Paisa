'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

const FEATURES = [
  {
    title: "Easy to use",
    description: "Add expenses in seconds. No complicated setup or confusing features.",
    visual: "01"
  },
  {
    title: "See your spending",
    description: "Visual charts show exactly where your money goes each month.",
    visual: "02"
  },
  {
    title: "Your data is safe",
    description: "We don't sell your information. Your financial data stays private.",
    visual: "03"
  },
  {
    title: "Works everywhere",
    description: "Access your data on phone, tablet, or computer. Always in sync.",
    visual: "04"
  }
];

const TESTIMONIALS = [
  {
    quote: "Finally found something that actually helps me save money.",
    name: "Asiya Thapa",
    role: "Student"
  },
  {
    quote: "सरल र सफा। मेरो फ्रिलान्स कामका लागि ठ्याक्कै चाहिने कुरा।",
    name: "Nitya Shrestha",
    role: "Freelancer"
  },
  {
    quote: "I can see where my money goes now. Game changer.",
    name: "Shreeya Pandey",
    role: "Marketing Manager"
  }
];

const DEMO_DATA = {
  month: "September 2025",
  income: "NPR 42,500",
  expenses: "NPR 18,000",
  saved: "NPR 24,500"
};

function Logo() {
  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-red-600 rounded-full"></div>
        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
        <div className="w-2 h-2 bg-white border border-gray-300 rounded-full"></div>
      </div>
      <span className="text-2xl font-bold text-gray-900 dark:text-white">पैसा</span>
      <span className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">Track</span>
    </div>
  );
}

function Header() {
  const router = useRouter();

  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="w-full px-8 sm:px-12 lg:px-16 xl:px-20 py-4">
        <div className="flex justify-between items-center">
          <Logo />
          <div className="flex space-x-4">
            <Button variant="ghost" onClick={() => router.push('/login')}>
              Sign In
            </Button>
            <Button onClick={() => router.push('/signup')}>
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  const router = useRouter();

  return (
    <section className="max-w-none mx-auto px-8 sm:px-12 lg:px-16 xl:px-20 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-semibold text-gray-800 mb-4">
            Track your money, save more
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Simple expense tracking that actually works. See where your money goes and make better financial decisions.
          </p>
          <p className="text-sm text-orange-600 mt-2 font-medium">
            Made in Nepal 🇳🇵 • नेपालमा बनेको
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <Button onClick={() => router.push('/signup')} className="px-6 py-3">
            Get Started Free
          </Button>
          <Button variant="outline" onClick={() => router.push('/login')} className="px-6 py-3">
            Sign In
          </Button>
        </div>

        <ExpenseDemo />
      </div>
    </section>
  );
}

function ExpenseDemo() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-gray-800">This Month</h3>
        <span className="text-sm text-gray-500">{DEMO_DATA.month}</span>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Income</span>
          <span className="font-semibold text-green-600">{DEMO_DATA.income}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Expenses</span>
          <span className="font-semibold text-red-500">{DEMO_DATA.expenses}</span>
        </div>
        <div className="border-t pt-3 flex justify-between items-center">
          <span className="font-medium text-gray-800">Saved</span>
          <span className="font-bold text-green-600">{DEMO_DATA.saved}</span>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ feature, index }: { feature: typeof FEATURES[0], index: number }) {
  // Nepali currency and financial visual elements
  const moneyElements = [
    "₨", "🇳🇵", "💎", "📈", "💳", "🏦", "💎", "₨"
  ];

  return (
    <div className="group relative">
      {/* Flowing money elements */}
      <div className="absolute -top-4 -right-4 opacity-20 group-hover:opacity-40 transition-opacity duration-300 z-10">
        <div className="text-2xl animate-bounce" style={{ animationDelay: `${index * 0.2}s` }}>
          {moneyElements[index % moneyElements.length]}
        </div>
      </div>

      {/* Bubbly card */}
      <div className="relative bg-white rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-red-100 hover:border-red-300 group-hover:scale-105">
        {/* Bubbly background pattern */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <div className="absolute top-1 right-1 w-2 h-2 bg-red-200 rounded-full opacity-30"></div>
          <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-orange-200 rounded-full opacity-40"></div>
          <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-amber-200 rounded-full opacity-50"></div>
        </div>

        {/* Number bubble */}
        <div className="relative mb-3">
          <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 text-white text-sm font-bold rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
            {feature.visual}
          </div>
        </div>

        {/* Content */}
        <div className="relative">
          <h3 className="font-semibold text-gray-900 mb-2 text-base">
            {feature.title}
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            {feature.description}
          </p>
        </div>

        {/* Flowing line indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-400 to-orange-400 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section className="max-w-none mx-auto px-8 sm:px-12 lg:px-16 xl:px-20 py-20 bg-gradient-to-b from-orange-50 to-red-50 relative overflow-hidden">
      {/* Flowing background elements */}
      <div className="absolute top-10 left-10 text-4xl opacity-10 animate-pulse">₨</div>
      <div className="absolute top-32 right-20 text-3xl opacity-10 animate-bounce" style={{ animationDelay: '1s' }}>🇳🇵</div>
      <div className="absolute bottom-20 left-1/4 text-3xl opacity-10 animate-pulse" style={{ animationDelay: '2s' }}>📈</div>
      <div className="absolute bottom-32 right-10 text-4xl opacity-10 animate-bounce" style={{ animationDelay: '0.5s' }}>💎</div>

      <div className="max-w-6xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Why <span className="text-gray-800">पैसा</span> <span className="bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">Track</span>?
          </h2>
          <p className="text-lg text-gray-600">
            Simple features that help you save more money
          </p>
        </div>

        {/* Diagonal staircase layout using CSS Grid */}
        <div className="relative">
          {/* Diagonal connecting flow line */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="none">
              <path
                d="M 100 100 L 200 200 L 300 300 L 400 400"
                stroke="url(#gradient)"
                strokeWidth="3"
                fill="none"
                opacity="0.3"
                strokeDasharray="10,5"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="50%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Feature cards in diagonal staircase using grid */}
          <div className="grid grid-cols-4 gap-8 items-start">
            {FEATURES.map((feature, index) => (
              <div
                key={index}
                className={`${index === 0 ? 'col-start-1' : index === 1 ? 'col-start-2' : index === 2 ? 'col-start-3' : 'col-start-4'} ${index > 0 ? 'mt-16' : ''} ${index > 1 ? 'mt-32' : ''} ${index > 2 ? 'mt-48' : ''}`}
              >
                <FeatureCard feature={feature} index={index} />
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}

function TestimonialCard({ testimonial }: { testimonial: typeof TESTIMONIALS[0] }) {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <p className="text-gray-700 mb-4 italic">&ldquo;{testimonial.quote}&rdquo;</p>
      <div className="text-sm">
        <span className="font-medium text-gray-800">{testimonial.name}</span>
        <span className="text-gray-500">, {testimonial.role}</span>
      </div>
    </div>
  );
}

function TestimonialsSection() {
  return (
    <section className="max-w-none mx-auto px-8 sm:px-12 lg:px-16 xl:px-20 py-16 bg-white">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold text-gray-800 mb-8 text-center">
          What people are saying
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const router = useRouter();

  return (
    <section className="max-w-none mx-auto px-8 sm:px-12 lg:px-16 xl:px-20 py-16">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Ready to start tracking?
        </h2>
        <p className="text-gray-600 mb-6">
          Join thousands of people who are already saving more money with Paisatrack.
        </p>
        <Button onClick={() => router.push('/signup')} className="px-8 py-3">
          Get Started Free
        </Button>
        <p className="text-sm text-gray-500 mt-4">
          No credit card required
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-gradient-to-r from-red-50 to-orange-50 border-t border-red-200 py-8">
      <div className="max-w-none mx-auto px-8 sm:px-12 lg:px-16 xl:px-20">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4 space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
              <div className="w-1.5 h-1.5 bg-white border border-gray-300 rounded-full"></div>
            </div>
            <span className="text-lg font-semibold text-gray-800">पैसा</span>
            <span className="text-lg font-semibold text-red-600">Track</span>
          </div>
          <p className="text-sm text-gray-500">
            © 2025 Paisatrack. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

// Main component
export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
}
