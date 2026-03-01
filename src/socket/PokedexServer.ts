import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../env';
import { prisma } from '../database';

interface Room {
    id: string;
    hostId: number;
    hostName: string;
    hostDeckId: number;
}

export class PokedexServer {
    private io: Server;
    private rooms: Map<string, Room> = new Map();

    constructor(httpServer: HTTPServer) {
        this.io = new Server(httpServer, {
            cors: { origin: '*' },
        });

        this.setupAuthentication();
        this.initializeEvents();
    }

    private setupAuthentication() {
        this.io.use((socket, next) => {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error("Connection refused: Token missing"));
            }

            try {
                const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: number, email: string };
                socket.data.userId = decoded.userId;
                socket.data.email = decoded.email;
                next();
            } catch (err) {
                next(new Error("Connection refused: Invalid token"));
            }
        });
    }

    private initializeEvents() {
        this.io.on('connection', (socket: Socket) => {
            console.log(`✅ Player connected: ${socket.data.email} (ID: ${socket.data.userId})`);

            // --- EVENT: createRoom ---
            socket.on('createRoom', async ({ deckId }) => {
                try {
                    const deck = await prisma.deck.findUnique({
                        where: { id: deckId },
                        include: { _count: { select: { cards: true } } }
                    });

                    if (!deck || deck.userId !== socket.data.userId) {
                        socket.emit('error', 'This deck does not belong to you');
                        return; 
                    }
                    if (deck._count.cards !== 10) {
                        socket.emit('error', 'The deck must contain exactly 10 cards');
                        return;
                    }

                    const roomId = `room_${socket.id}`;
                    const newRoom: Room = {
                        id: roomId,
                        hostId: socket.data.userId,
                        hostName: socket.data.email,
                        hostDeckId: deckId
                    };

                    this.rooms.set(roomId, newRoom);
                    socket.join(roomId);

                    socket.emit('roomCreated', newRoom); 
                    this.io.emit('roomsListUpdated', Array.from(this.rooms.values())); 
                    
                } catch (error) {
                    socket.emit('error', 'Server error during room creation');
                }
            });

            // --- EVENT: getRooms ---
            socket.on('getRooms', () => {
                socket.emit('roomsListUpdated', Array.from(this.rooms.values()));
            });

            // --- EVENT: joinRoom ---
            socket.on('joinRoom', async ({ roomId, deckId }) => {
                try {
                    const room = this.rooms.get(roomId);

                    if (!room) {
                        socket.emit('error', 'Room not found');
                        return; 
                    }
                    if (room.hostId === socket.data.userId) {
                        socket.emit('error', 'You are already the host');
                        return;
                    }

                    const deck = await prisma.deck.findUnique({
                        where: { id: deckId },
                        include: { _count: { select: { cards: true } } }
                    });

                    if (!deck || deck.userId !== socket.data.userId || deck._count.cards !== 10) {
                        socket.emit('error', 'Invalid or unauthorized deck');
                        return; 
                    }

                    socket.join(roomId);
                    this.rooms.delete(roomId); 

                    this.io.to(roomId).emit('gameStarted', {
                        roomId,
                        players: [
                            { id: room.hostId, name: room.hostName, host: true },
                            { id: socket.data.userId, name: socket.data.email, host: false }
                        ]
                    });

                    this.io.emit('roomsListUpdated', Array.from(this.rooms.values())); 

                } catch (error) {
                    socket.emit('error', 'Error while joining room');
                }
            });

            socket.on('disconnect', () => {
                const userRoomId = `room_${socket.id}`;
                if (this.rooms.has(userRoomId)) {
                    this.rooms.delete(userRoomId);
                    this.io.emit('roomsListUpdated', Array.from(this.rooms.values()));
                }
                console.log("Client disconnected");
            });
        });
    }
}