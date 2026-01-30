import { Request, Response, Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../database';

export const authRouter = Router();

const JWT_EXPIRES_IN = '7d'; // 7 days expiration

// POST /api/auth/sign-up
authRouter.post('/sign-up', async (req: Request, res: Response) => {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
        return res.status(400).json({ error: 'Missing data' });
    }

    try {
        // Check if email exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ error: 'Email is use' }); // 409 Conflict 
        }

        // Hashed the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await prisma.user.create({
            data: { email, username, password: hashedPassword }
        });

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET as string,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Send response
        return res.status(201).json({
            token,
            user: { id: user.id, username: user.username, email: user.email }
        });
    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/auth/sign-in
authRouter.post('/sign-in', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Missing data' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        
        // Check if password exists
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Incorrect identifiers' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET as string,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return res.status(200).json({
            token,
            user: { id: user.id, username: user.username, email: user.email }
        });
    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
});