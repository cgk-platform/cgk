/**
 * Inbound Email Processing Tests
 */

import { describe, it, expect } from 'vitest'
import {
  parseTreasuryApproval,
  extractTreasuryRequestId,
  isAutoReply,
  isValidTreasuryRequestId,
  detectAutoReply,
  calculateSpamScore,
  isReceiptAttachment,
  isValidAttachmentSize,
  extractAmountFromText,
  extractDateFromText,
  extractVendorFromText,
} from '../inbound/index.js'

describe('Treasury Approval Parser', () => {
  describe('parseTreasuryApproval', () => {
    it('should detect high confidence approval', () => {
      const result = parseTreasuryApproval(
        'Re: Approval Request',
        'Looks good, approved!'
      )

      expect(result.status).toBe('approved')
      expect(result.confidence).toBe('high')
      expect(result.matchedKeywords).toContain('approved')
    })

    it('should detect high confidence rejection', () => {
      const result = parseTreasuryApproval(
        'Re: Approval Request',
        'Request is rejected and denied.'
      )

      expect(result.status).toBe('rejected')
      expect(result.confidence).toBe('high')
      expect(result.matchedKeywords).toContain('rejected')
    })

    it('should detect medium confidence approval', () => {
      const result = parseTreasuryApproval(
        'Re: Request',
        'Sure, that works for me.'
      )

      expect(result.status).toBe('approved')
      expect(result.confidence).toBe('medium')
    })

    it('should return unclear for ambiguous responses', () => {
      const result = parseTreasuryApproval(
        'Re: Request',
        'I need to think about this'
      )

      expect(result.status).toBe('unclear')
      expect(result.confidence).toBe('low')
    })

    it('should detect auto-replies', () => {
      const result = parseTreasuryApproval(
        'Out of Office: Re: Approval Request',
        'I am currently out of the office with limited access to email.'
      )

      expect(result.isAutoReply).toBe(true)
      expect(result.status).toBe('unclear')
    })

    it('should handle LGTM approval', () => {
      const result = parseTreasuryApproval('Re: Payment', 'LGTM')

      expect(result.status).toBe('approved')
      expect(result.confidence).toBe('high')
      expect(result.matchedKeywords).toContain('lgtm')
    })
  })

  describe('extractTreasuryRequestId', () => {
    it('should extract ID from bracket format', () => {
      const id = extractTreasuryRequestId('Re: Approval Request [#SBA-202412-001]')
      expect(id).toBe('SBA-202412-001')
    })

    it('should extract ID from hash format', () => {
      const id = extractTreasuryRequestId('Fwd: #SBA-202501-042 - Payment Request')
      expect(id).toBe('SBA-202501-042')
    })

    it('should extract ID from plain format', () => {
      const id = extractTreasuryRequestId('About SBA-202312-100')
      expect(id).toBe('SBA-202312-100')
    })

    it('should return null for no match', () => {
      const id = extractTreasuryRequestId('Random subject line')
      expect(id).toBeNull()
    })

    it('should handle case insensitivity', () => {
      const id = extractTreasuryRequestId('Re: sba-202412-001')
      expect(id).toBe('SBA-202412-001')
    })
  })

  describe('isValidTreasuryRequestId', () => {
    it('should validate correct format', () => {
      expect(isValidTreasuryRequestId('SBA-202412-001')).toBe(true)
      expect(isValidTreasuryRequestId('SBA-202501-999')).toBe(true)
    })

    it('should reject invalid formats', () => {
      expect(isValidTreasuryRequestId('SBA-12-001')).toBe(false)
      expect(isValidTreasuryRequestId('SBA-202412-1')).toBe(false)
      expect(isValidTreasuryRequestId('ABC-202412-001')).toBe(false)
    })
  })
})

describe('Auto-Reply Detector', () => {
  describe('isAutoReply', () => {
    it('should detect out of office', () => {
      expect(isAutoReply('Out of Office', 'I am away')).toBe(true)
      expect(isAutoReply('Re: Request', 'I am currently out of the office')).toBe(true)
    })

    it('should detect automatic reply subjects', () => {
      expect(isAutoReply('Automatic Reply: Your request', '')).toBe(true)
      expect(isAutoReply('Auto-Reply: Out of office', '')).toBe(true)
    })

    it('should not flag normal emails', () => {
      expect(isAutoReply('Re: Approval Request', 'Approved')).toBe(false)
    })
  })

  describe('detectAutoReply', () => {
    it('should detect auto-reply from headers', () => {
      expect(
        detectAutoReply({
          headers: { 'auto-submitted': 'auto-replied' },
        })
      ).toBe(true)
    })

    it('should detect no-reply senders', () => {
      expect(detectAutoReply({ from: 'noreply@example.com' })).toBe(true)
      expect(detectAutoReply({ from: 'mailer-daemon@example.com' })).toBe(true)
    })
  })

  describe('calculateSpamScore', () => {
    it('should return low score for normal emails', () => {
      const score = calculateSpamScore({
        subject: 'Approval Request',
        bodyText: 'Please review this expense report.',
      })
      expect(score).toBeLessThan(0.3)
    })

    it('should return high score for spammy content', () => {
      const score = calculateSpamScore({
        subject: 'YOU HAVE WON!!!',
        bodyText: 'Click here to claim your prize! Act now! Limited time offer!',
      })
      expect(score).toBeGreaterThan(0.3)
    })
  })
})

describe('Receipt Processor', () => {
  describe('isReceiptAttachment', () => {
    it('should accept valid content types', () => {
      expect(isReceiptAttachment('application/pdf')).toBe(true)
      expect(isReceiptAttachment('image/jpeg')).toBe(true)
      expect(isReceiptAttachment('image/png')).toBe(true)
      expect(isReceiptAttachment('image/webp')).toBe(true)
    })

    it('should reject invalid content types', () => {
      expect(isReceiptAttachment('application/zip')).toBe(false)
      expect(isReceiptAttachment('text/html')).toBe(false)
      expect(isReceiptAttachment('video/mp4')).toBe(false)
    })

    it('should handle content type with parameters', () => {
      expect(isReceiptAttachment('application/pdf; charset=utf-8')).toBe(true)
    })
  })

  describe('isValidAttachmentSize', () => {
    it('should accept valid sizes', () => {
      expect(isValidAttachmentSize(1000)).toBe(true)
      expect(isValidAttachmentSize(10 * 1024 * 1024)).toBe(true)
    })

    it('should reject invalid sizes', () => {
      expect(isValidAttachmentSize(0)).toBe(false)
      expect(isValidAttachmentSize(-1)).toBe(false)
      expect(isValidAttachmentSize(11 * 1024 * 1024)).toBe(false)
    })
  })

  describe('extractAmountFromText', () => {
    it('should extract dollar amounts', () => {
      expect(extractAmountFromText('Total: $123.45')).toBe(12345)
      expect(extractAmountFromText('Amount: $1,234.56')).toBe(123456)
    })

    it('should extract from various formats', () => {
      expect(extractAmountFromText('USD 99.99')).toBe(9999)
      expect(extractAmountFromText('total $50')).toBe(5000)
    })

    it('should return null for no match', () => {
      expect(extractAmountFromText('No amount here')).toBeNull()
    })
  })

  describe('extractDateFromText', () => {
    it('should extract MM/DD/YYYY dates', () => {
      const date = extractDateFromText('Date: 12/25/2024')
      expect(date).toBeTruthy()
    })

    it('should extract YYYY-MM-DD dates', () => {
      const date = extractDateFromText('Date: 2024-12-25')
      expect(date).toBe('2024-12-25')
    })
  })

  describe('extractVendorFromText', () => {
    it('should extract vendor from email domain', () => {
      const vendor = extractVendorFromText('', 'receipt@amazon.com')
      expect(vendor).toBe('Amazon')
    })

    it('should extract vendor from body patterns', () => {
      const vendor = extractVendorFromText('Receipt from Acme Corp', 'noreply@example.com')
      expect(vendor).toBe('Acme Corp')
    })
  })
})
