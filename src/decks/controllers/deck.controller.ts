import { Request, Response } from 'express'
import * as deckService from '../services/deck.service'

// POST /api/decks
export const create = async (req: Request, res: Response) => {
  const { name, cards } = req.body
  const userId = req.user?.userId

  if (!name || !cards || cards.length !== 10) {
    return res
      .status(400)
      .json({ error: 'A deck must have a name and exactly 10 cards' })
  }

  try {
    const deck = await deckService.createDeck(userId!, name, cards)
    return res.status(201).json(deck)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(400).json({ error: message })
  }
}

// GET /api/decks/mine
export const getMine = async (req: Request, res: Response) => {
  const decks = await deckService.getUserDecks(req.user!.userId)
  return res.status(200).json(decks)
}

// GET /api/decks/:id
export const getOne = async (req: Request, res: Response) => {
  const deck = await deckService.getDeckById(Number(req.params.id))
  if (!deck) return res.status(404).json({ error: 'Deck not found' })
  if (deck.userId !== req.user!.userId)
    return res.status(403).json({ error: 'This deck does not belong to you' })

  return res.status(200).json(deck)
}

// PATCH /api/decks/:id
export const update = async (req: Request, res: Response) => {
  const { name, cards } = req.body
  const deckId = Number(req.params.id)

  try {
    const deck = await deckService.getDeckById(deckId)
    if (!deck) return res.status(404).json({ error: 'Deck not found' })
    if (deck.userId !== req.user!.userId)
      return res.status(403).json({ error: 'Access denied' })
    if (cards && cards.length !== 10)
      return res.status(400).json({ error: 'You need 10 cards' })

    const updated = await deckService.updateDeck(
      deckId,
      name || deck.name,
      cards || deck.cards.map((c) => c.cardId),
    )
    return res.status(200).json(updated)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(400).json({ error: message })
  }
}

// DELETE /api/decks/:id
export const remove = async (req: Request, res: Response) => {
  const deckId = Number(req.params.id)
  const deck = await deckService.getDeckById(deckId)

  if (!deck) return res.status(404).json({ error: 'Deck not found' })
  if (deck.userId !== req.user!.userId)
    return res.status(403).json({ error: 'Access denied' })

  await deckService.deleteDeck(deckId)
  return res.status(200).json({ message: 'Deleted deck' })
}
