/**
 * SMS Module Tests
 */

import { describe, expect, it } from 'vitest'

import {
  calculateSegmentCount,
  exceedsSingleSegment,
  getRecommendedMaxLength,
  isOptInMessage,
  isOptOutMessage,
  isValidE164PhoneNumber,
  maskPhoneNumber,
  normalizeToE164,
  substituteVariables,
  validateVariables,
  extractVariables,
  OPT_OUT_KEYWORDS,
  OPT_IN_KEYWORDS,
} from '../sms/index.js'

describe('SMS Compliance', () => {
  describe('isOptOutMessage', () => {
    it('should detect STOP keyword', () => {
      expect(isOptOutMessage('STOP')).toBe(true)
      expect(isOptOutMessage('stop')).toBe(true)
      expect(isOptOutMessage('Stop')).toBe(true)
      expect(isOptOutMessage('  STOP  ')).toBe(true)
    })

    it('should detect other opt-out keywords', () => {
      expect(isOptOutMessage('UNSUBSCRIBE')).toBe(true)
      expect(isOptOutMessage('CANCEL')).toBe(true)
      expect(isOptOutMessage('END')).toBe(true)
      expect(isOptOutMessage('QUIT')).toBe(true)
    })

    it('should not match non-opt-out messages', () => {
      expect(isOptOutMessage('Hello')).toBe(false)
      expect(isOptOutMessage('STOPPED')).toBe(false)
      expect(isOptOutMessage('Please stop')).toBe(false)
    })
  })

  describe('isOptInMessage', () => {
    it('should detect START keyword', () => {
      expect(isOptInMessage('START')).toBe(true)
      expect(isOptInMessage('start')).toBe(true)
      expect(isOptInMessage('  START  ')).toBe(true)
    })

    it('should detect other opt-in keywords', () => {
      expect(isOptInMessage('YES')).toBe(true)
      expect(isOptInMessage('UNSTOP')).toBe(true)
      expect(isOptInMessage('SUBSCRIBE')).toBe(true)
    })

    it('should not match non-opt-in messages', () => {
      expect(isOptInMessage('Hello')).toBe(false)
      expect(isOptInMessage('STARTED')).toBe(false)
    })
  })

  describe('isValidE164PhoneNumber', () => {
    it('should validate correct E.164 numbers', () => {
      expect(isValidE164PhoneNumber('+15551234567')).toBe(true)
      expect(isValidE164PhoneNumber('+447911123456')).toBe(true)
      expect(isValidE164PhoneNumber('+12025551234')).toBe(true)
    })

    it('should reject invalid numbers', () => {
      expect(isValidE164PhoneNumber('15551234567')).toBe(false)
      expect(isValidE164PhoneNumber('555-123-4567')).toBe(false)
      expect(isValidE164PhoneNumber('+0123456789')).toBe(false)
      expect(isValidE164PhoneNumber('')).toBe(false)
    })
  })

  describe('normalizeToE164', () => {
    it('should normalize US numbers', () => {
      expect(normalizeToE164('5551234567')).toBe('+15551234567')
      expect(normalizeToE164('15551234567')).toBe('+15551234567')
      expect(normalizeToE164('(555) 123-4567')).toBe('+15551234567')
    })

    it('should preserve valid E.164 numbers', () => {
      expect(normalizeToE164('+15551234567')).toBe('+15551234567')
      expect(normalizeToE164('+447911123456')).toBe('+447911123456')
    })

    it('should return null for invalid numbers', () => {
      expect(normalizeToE164('123')).toBeNull()
      expect(normalizeToE164('abcd')).toBeNull()
    })
  })

  describe('maskPhoneNumber', () => {
    it('should mask phone numbers showing last 4 digits', () => {
      expect(maskPhoneNumber('+15551234567')).toBe('+*******4567')
      expect(maskPhoneNumber('1234')).toBe('1234')
      expect(maskPhoneNumber('12')).toBe('****')
    })
  })

  describe('calculateSegmentCount', () => {
    it('should calculate single segment for short messages', () => {
      const result = calculateSegmentCount('Hello world!')
      expect(result.segmentCount).toBe(1)
      expect(result.encoding).toBe('GSM-7')
    })

    it('should calculate multiple segments for long messages', () => {
      const longMessage = 'A'.repeat(161)
      const result = calculateSegmentCount(longMessage)
      expect(result.segmentCount).toBe(2)
    })

    it('should detect UCS-2 encoding for non-GSM characters', () => {
      const emojiMessage = 'Hello world! 😊'
      const result = calculateSegmentCount(emojiMessage)
      expect(result.encoding).toBe('UCS-2')
    })
  })

  describe('exceedsSingleSegment', () => {
    it('should return false for short messages', () => {
      expect(exceedsSingleSegment('Hello world!')).toBe(false)
    })

    it('should return true for long messages', () => {
      expect(exceedsSingleSegment('A'.repeat(161))).toBe(true)
    })
  })

  describe('getRecommendedMaxLength', () => {
    it('should return 160 for GSM-7 content', () => {
      expect(getRecommendedMaxLength('Hello')).toBe(160)
    })

    it('should return 70 for UCS-2 content', () => {
      expect(getRecommendedMaxLength('Hello 😊')).toBe(70)
    })
  })
})

describe('SMS Templates', () => {
  describe('substituteVariables', () => {
    it('should substitute variables', () => {
      const content = 'Hello {{name}}, your order #{{orderNumber}} has shipped!'
      const result = substituteVariables(content, {
        name: 'John',
        orderNumber: '12345',
      })
      expect(result).toBe('Hello John, your order #12345 has shipped!')
    })

    it('should keep placeholders for missing variables', () => {
      const content = 'Hello {{name}}, tracking: {{trackingUrl}}'
      const result = substituteVariables(content, { name: 'John' })
      expect(result).toBe('Hello John, tracking: {{trackingUrl}}')
    })

    it('should handle numbers', () => {
      const content = 'Your balance is {{amount}}'
      const result = substituteVariables(content, { amount: 150.50 })
      expect(result).toBe('Your balance is 150.5')
    })
  })

  describe('extractVariables', () => {
    it('should extract variable names', () => {
      const content = 'Hello {{name}}, order {{orderNumber}}'
      const vars = extractVariables(content)
      expect(vars).toEqual(['name', 'orderNumber'])
    })

    it('should not duplicate variables', () => {
      const content = '{{name}} said hello to {{name}}'
      const vars = extractVariables(content)
      expect(vars).toEqual(['name'])
    })
  })

  describe('validateVariables', () => {
    it('should validate all required variables present', () => {
      const content = 'Hello {{name}}'
      const result = validateVariables(content, { name: 'John' })
      expect(result.valid).toBe(true)
      expect(result.missingVariables).toEqual([])
    })

    it('should identify missing variables', () => {
      const content = 'Hello {{name}}, order {{orderNumber}}'
      const result = validateVariables(content, { name: 'John' })
      expect(result.valid).toBe(false)
      expect(result.missingVariables).toEqual(['orderNumber'])
    })
  })
})

describe('SMS Keywords', () => {
  it('should have expected opt-out keywords', () => {
    expect(OPT_OUT_KEYWORDS).toContain('STOP')
    expect(OPT_OUT_KEYWORDS).toContain('UNSUBSCRIBE')
    expect(OPT_OUT_KEYWORDS).toContain('CANCEL')
  })

  it('should have expected opt-in keywords', () => {
    expect(OPT_IN_KEYWORDS).toContain('START')
    expect(OPT_IN_KEYWORDS).toContain('YES')
    expect(OPT_IN_KEYWORDS).toContain('UNSTOP')
  })
})
