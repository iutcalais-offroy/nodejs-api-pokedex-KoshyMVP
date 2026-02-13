import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '@/index'
import { prismaMock } from './vitest.setup'

describe('Cards Endpoints', () => {
  // Test for the success case: retrieving the list of cards
  it('GET /api/cards should return all cards sorted by pokedexNumber', async () => {
    const mockCards = [
      { id: 1, name: 'Bulbasaur', pokedexNumber: 1 },
      { id: 2, name: 'Charmander', pokedexNumber: 4 },
    ]

    prismaMock.card.findMany.mockResolvedValue(mockCards as typeof mockCards)
    const res = await request(app).get('/api/cards')

    // Check if the response status is 200
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].pokedexNumber).toBe(1)
  })

  // Test for the failure case: handling a database error
  it('should return 500 on server error', async () => {
    prismaMock.card.findMany.mockRejectedValue(new Error('DB Error'))
    const res = await request(app).get('/api/cards')
    expect(res.status).toBe(500)
  })
})
