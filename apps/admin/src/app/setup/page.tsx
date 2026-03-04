'use client'

import { useState, useEffect } from 'react'
import { Button, Card, Input, Badge } from '@cgk-platform/ui'
import { CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react'

type Step = 'database' | 'shopify' | 'stripe' | 'complete'

interface SetupConfig {
  shopify: {
    apiKey: string
    apiSecret: string
    storeUrl: string
  }
  stripe: {
    secretKey: string
    publishableKey: string
    webhookSecret: string
  }
}

export default function SetupPage() {
  const [currentStep, setCurrentStep] = useState<Step>('database')
  const [dbStatus, setDbStatus] = useState<'checking' | 'success' | 'error' | null>(null)
  const [dbError, setDbError] = useState<string | null>(null)
  const [config, setConfig] = useState<SetupConfig>({
    shopify: { apiKey: '', apiSecret: '', storeUrl: '' },
    stripe: { secretKey: '', publishableKey: '', webhookSecret: '' },
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (currentStep === 'database') {
      checkDatabase()
    }
  }, [currentStep])

  const checkDatabase = async () => {
    setDbStatus('checking')
    setDbError(null)

    try {
      const response = await fetch('/api/setup/check-db')
      const data = await response.json()

      if (data.success) {
        setDbStatus('success')
        setTimeout(() => setCurrentStep('shopify'), 1500)
      } else {
        setDbStatus('error')
        setDbError(data.error || 'Unknown error')
      }
    } catch (error) {
      setDbStatus('error')
      setDbError('Connection failed. Check Vercel environment variables.')
    }
  }

  const saveShopifyConfig = async () => {
    if (!config.shopify.apiKey || !config.shopify.apiSecret || !config.shopify.storeUrl) {
      alert('Please fill in all Shopify fields')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/setup/shopify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.shopify),
      })

      if (response.ok) {
        setCurrentStep('stripe')
      } else {
        alert('Failed to save Shopify configuration')
      }
    } catch (error) {
      alert('Error saving Shopify configuration')
    } finally {
      setLoading(false)
    }
  }

  const saveStripeConfig = async () => {
    if (!config.stripe.secretKey || !config.stripe.publishableKey) {
      alert('Please fill in required Stripe fields')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/setup/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.stripe),
      })

      if (response.ok) {
        setCurrentStep('complete')
      } else {
        alert('Failed to save Stripe configuration')
      }
    } catch (error) {
      alert('Error saving Stripe configuration')
    } finally {
      setLoading(false)
    }
  }

  const getStepNumber = (step: Step): number => {
    const steps: Step[] = ['database', 'shopify', 'stripe', 'complete']
    return steps.indexOf(step) + 1
  }

  const progress = (getStepNumber(currentStep) / 4) * 100

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-4">
        <Card className="p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold">Welcome to CGK Platform! 🚀</h1>
            <p className="text-muted-foreground">
              Let&apos;s finish setting up your platform. This will take about 5 minutes.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Step {getStepNumber(currentStep)} of 4</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Step: Database */}
          {currentStep === 'database' && (
            <div>
              <h2 className="mb-4 text-xl font-semibold">Step 1: Verify Database Connection</h2>
              <p className="mb-6 text-muted-foreground">
                We&apos;ll check if your Neon PostgreSQL database is connected properly.
              </p>

              <div className="mb-6">
                {dbStatus === 'checking' && (
                  <div className="flex items-center space-x-3">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span>Checking database connection...</span>
                  </div>
                )}
                {dbStatus === 'success' && (
                  <div className="flex items-center space-x-3 text-green-600">
                    <CheckCircle2 className="h-8 w-8" />
                    <span className="font-medium">Database connected successfully!</span>
                  </div>
                )}
                {dbStatus === 'error' && (
                  <div className="flex items-center space-x-3 text-red-600">
                    <XCircle className="h-8 w-8" />
                    <span className="font-medium">Database connection failed: {dbError}</span>
                  </div>
                )}
              </div>

              <Button onClick={checkDatabase} className="w-full" disabled={dbStatus === 'checking'}>
                {dbStatus === 'checking' ? 'Checking...' : 'Check Database'}
              </Button>
            </div>
          )}

          {/* Step: Shopify */}
          {currentStep === 'shopify' && (
            <div>
              <h2 className="mb-4 text-xl font-semibold">Step 2: Shopify Configuration</h2>
              <p className="mb-6 text-muted-foreground">
                Connect your Shopify store to start selling products.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Shopify API Key</label>
                  <Input
                    type="text"
                    placeholder="Enter your Shopify API key"
                    value={config.shopify.apiKey}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        shopify: { ...config.shopify, apiKey: e.target.value },
                      })
                    }
                  />
                  <p className="mt-1 text-sm text-muted-foreground">
                    Find this in your Shopify Partners dashboard
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Shopify API Secret</label>
                  <Input
                    type="password"
                    placeholder="Enter your Shopify API secret"
                    value={config.shopify.apiSecret}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        shopify: { ...config.shopify, apiSecret: e.target.value },
                      })
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Shopify Store URL</label>
                  <Input
                    type="text"
                    placeholder="your-store.myshopify.com"
                    value={config.shopify.storeUrl}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        shopify: { ...config.shopify, storeUrl: e.target.value },
                      })
                    }
                  />
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Don&apos;t have a Shopify app yet?</strong>
                    <br />
                    <a
                      href="https://partners.shopify.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 underline hover:text-blue-700"
                    >
                      Create one in Shopify Partners <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>
              </div>

              <div className="mt-6 flex space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('database')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button onClick={saveShopifyConfig} className="flex-1" disabled={loading}>
                  {loading ? 'Saving...' : 'Continue'}
                </Button>
              </div>
            </div>
          )}

          {/* Step: Stripe */}
          {currentStep === 'stripe' && (
            <div>
              <h2 className="mb-4 text-xl font-semibold">Step 3: Stripe Configuration</h2>
              <p className="mb-6 text-muted-foreground">
                Set up payments with Stripe to accept credit cards.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Stripe Secret Key</label>
                  <Input
                    type="password"
                    placeholder="sk_test_..."
                    value={config.stripe.secretKey}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        stripe: { ...config.stripe, secretKey: e.target.value },
                      })
                    }
                  />
                  <p className="mt-1 text-sm text-muted-foreground">
                    Find this in your Stripe dashboard under Developers → API Keys
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Stripe Publishable Key</label>
                  <Input
                    type="text"
                    placeholder="pk_test_..."
                    value={config.stripe.publishableKey}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        stripe: { ...config.stripe, publishableKey: e.target.value },
                      })
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Stripe Webhook Secret <Badge variant="outline">Optional</Badge>
                  </label>
                  <Input
                    type="password"
                    placeholder="whsec_..."
                    value={config.stripe.webhookSecret}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        stripe: { ...config.stripe, webhookSecret: e.target.value },
                      })
                    }
                  />
                  <p className="mt-1 text-sm text-muted-foreground">
                    You can add this later after configuring webhooks
                  </p>
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Don&apos;t have a Stripe account yet?</strong>
                    <br />
                    <a
                      href="https://dashboard.stripe.com/register"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 underline hover:text-blue-700"
                    >
                      Create a free Stripe account <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>
              </div>

              <div className="mt-6 flex space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('shopify')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button onClick={saveStripeConfig} className="flex-1" disabled={loading}>
                  {loading ? 'Saving...' : 'Continue'}
                </Button>
              </div>
            </div>
          )}

          {/* Step: Complete */}
          {currentStep === 'complete' && (
            <div className="text-center">
              <div className="mb-6">
                <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
              </div>

              <h2 className="mb-4 text-2xl font-bold">Setup Complete! 🎉</h2>
              <p className="mb-8 text-muted-foreground">
                Your CGK Platform is now configured and ready to use.
              </p>

              <div className="mb-8 rounded-lg bg-gray-50 p-6 text-left">
                <h3 className="mb-3 font-semibold">What&apos;s Next?</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start">
                    <CheckCircle2 className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
                    <span>
                      Run database migrations:{' '}
                      <code className="rounded bg-gray-200 px-2 py-1">
                        npx @cgk-platform/cli migrate
                      </code>
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
                    <span>
                      Access the admin portal at{' '}
                      <a href="/admin" className="text-blue-600 underline hover:text-blue-700">
                        /admin
                      </a>
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
                    <span>
                      View the storefront at{' '}
                      <a href="/" className="text-blue-600 underline hover:text-blue-700">
                        /
                      </a>
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
                    <span>
                      Read the documentation at{' '}
                      <a
                        href="https://github.com/cgk-platform/cgk"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 underline hover:text-blue-700"
                      >
                        GitHub <ExternalLink className="h-3 w-3" />
                      </a>
                    </span>
                  </li>
                </ul>
              </div>

              <Button asChild>
                <a href="/admin">Go to Admin Portal</a>
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
