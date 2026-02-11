import { describe, expect, it } from 'vitest'

import {
  AUTH_COOKIE_NAME,
  clearAuthCookie,
  getAuthCookie,
  setAuthCookie,
} from '../cookies'

describe('cookie utilities', () => {
  describe('getAuthCookie', () => {
    it('should extract auth cookie from request', () => {
      const token = 'test-jwt-token'
      const request = new Request('https://example.com', {
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${token}`,
        },
      })

      const result = getAuthCookie(request)
      expect(result).toBe(token)
    })

    it('should return null when no cookie header', () => {
      const request = new Request('https://example.com')

      const result = getAuthCookie(request)
      expect(result).toBeNull()
    })

    it('should return null when auth cookie not present', () => {
      const request = new Request('https://example.com', {
        headers: {
          cookie: 'other-cookie=value',
        },
      })

      const result = getAuthCookie(request)
      expect(result).toBeNull()
    })

    it('should handle multiple cookies', () => {
      const token = 'test-jwt-token'
      const request = new Request('https://example.com', {
        headers: {
          cookie: `foo=bar; ${AUTH_COOKIE_NAME}=${token}; baz=qux`,
        },
      })

      const result = getAuthCookie(request)
      expect(result).toBe(token)
    })
  })

  describe('setAuthCookie', () => {
    it('should set auth cookie on response', () => {
      const token = 'test-jwt-token'
      const response = new Response('OK')

      const result = setAuthCookie(response, token)

      const setCookie = result.headers.get('Set-Cookie')
      expect(setCookie).toContain(`${AUTH_COOKIE_NAME}=${token}`)
      expect(setCookie).toContain('HttpOnly')
      expect(setCookie).toContain('Path=/')
      expect(setCookie).toContain('SameSite=lax')
    })

    it('should preserve response body and status', () => {
      const token = 'test-jwt-token'
      const response = new Response('Test body', { status: 201 })

      const result = setAuthCookie(response, token)

      expect(result.status).toBe(201)
    })
  })

  describe('clearAuthCookie', () => {
    it('should clear auth cookie', () => {
      const response = new Response('OK')

      const result = clearAuthCookie(response)

      const setCookie = result.headers.get('Set-Cookie')
      expect(setCookie).toContain(`${AUTH_COOKIE_NAME}=`)
      expect(setCookie).toContain('Max-Age=0')
      expect(setCookie).toContain('Expires=Thu, 01 Jan 1970')
    })
  })
})
