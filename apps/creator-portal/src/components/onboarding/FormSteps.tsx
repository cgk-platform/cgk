'use client'

import { Input, Label, Checkbox } from '@cgk/ui'
import { US_STATES } from '../../lib/onboarding/types'
import type { CreatorApplicationForm, SurveyQuestion } from '../../lib/onboarding/types'
import type { ValidationErrors } from '../../lib/onboarding/validation'

interface StepProps {
  formData: CreatorApplicationForm
  errors: ValidationErrors
  onChange: (field: keyof CreatorApplicationForm, value: unknown) => void
}

/**
 * Step 1: Basic Info
 */
export function Step1BasicInfo({
  formData,
  errors,
  onChange,
}: StepProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Tell us about yourself</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ll use this information to get in touch with you.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="First Name"
          error={errors.firstName}
          required
        >
          <Input
            value={formData.firstName}
            onChange={(e) => onChange('firstName', e.target.value)}
            placeholder="Jane"
          />
        </FormField>

        <FormField
          label="Last Name"
          error={errors.lastName}
          required
        >
          <Input
            value={formData.lastName}
            onChange={(e) => onChange('lastName', e.target.value)}
            placeholder="Doe"
          />
        </FormField>
      </div>

      <FormField
        label="Email Address"
        error={errors.email}
        required
      >
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => onChange('email', e.target.value)}
          placeholder="jane@example.com"
        />
      </FormField>

      <FormField
        label="Phone Number"
        error={errors.phone}
        required
      >
        <Input
          type="tel"
          value={formData.phone}
          onChange={(e) => onChange('phone', e.target.value)}
          placeholder="(555) 123-4567"
        />
      </FormField>
    </div>
  )
}

/**
 * Step 2: Social Media
 */
export function Step2SocialMedia({
  formData,
  errors,
  onChange,
}: StepProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Your online presence</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Share your social media profiles so we can learn more about your content.
          All fields are optional.
        </p>
      </div>

      <FormField
        label="Instagram"
        error={errors.instagram}
        hint="Your handle without the @ symbol"
      >
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            @
          </span>
          <Input
            value={formData.instagram}
            onChange={(e) => onChange('instagram', e.target.value.replace('@', ''))}
            placeholder="yourhandle"
            className="pl-8"
          />
        </div>
      </FormField>

      <FormField
        label="TikTok"
        error={errors.tiktok}
        hint="Your handle without the @ symbol"
      >
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            @
          </span>
          <Input
            value={formData.tiktok}
            onChange={(e) => onChange('tiktok', e.target.value.replace('@', ''))}
            placeholder="yourhandle"
            className="pl-8"
          />
        </div>
      </FormField>

      <FormField
        label="YouTube Channel"
        error={errors.youtube}
        hint="Full URL to your YouTube channel"
      >
        <Input
          type="url"
          value={formData.youtube}
          onChange={(e) => onChange('youtube', e.target.value)}
          placeholder="https://youtube.com/@yourchannel"
        />
      </FormField>

      <FormField
        label="Portfolio / Website"
        error={errors.portfolioUrl}
        hint="Optional link to your portfolio or website"
      >
        <Input
          type="url"
          value={formData.portfolioUrl}
          onChange={(e) => onChange('portfolioUrl', e.target.value)}
          placeholder="https://yourwebsite.com"
        />
      </FormField>
    </div>
  )
}

/**
 * Step 3: Shipping Address
 */
export function Step3ShippingAddress({
  formData,
  errors,
  onChange,
}: StepProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Where should we send products?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ll use this address to send you sample products for content creation.
        </p>
      </div>

      <FormField
        label="Street Address"
        error={errors.addressLine1}
        required
      >
        <Input
          value={formData.addressLine1}
          onChange={(e) => onChange('addressLine1', e.target.value)}
          placeholder="123 Main Street"
        />
      </FormField>

      <FormField
        label="Apartment, Suite, etc."
        error={errors.addressLine2}
      >
        <Input
          value={formData.addressLine2}
          onChange={(e) => onChange('addressLine2', e.target.value)}
          placeholder="Apt 4B (optional)"
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="City"
          error={errors.city}
          required
        >
          <Input
            value={formData.city}
            onChange={(e) => onChange('city', e.target.value)}
            placeholder="New York"
          />
        </FormField>

        <FormField
          label="State"
          error={errors.state}
          required
        >
          <select
            value={formData.state}
            onChange={(e) => onChange('state', e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Select state...</option>
            {US_STATES.map((state) => (
              <option key={state.value} value={state.value}>
                {state.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Postal Code"
          error={errors.postalCode}
          required
        >
          <Input
            value={formData.postalCode}
            onChange={(e) => onChange('postalCode', e.target.value)}
            placeholder="10001"
          />
        </FormField>

        <FormField
          label="Country"
          error={errors.country}
        >
          <Input
            value="United States"
            disabled
            className="bg-muted"
          />
        </FormField>
      </div>
    </div>
  )
}

interface Step4Props extends StepProps {
  surveyQuestions: SurveyQuestion[]
  onSurveyChange: (questionId: string, value: string | string[]) => void
}

/**
 * Step 4: Content Interests
 */
export function Step4ContentInterests({
  formData,
  errors,
  onChange,
  surveyQuestions,
  onSurveyChange,
}: Step4Props): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Content preferences</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Help us understand what type of content collaborations interest you.
        </p>
      </div>

      <div className="space-y-4">
        <CheckboxField
          id="interestedInReviews"
          label="Product Reviews"
          description="Create honest review content for products"
          checked={formData.interestedInReviews}
          onChange={(checked) => onChange('interestedInReviews', checked)}
        />

        <CheckboxField
          id="interestedInPromotion"
          label="Promotional Content"
          description="Create sponsored posts and promotional content"
          checked={formData.interestedInPromotion}
          onChange={(checked) => onChange('interestedInPromotion', checked)}
        />

        <CheckboxField
          id="tiktokShopCreator"
          label="TikTok Shop Creator"
          description="I'm already or want to become a TikTok Shop creator"
          checked={formData.tiktokShopCreator}
          onChange={(checked) => onChange('tiktokShopCreator', checked)}
        />

        {formData.tiktokShopCreator && (
          <div className="ml-6 space-y-4 border-l-2 border-primary/20 pl-4">
            <CheckboxField
              id="willingToPostTiktokShop"
              label="Post on TikTok Shop"
              description="I'm willing to post products on TikTok Shop"
              checked={formData.willingToPostTiktokShop}
              onChange={(checked) => onChange('willingToPostTiktokShop', checked)}
            />

            {!formData.tiktok && (
              <p className="text-sm text-destructive">
                Please add your TikTok handle on the Social Media step to enable TikTok Shop features.
              </p>
            )}
          </div>
        )}

        <CheckboxField
          id="openToCollabPosts"
          label="Collaboration Posts"
          description="Open to collaborative content with other creators"
          checked={formData.openToCollabPosts}
          onChange={(checked) => onChange('openToCollabPosts', checked)}
        />
      </div>

      {/* Dynamic survey questions from tenant config */}
      {surveyQuestions.length > 0 && (
        <div className="space-y-4 border-t pt-6">
          <h3 className="font-medium">Additional Questions</h3>
          {surveyQuestions.map((question) => (
            <SurveyQuestionField
              key={question.id}
              question={question}
              value={formData.surveyResponses[question.id]}
              error={errors[`survey_${question.id}`]}
              onChange={(value) => onSurveyChange(question.id, value)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Helper Components

interface FormFieldProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}

function FormField({
  label,
  error,
  hint,
  required,
  children,
}: FormFieldProps): React.JSX.Element {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}

interface CheckboxFieldProps {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function CheckboxField({
  id,
  label,
  description,
  checked,
  onChange,
}: CheckboxFieldProps): React.JSX.Element {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="mt-1"
      />
      <div>
        <Label htmlFor={id} className="cursor-pointer font-medium">
          {label}
        </Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

interface SurveyQuestionFieldProps {
  question: SurveyQuestion
  value: string | string[] | undefined
  error?: string
  onChange: (value: string | string[]) => void
}

function SurveyQuestionField({
  question,
  value,
  error,
  onChange,
}: SurveyQuestionFieldProps): React.JSX.Element {
  const stringValue = Array.isArray(value) ? value.join(', ') : (value || '')

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {question.question}
        {question.required && <span className="ml-1 text-destructive">*</span>}
      </Label>

      {question.type === 'text' && (
        <Input
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
        />
      )}

      {question.type === 'textarea' && (
        <textarea
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          rows={3}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      )}

      {question.type === 'select' && question.options && (
        <select
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Select an option...</option>
          {question.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}

      {question.type === 'multiselect' && question.options && (
        <div className="space-y-2">
          {question.options.map((option) => {
            const selectedValues = Array.isArray(value) ? value : []
            const isSelected = selectedValues.includes(option)

            return (
              <div key={option} className="flex items-center gap-2">
                <Checkbox
                  id={`${question.id}-${option}`}
                  checked={isSelected}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onChange([...selectedValues, option])
                    } else {
                      onChange(selectedValues.filter((v) => v !== option))
                    }
                  }}
                />
                <Label
                  htmlFor={`${question.id}-${option}`}
                  className="cursor-pointer text-sm"
                >
                  {option}
                </Label>
              </div>
            )
          })}
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
