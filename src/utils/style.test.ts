import { describe, expect, it } from 'vitest'
import { avatarGradient, genName, initials } from './style'

describe('avatarGradient', () => {
  it('returns a linear-gradient string', () => {
    expect(avatarGradient('Alice')).toMatch(/^linear-gradient\(135deg, .+, .+\)$/)
  })

  it('is deterministic for the same name', () => {
    expect(avatarGradient('Alice Smith')).toBe(avatarGradient('Alice Smith'))
  })

  it('can differ for different names', () => {
    // Not guaranteed for every pair, but true for this pair given the hashing scheme.
    expect(avatarGradient('Alice')).not.toBe(avatarGradient('Bob'))
  })
})

describe('genName', () => {
  it('returns Founder for depth 0', () => {
    expect(genName(0)).toBe('Founder')
  })

  it('returns the nth generation label', () => {
    expect(genName(1)).toBe('2nd generation')
    expect(genName(6)).toBe('7th generation')
  })

  it('clamps negative depth to the first entry', () => {
    expect(genName(-5)).toBe('Founder')
  })

  it('clamps depth beyond the list to the last entry', () => {
    expect(genName(50)).toBe('7th generation')
  })
})

describe('initials', () => {
  it('builds initials from a two-word name', () => {
    expect(initials('Jane Doe')).toBe('JD')
  })

  it('uppercases the result', () => {
    expect(initials('jane doe')).toBe('JD')
  })

  it('truncates to two characters for longer names', () => {
    expect(initials('Jane Middle Doe')).toBe('JM')
  })

  it('handles a single word name', () => {
    expect(initials('Cher')).toBe('C')
  })

  it('collapses extra whitespace between words', () => {
    expect(initials('  Jane   Doe  ')).toBe('JD')
  })
})
