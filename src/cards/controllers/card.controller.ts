import { Request, Response } from 'express';
import * as cardService from '../services/card.service';

export const getCards = async (_req: Request, res: Response) => {
    try {
        const cards = await cardService.getAllCards();
        
        // 200 for the success
        return res.status(200).json(cards);
    } catch (error) {
        console.error('Error in card catalogue', error);
        // 500 for the error
        return res.status(500).json({ error: 'Error during card retrieval' });
    }
};