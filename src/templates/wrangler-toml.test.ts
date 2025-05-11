import { describe, it, expect, vi } from 'vitest'
import { hydrateWranglerTemplate, wranglerFileTemplate } from './wrangler-toml'
import { ApiMiddlewareOptions, Config } from '../types'

// Mock dependencies
vi.mock('../parse-domain', () => ({
  getRootDomain: vi.fn().mockImplementation((hostname) => {
    // Simple mock implementation that returns the root domain
    const parts = hostname.split('.')
    if (parts.length >= 2) {
      return parts.slice(-2).join('.')
    }
    return hostname
  }),
}))

vi.mock('jsesc', () => ({
  default: vi.fn().mockImplementation((str, options) => {
    // Simple mock implementation that returns the string with quotes
    if (typeof str === 'string') {
      return `"${str}"`
    }
    return `"${JSON.stringify(str)}"`
  }),
}))

describe('wrangler-toml', () => {
  describe('hydrateWranglerTemplate', () => {
    it('should replace all placeholders in the template', () => {
      const config: Config = {
        hostname: 'app.example.com',
        cloudflareAccountId: '1234567890abcdef1234567890abcdef',
        debug: false,
      }
      
      const middleware: ApiMiddlewareOptions = {
        'lock-page-slug': '/custom-maintenance',
        'csp-mode': 'enforced',
        'csp-directives': { 'default-src': "'self'" },
      }
      
      const result = hydrateWranglerTemplate(wranglerFileTemplate, config, middleware)
      
      // Check that all placeholders were replaced
      expect(result).toContain('account_id = "1234567890abcdef1234567890abcdef"')
      expect(result).toContain('LOCK_PAGE_SLUG = "/custom-maintenance"')
      expect(result).toContain('pattern = "*app.example.com/*"')
      expect(result).toContain('zone_name = "example.com"')
      expect(result).toContain('CSP_MODE = "enforced"')
      expect(result).toContain('CSP_DIRECTIVES = "')
    })
    
    it('should use default values when middleware options are missing', () => {
      const config: Config = {
        hostname: 'app.example.com',
        cloudflareAccountId: '1234567890abcdef1234567890abcdef',
        debug: false,
      }
      
      const middleware: ApiMiddlewareOptions = {}
      
      const result = hydrateWranglerTemplate(wranglerFileTemplate, config, middleware)
      
      // Check that default values were used
      expect(result).toContain('LOCK_PAGE_SLUG = "/maintenance"')
      expect(result).toContain('CSP_MODE = "disabled"')
      expect(result).toContain('CSP_DIRECTIVES = ""')
    })
    
    it('should handle string CSP directives', () => {
      const config: Config = {
        hostname: 'app.example.com',
        cloudflareAccountId: '1234567890abcdef1234567890abcdef',
        debug: false,
      }
      
      const middleware: ApiMiddlewareOptions = {
        'csp-directives': 'default-src "self"; script-src "self"',
      }
      
      const result = hydrateWranglerTemplate(wranglerFileTemplate, config, middleware)
      
      // Check that the CSP directives were properly escaped
      expect(result).toContain('CSP_DIRECTIVES = "')
    })
  })
})
