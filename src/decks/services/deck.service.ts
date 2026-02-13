import { prisma } from '../../database'

/**
 * Creates a new deck for a specified user.
 * @param userId - The ID of the user who owns the deck
 * @param name - The name given to the deck
 * @param cardIds - An array containing exactly 10 card IDs
 * @returns {Promise<Deck>} The newly created deck object
 * @throws {Error} If the cardIds array does not contain exactly 10 cards
 * @throws {Error} If one or more card IDs do not exist in the database
 * @throws {Error} If the user already has a deck with the same name
 */
export const createDeck = async (
  userId: number,
  name: string,
  cardIds: number[],
) => {
  // Check if the cards exist
  const existingCards = await prisma.card.findMany({
    where: { id: { in: cardIds } },
  })

  if (existingCards.length !== 10) {
    throw new Error(
      'Invalid cards: Some cards do not exist or duplicate IDs used',
    )
  }

  // Create the deck transactionally
  return await prisma.deck.create({
    data: {
      name,
      userId,
      cards: {
        create: cardIds.map((id) => ({ cardId: id })),
      },
    },
    include: { cards: { include: { card: true } } },
  })
}

/**
 * Retrieves all decks belonging to a specific user.
 * @param userId - The unique identifier of the user
 * @returns {Promise<Deck[]>} An array of deck objects
 * @example const decks = await deckService.getUserDecks(1);
 * @async
 */
export const getUserDecks = async (userId: number) => {
  return await prisma.deck.findMany({
    where: { userId },
    include: { cards: { include: { card: true } } },
  })
}

/**
 * Retrieves a specific deck by its ID.
 * @param deckId - The ID of the deck to retrieve
 * @returns {Promise<Deck | null>} The deck object or null if not found
 * @throws {Error} If the database connection fails
 * @async
 */
export const getDeckById = async (deckId: number) => {
  return await prisma.deck.findUnique({
    where: { id: deckId },
    include: { cards: { include: { card: true } } },
  })
}

/**
 * Updates an existing deck's name and cards.
 * @param deckId - The ID of the deck to update
 * @param name - The new name for the deck
 * @param cardIds - An array of 10 new card IDs
 * @returns {Promise<Deck>} The updated deck object
 * @throws {Error} If the deck does not exist
 * @throws {Error} If the provided card IDs are invalid or not exactly 10
 * @async
 */
export const updateDeck = async (
  deckId: number,
  name: string,
  cardIds: number[],
) => {
  // Check if cards was provided
  const existingCards = await prisma.card.findMany({
    where: { id: { in: cardIds } },
  })
  if (existingCards.length !== 10) throw new Error('Invalid cards')

  // Use prisma transaction for delete or update the deck
  return await prisma.$transaction(async (tx) => {
    await tx.deckCard.deleteMany({ where: { deckId } })
    return await tx.deck.update({
      where: { id: deckId },
      data: {
        name,
        cards: {
          create: cardIds.map((id) => ({ cardId: id })),
        },
      },
      include: { cards: { include: { card: true } } },
    })
  })
}

/**
 * Deletes a deck from the database.
 * @param userId - ID of the user requesting deletion (for ownership check)
 * @param deckId - ID of the deck to delete
 * @returns {Promise<void>}
 * @throws {Error} If the deck is not found (404)
 * @throws {Error} If the user is not the owner of the deck (403)
 * @async
 */
export const deleteDeck = async (deckId: number) => {
  // Cascade delete
  await prisma.deckCard.deleteMany({ where: { deckId } })
  return await prisma.deck.delete({ where: { id: deckId } })
}
