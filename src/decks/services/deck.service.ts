import { prisma } from '../../database';

export const createDeck = async (userId: number, name: string, cardIds: number[]) => {
    // Check if the cards exist
    const existingCards = await prisma.card.findMany({
        where: { id: { in: cardIds } }
    });

    if (existingCards.length !== 10) {
        throw new Error('Invalid cards: Some cards do not exist or duplicate IDs used');
    }

    // Create the deck transactionally
    return await prisma.deck.create({
        data: {
            name,
            userId,
            cards: {
                create: cardIds.map(id => ({ cardId: id }))
            }
        },
        include: { cards: { include: { card: true } } }
    });
};

export const getUserDecks = async (userId: number) => {
    return await prisma.deck.findMany({
        where: { userId },
        include: { cards: { include: { card: true } } }
    });
};

export const getDeckById = async (deckId: number) => {
    return await prisma.deck.findUnique({
        where: { id: deckId },
        include: { cards: { include: { card: true } } }
    });
};

export const updateDeck = async (deckId: number, name: string, cardIds: number[]) => {
    // Check if cards was provided
    const existingCards = await prisma.card.findMany({
        where: { id: { in: cardIds } }
    });
    if (existingCards.length !== 10) throw new Error('Invalid cards');

    // Use prisma transaction for delete or update the deck
    return await prisma.$transaction(async (tx) => {
        await tx.deckCard.deleteMany({ where: { deckId } });
        return await tx.deck.update({
            where: { id: deckId },
            data: {
                name,
                cards: {
                    create: cardIds.map(id => ({ cardId: id }))
                }
            },
            include: { cards: { include: { card: true } } }
        });
    });
};

export const deleteDeck = async (deckId: number) => {
    // Cascade delete
    await prisma.deckCard.deleteMany({ where: { deckId } });
    return await prisma.deck.delete({ where: { id: deckId } });
};