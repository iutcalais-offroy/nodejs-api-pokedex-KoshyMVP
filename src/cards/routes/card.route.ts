import { Router } from 'express'
import * as cardController from '../controllers/card.controller'

export const cardRouter = Router()

// GET /api/cards
cardRouter.get('/', cardController.getCards)
