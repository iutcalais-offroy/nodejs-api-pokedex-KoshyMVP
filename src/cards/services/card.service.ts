import { prisma } from '../../database';

export const getAllCards = async () => {
    // Sort by increasing pokedexNumber
    return await prisma.card.findMany({
        orderBy: {
            pokedexNumber: 'asc'
        }
    });
};