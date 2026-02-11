/**
 * Post-Purchase Survey Checkout UI Extension
 *
 * Renders a configurable survey on the order confirmation page.
 * Captures attribution data ("How did you hear about us?") and customer feedback.
 */

import {
  reactExtension,
  useApi,
  useSettings,
  BlockStack,
  Heading,
  Text,
  ChoiceList,
  Choice,
  Button,
  TextField,
  InlineStack,
  Divider,
  Spinner,
} from '@shopify/ui-extensions-react/checkout'
import { useState, useEffect, useCallback } from 'react'
import type {
  SurveyConfig,
  SurveyQuestion,
  SurveySettings,
  SurveySubmission,
} from './types'

/**
 * Thank You Page Extension Entry Point
 */
export default reactExtension('purchase.thank-you.block.render', () => (
  <SurveyExtension />
))

/**
 * Order Status Page Extension Entry Point
 */
export const orderStatusExtension = reactExtension(
  'customer-account.order-status.block.render',
  () => <SurveyExtension />
)

/**
 * Main Survey Extension Component
 */
function SurveyExtension() {
  const { checkoutToken, shop, order } = useApi<'purchase.thank-you.block.render'>()
  const settings = useSettings<SurveySettings>()

  const [config, setConfig] = useState<SurveyConfig | null>(null)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if survey was already submitted (stored in localStorage via order ID)
  const storageKey = `cgk_survey_${order?.id || checkoutToken}`

  // Load survey configuration from platform API
  useEffect(() => {
    async function loadConfig() {
      // Check if already submitted
      try {
        // Note: localStorage not available in checkout sandbox
        // Survey submission state managed server-side
      } catch {
        // Ignore storage errors in sandbox
      }

      if (!settings.survey_config_url) {
        setLoading(false)
        return
      }

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }
        if (settings.api_key) {
          headers['X-API-Key'] = settings.api_key
        }

        const response = await fetch(settings.survey_config_url, { headers })

        if (response.ok) {
          const data = (await response.json()) as SurveyConfig

          // Apply settings overrides
          if (settings.survey_title) {
            data.title = settings.survey_title
          }
          if (settings.submit_button_text) {
            data.submitButtonText = settings.submit_button_text
          }
          if (settings.thank_you_message) {
            data.thankYouMessage = settings.thank_you_message
          }

          setConfig(data)
        } else {
          console.error(
            '[CGK Survey] Failed to load config:',
            response.status
          )
        }
      } catch (err) {
        console.error('[CGK Survey] Error loading config:', err)
      } finally {
        setLoading(false)
      }
    }

    loadConfig()
  }, [settings, storageKey])

  // Update answer for a question
  const handleAnswerChange = useCallback(
    (questionId: string, value: string | string[]) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }))
    },
    []
  )

  // Submit survey responses
  const handleSubmit = useCallback(async () => {
    if (!config || !order?.id || !settings.survey_config_url) return

    setSubmitting(true)
    setError(null)

    try {
      const submission: SurveySubmission = {
        orderId: order.id,
        orderNumber: order.name,
        shop: shop.myshopifyDomain || shop.storefrontUrl || '',
        answers,
        submittedAt: new Date().toISOString(),
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (settings.api_key) {
        headers['X-API-Key'] = settings.api_key
      }

      const response = await fetch(
        `${settings.survey_config_url}/submit`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(submission),
        }
      )

      if (response.ok) {
        setSubmitted(true)
      } else {
        setError('Failed to submit survey. Please try again.')
      }
    } catch (err) {
      console.error('[CGK Survey] Submit error:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [config, order, shop, answers, settings])

  // Loading state
  if (loading) {
    return (
      <BlockStack spacing="base" padding="base">
        <InlineStack spacing="base" blockAlignment="center">
          <Spinner />
          <Text>Loading survey...</Text>
        </InlineStack>
      </BlockStack>
    )
  }

  // No config - don't render anything
  if (!config || config.questions.length === 0) {
    return null
  }

  // Submitted state
  if (submitted) {
    return (
      <BlockStack spacing="base" padding="base">
        <Divider />
        <Text emphasis="bold" appearance="success">
          {config.thankYouMessage || 'Thank you for your feedback!'}
        </Text>
      </BlockStack>
    )
  }

  return (
    <BlockStack spacing="base" padding="base">
      <Divider />

      <Heading level={2}>
        {config.title || settings.survey_title || 'Quick Question'}
      </Heading>

      {config.questions.map((question) => (
        <QuestionRenderer
          key={question.id}
          question={question}
          value={answers[question.id]}
          onChange={(value) => handleAnswerChange(question.id, value)}
        />
      ))}

      {error && (
        <Text appearance="critical">{error}</Text>
      )}

      <Button
        onPress={handleSubmit}
        loading={submitting}
        disabled={submitting}
      >
        {config.submitButtonText || settings.submit_button_text || 'Submit'}
      </Button>
    </BlockStack>
  )
}

/**
 * Question Renderer Component
 * Renders the appropriate input based on question type
 */
interface QuestionRendererProps {
  question: SurveyQuestion
  value: string | string[] | undefined
  onChange: (value: string | string[]) => void
}

function QuestionRenderer({
  question,
  value,
  onChange,
}: QuestionRendererProps) {
  switch (question.type) {
    case 'single_choice':
      return (
        <BlockStack spacing="tight">
          <Text emphasis="bold">{question.question}</Text>
          {question.options && (
            <ChoiceList
              name={question.id}
              value={(value as string) || ''}
              onChange={(newValue) => onChange(newValue)}
            >
              {question.options.map((option) => (
                <Choice key={option.value} id={option.value}>
                  {option.label}
                </Choice>
              ))}
            </ChoiceList>
          )}
        </BlockStack>
      )

    case 'multi_choice':
      return (
        <BlockStack spacing="tight">
          <Text emphasis="bold">{question.question}</Text>
          {question.options && (
            <ChoiceList
              name={question.id}
              value={(value as string[]) || []}
              onChange={(newValue) => onChange(newValue)}
              allowMultiple
            >
              {question.options.map((option) => (
                <Choice key={option.value} id={option.value}>
                  {option.label}
                </Choice>
              ))}
            </ChoiceList>
          )}
        </BlockStack>
      )

    case 'text':
      return (
        <BlockStack spacing="tight">
          <Text emphasis="bold">{question.question}</Text>
          <TextField
            label={question.question}
            labelHidden
            value={(value as string) || ''}
            onChange={(newValue) => onChange(newValue)}
            placeholder={question.placeholder}
          />
        </BlockStack>
      )

    default:
      return null
  }
}
