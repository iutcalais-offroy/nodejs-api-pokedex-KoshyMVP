import { prisma } from '../../database'

/**
 * Retrieves the full list of Pokémon cards from the database.
 * The cards are sorted by their Pokedex number in ascending order.
 * * @returns {Promise<Card[]>} A promise that resolves to an array of card objects.
 * @throws {Error} If the database query fails.
 * @example const cards = await cardService.getAllCards();
 * @async
 */
export const getAllCards = async () => {
  // Sort by increasing pokedexNumber
  return await prisma.card.findMany({
    orderBy: {
      pokedexNumber: 'asc',
    },
  })
}
