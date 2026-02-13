import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '@/index'
import { prismaMock } from './vitest.setup'

describe('Decks Endpoints', () => {
  // Mock Deck for tests
  const mockDeck = {
    id: 10,
    name: 'My Deck',
    userId: 1,
    cards: Array(10).fill({ card: { id: 1, name: 'Pika' } }),
  }

  // Test for create a new deck with the required 10 cards
  it('POST /api/decks should create a deck with 10 cards', async () => {
    prismaMock.card.findMany.mockResolvedValue(Array(10).fill({ id: 1 }))
    prismaMock.deck.create.mockResolvedValue(mockDeck as typeof mockDeck)

    const res = await request(app)
      .post('/api/decks')
      .send({ name: 'My Deck', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('My Deck')
  })

  // Test for retrieving the current user's decks
  it('GET /api/decks/mine should return user decks', async () => {
    prismaMock.deck.findMany.mockResolvedValue([
      mockDeck,
    ] as (typeof mockDeck)[])

    const res = await request(app).get('/api/decks/mine')

    expect(res.status).toBe(200)
    expect(res.body[0].userId).toBe(1)
  })

  // Test for deleting a specific deck by its ID
  it('DELETE /api/decks/:id should delete if owner', async () => {
    prismaMock.deck.findUnique.mockResolvedValue(mockDeck as typeof mockDeck)
    prismaMock.deck.delete.mockResolvedValue(mockDeck as typeof mockDeck)

    const res = await request(app).delete('/api/decks/10')

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Deleted deck')
  })
})
