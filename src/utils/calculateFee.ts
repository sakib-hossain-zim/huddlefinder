import type { Venue } from '@/types/venue'

const STARTER_COMMISSION = 0.09
const PRO_COMMISSION     = 0.065

export function getCommissionRate(plan: Venue['plan']): number {
  return plan === 'pro' ? PRO_COMMISSION : STARTER_COMMISSION
}

export function calculatePlatformFee(amountCents: number, plan: Venue['plan']): number {
  return Math.round(amountCents * getCommissionRate(plan))
}

export function calculateVenuePayout(amountCents: number, plan: Venue['plan']): number {
  return amountCents - calculatePlatformFee(amountCents, plan)
}

export function calculateTicketSplit(
  unitPriceCents: number,
  quantity: number,
  plan: Venue['plan']
) {
  const totalAmount  = unitPriceCents * quantity
  const platformFee  = calculatePlatformFee(totalAmount, plan)
  const venuePayout  = totalAmount - platformFee

  return {
    unitPrice:      unitPriceCents,
    quantity,
    totalAmount,
    platformFee,
    venuePayout,
    commissionRate: getCommissionRate(plan),
  }
}