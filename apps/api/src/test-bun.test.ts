import { expect, test, describe } from 'bun:test'
import type { Opportunity, Bid } from '@spot-exchange/shared'

describe('API Server with Bun', () => {
  test('TypeScript types work correctly', () => {
    const opportunity: Opportunity = {
      id: '123',
      tenantId: 'tenant-1',
      createdBy: 'user-1',
      origin: {
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'US'
      },
      destination: {
        address: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA', 
        zipCode: '90210',
        country: 'US'
      },
      cargoDetails: {
        weight: 1000,
        weightUnit: 'lbs',
        commodity: 'Electronics',
        hazmat: false
      },
      equipment: ['dry_van'],
      pickupDate: new Date('2024-01-15'),
      deliveryDate: new Date('2024-01-20'),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    expect(opportunity.id).toBe('123')
    expect(opportunity.equipment).toContain('dry_van')
    expect(opportunity.status).toBe('active')
  })

  test('Bid types work correctly', () => {
    const bid: Bid = {
      id: 'bid-1',
      opportunityId: 'opp-1',
      carrierId: 'carrier-1',
      amount: 2500,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    expect(bid.amount).toBe(2500)
    expect(bid.status).toBe('active')
  })

  test('API client can be imported', async () => {
    const { SpotExchangeAPI } = await import('@spot-exchange/shared')
    expect(typeof SpotExchangeAPI).toBe('function')
  })
})