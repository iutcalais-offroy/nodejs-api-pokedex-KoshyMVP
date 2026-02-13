import { describe, expect, it, vi } from 'vitest'
import { authenticateToken } from '@/auth/middlewares/auth.middleware'

describe('Auth Middleware', () => {
  vi.unmock('@/auth/middlewares/auth.middleware')

  it('should return 401 if no token is provided', () => {
    // Simulate a request without the Authorization header
    const req = { headers: {} } as {
      headers: Record<string, string | undefined>
    }

    // Prepare the mock response
    const jsonMock = vi.fn()
    const res = {
      status: vi.fn().mockReturnThis(),
      json: jsonMock,
    } as { status: (code: number) => unknown; json: (data: unknown) => void }

    const next = vi.fn()

    // Call the middleware
    authenticateToken(req, res, next)

    // Expectations
    expect(res.status).toHaveBeenCalledWith(401)
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing token' })
    expect(next).not.toHaveBeenCalled()
  })

  it('should call next() if token is valid', () => {})
})
