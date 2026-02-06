import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { app } from '@/index';
import { prismaMock } from './vitest.setup';

vi.mock('bcrypt', () => ({
    default: {
        // Simulate a successful password 
        compare: vi.fn().mockResolvedValue(true), 
        hash: vi.fn().mockResolvedValue('hashed_password')
    }
}));

// Test for Auth Endpoints
describe('Auth Endpoints', () => {
    describe('POST /api/auth/sign-up', () => {
        // Test for creating a new user
        it('should create a new user and return 201', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);
            prismaMock.user.create.mockResolvedValue({
                id: 1,
                email: 'test@test.com',
                username: 'testuser',
                password: 'hashed_password'
            });

            const res = await request(app)
                .post('/api/auth/sign-up')
                .send({ email: 'test@test.com', username: 'testuser', password: 'password123' });

            expect(res.status).toBe(201);
            expect(res.body.user).toHaveProperty('email', 'test@test.com');
        });

        // Test for email already exists
        it('should return 409 if email already exists', async () => {
            prismaMock.user.findUnique.mockResolvedValue({ id: 1 } as any);

            const res = await request(app)
                .post('/api/auth/sign-up')
                .send({ email: 'existing@test.com', username: 'test', password: 'password' });

            expect(res.status).toBe(409);
        });
    });

    // Test for sign-in
    describe('POST /api/auth/sign-in', () => {
        it('should return 200 and a token on valid credentials', async () => {
            // Simulate a user existing
            prismaMock.user.findUnique.mockResolvedValue({
                id: 1,
                email: 'test@test.com',
                password: 'hashed_password_matching_password123' 
            } as any);

            const res = await request(app)
                .post('/api/auth/sign-in')
                .send({ email: 'test@test.com', password: 'password123' });

            // Check if the response status is 200
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
        });
    });
});