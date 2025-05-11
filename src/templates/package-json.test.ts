import { describe, it, expect } from 'vitest'
import { hydratePackageJson, packageJsonTemplate } from './package-json'

describe('package-json', () => {
  describe('hydratePackageJson', () => {
    it('should replace version placeholder in the template', () => {
      const version = '1.2.3'
      const result = hydratePackageJson(packageJsonTemplate, { version })
      
      // Check that the version placeholder was replaced
      expect(result).toContain('"version": "1.2.3"')
      expect(result).toContain('"@appwarden/middleware": "1.2.3"')
      expect(result).not.toContain('{{VERSION}}')
    })
    
    it('should handle different version formats', () => {
      const version = '1.0.0-beta.1'
      const result = hydratePackageJson(packageJsonTemplate, { version })
      
      // Check that the version placeholder was replaced
      expect(result).toContain('"version": "1.0.0-beta.1"')
      expect(result).toContain('"@appwarden/middleware": "1.0.0-beta.1"')
    })
  })
})
