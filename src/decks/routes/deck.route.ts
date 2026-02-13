import { Router } from 'express'
import * as deckController from '../controllers/deck.controller'
import { authenticateToken } from '../../auth/middlewares/auth.middleware'

export const deckRouter = Router()

// All routes require a JWT
deckRouter.use(authenticateToken)

deckRouter.post('/', deckController.create)
deckRouter.get('/mine', deckController.getMine)
deckRouter.get('/:id', deckController.getOne)
deckRouter.patch('/:id', deckController.update)
deckRouter.delete('/:id', deckController.remove)
