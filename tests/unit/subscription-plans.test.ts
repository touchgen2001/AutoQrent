import { describe, expect, it } from 'vitest'
import {
  formatPlanPrice,
  getSubscriptionPlanDefinition,
  isBillingInterval,
  isSubscriptionPlanCode,
  isSubscriptionStatus,
  normalizeSubscriptionPlanCode,
  normalizeSubscriptionStatus,
} from '../../lib/subscription-plans'

describe('normalizeSubscriptionPlanCode', () => {
  it('passes through canonical codes', () => {
    expect(normalizeSubscriptionPlanCode('pro')).toBe('pro')
    expect(normalizeSubscriptionPlanCode('enterprise')).toBe('enterprise')
  })

  it('maps Turkish and legacy aliases', () => {
    expect(normalizeSubscriptionPlanCode('profesyonel')).toBe('pro')
    expect(normalizeSubscriptionPlanCode('galeri_plus')).toBe('premium')
    expect(normalizeSubscriptionPlanCode('kurumsal')).toBe('enterprise')
  })

  it('trims and lowercases input', () => {
    expect(normalizeSubscriptionPlanCode('  Başlangıç ')).toBe('starter')
  })

  it('falls back to starter for unknown or non-string input', () => {
    expect(normalizeSubscriptionPlanCode('unknown')).toBe('starter')
    expect(normalizeSubscriptionPlanCode(null)).toBe('starter')
    expect(normalizeSubscriptionPlanCode(42)).toBe('starter')
  })
})

describe('normalizeSubscriptionStatus', () => {
  it('maps aliases to canonical statuses', () => {
    expect(normalizeSubscriptionStatus('trial')).toBe('trialing')
    expect(normalizeSubscriptionStatus('cancelled')).toBe('canceled')
  })

  it('is case-insensitive', () => {
    expect(normalizeSubscriptionStatus('ACTIVE')).toBe('active')
  })

  it('falls back to trialing for unknown input', () => {
    expect(normalizeSubscriptionStatus('nope')).toBe('trialing')
    expect(normalizeSubscriptionStatus(undefined)).toBe('trialing')
  })
})

describe('subscription type guards', () => {
  it('isSubscriptionPlanCode only accepts canonical codes', () => {
    expect(isSubscriptionPlanCode('premium')).toBe(true)
    expect(isSubscriptionPlanCode('galeri_plus')).toBe(false)
    expect(isSubscriptionPlanCode(123)).toBe(false)
  })

  it('isSubscriptionStatus rejects alias-only values', () => {
    expect(isSubscriptionStatus('active')).toBe(true)
    expect(isSubscriptionStatus('trial')).toBe(false)
  })

  it('isBillingInterval', () => {
    expect(isBillingInterval('monthly')).toBe(true)
    expect(isBillingInterval('yearly')).toBe(true)
    expect(isBillingInterval('weekly')).toBe(false)
  })
})

describe('plan definitions and pricing', () => {
  it('exposes starter limits', () => {
    const starter = getSubscriptionPlanDefinition('starter')
    expect(starter.vehicleLimit).toBe(15)
    expect(starter.userLimit).toBe(1)
    expect(starter.monthlyPrice).toBe(999)
  })

  it('enforces a single user account for every plan', () => {
    expect(getSubscriptionPlanDefinition('pro').userLimit).toBe(1)
    expect(getSubscriptionPlanDefinition('premium').userLimit).toBe(1)
    expect(getSubscriptionPlanDefinition('enterprise').userLimit).toBe(1)
    expect(getSubscriptionPlanDefinition('pro').features['team.manage']).toBe(false)
  })

  it('formats quote-only and numeric prices', () => {
    expect(formatPlanPrice(null)).toBe('Teklif ile')
    expect(formatPlanPrice(999)).toContain('999')
  })
})
