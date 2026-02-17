'use client'

/**
 * Contractor Help Page
 *
 * FAQ, contact support, and helpful resources.
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, Button, Input, cn } from '@cgk-platform/ui'
import {
  Search,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Mail,
  FileText,
  ExternalLink,
  HelpCircle,
  DollarSign,
  Briefcase,
  Shield,
} from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
  category: string
}

const faqItems: FAQItem[] = [
  {
    category: 'Getting Started',
    question: 'How do I get started with my first project?',
    answer:
      'Once you\'re approved as a contractor, you\'ll see available projects on your dashboard. Click on a project to view details, and click "Start Project" to begin working. Make sure to review the deliverables and deadline before starting.',
  },
  {
    category: 'Getting Started',
    question: 'What types of projects are available?',
    answer:
      'We offer various project types including video editing, photography, content writing, social media management, and more. Projects vary in scope, duration, and compensation. Use filters on the Projects page to find work that matches your skills.',
  },
  {
    category: 'Payments',
    question: 'When and how do I get paid?',
    answer:
      'Payments are processed within 3-5 business days after your work is approved. You can choose to receive payments via direct deposit (ACH), PayPal, or Wise for international transfers. Set up your preferred payment method in Settings.',
  },
  {
    category: 'Payments',
    question: 'What are the payment rates?',
    answer:
      'Rates vary by project type and complexity. Each project listing shows the compensation amount. Some projects are paid as a fixed rate, while others are hourly. Premium projects may offer higher rates for experienced contractors.',
  },
  {
    category: 'Projects',
    question: 'What happens if I need more time on a project?',
    answer:
      'If you need an extension, contact your project manager as soon as possible through the project messages. Extensions are granted on a case-by-case basis. Repeated deadline issues may affect your contractor rating.',
  },
  {
    category: 'Projects',
    question: 'How do I submit my completed work?',
    answer:
      'Navigate to your project, click "Submit Work", and upload your deliverables. You can attach files, add links, and include notes. Make sure all requirements are met before submitting. You can track approval status on the project page.',
  },
  {
    category: 'Account',
    question: 'How do I update my profile and skills?',
    answer:
      'Go to Settings > Profile to update your personal information, bio, and skills. A complete profile with relevant skills helps you get matched with better projects. You can also upload a profile photo and portfolio samples.',
  },
  {
    category: 'Account',
    question: 'What affects my contractor rating?',
    answer:
      'Your rating is based on work quality, deadline adherence, communication, and client feedback. Consistently delivering high-quality work on time will improve your rating and unlock access to premium projects.',
  },
]

const categories = ['All', 'Getting Started', 'Payments', 'Projects', 'Account']

function FAQAccordion({ item }: { item: FAQItem }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b last:border-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="font-medium pr-4">{item.question}</span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="pb-4">
          <p className="text-muted-foreground">{item.answer}</p>
        </div>
      )}
    </div>
  )
}

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  const filteredFAQs = faqItems.filter((item) => {
    const matchesSearch =
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory =
      selectedCategory === 'All' || item.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Getting Started':
        return HelpCircle
      case 'Payments':
        return DollarSign
      case 'Projects':
        return Briefcase
      case 'Account':
        return Shield
      default:
        return HelpCircle
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Help Center</h1>
        <p className="text-muted-foreground">
          Find answers to common questions or contact support
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          className={cn(
            'cursor-pointer transition-all duration-normal',
            'hover:shadow-md hover:-translate-y-0.5'
          )}
        >
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Documentation</p>
              <p className="text-sm text-muted-foreground">Guides & tutorials</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'cursor-pointer transition-all duration-normal',
            'hover:shadow-md hover:-translate-y-0.5'
          )}
        >
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Live Chat</p>
              <p className="text-sm text-muted-foreground">Chat with support</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'cursor-pointer transition-all duration-normal',
            'hover:shadow-md hover:-translate-y-0.5'
          )}
        >
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Email Support</p>
              <p className="text-sm text-muted-foreground">Get help via email</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'cursor-pointer transition-all duration-normal',
            'hover:shadow-md hover:-translate-y-0.5'
          )}
        >
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ExternalLink className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Community</p>
              <p className="text-sm text-muted-foreground">Join our forum</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Frequently Asked Questions</h2>
        </CardHeader>
        <CardContent>
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((category) => {
              const Icon = getCategoryIcon(category)
              return (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="gap-2"
                >
                  {category !== 'All' && <Icon className="h-4 w-4" />}
                  {category}
                </Button>
              )
            })}
          </div>

          {/* FAQ List */}
          {filteredFAQs.length > 0 ? (
            <div>
              {filteredFAQs.map((item, index) => (
                <FAQAccordion key={index} item={item} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No results found. Try a different search term.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Still need help?</h2>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button>
              <MessageCircle className="mr-2 h-4 w-4" />
              Start Live Chat
            </Button>
            <Button variant="outline">
              <Mail className="mr-2 h-4 w-4" />
              Email Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
