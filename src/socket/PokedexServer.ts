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
            // Retrieve token sent by the HTML client via socket.handshake.auth.token
            const token = socket.handshake.auth.token;

            if (!token) {
                // Connection refused if token is missing
                return next(new Error("Connection refused: Token missing"));
            }

            try {
                // Verify JWT token
                const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: number, email: string };
                
                // Inject user information into the socket object (Requirement)
                socket.data.userId = decoded.userId;
                socket.data.email = decoded.email;
                
                next(); // Connection accepted
            } catch (err) {
                // Connection refused if token is invalid
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
                    // Check deck in database via Prisma
                    const deck = await prisma.deck.findUnique({
                        where: { id: deckId },
                        include: { _count: { select: { cards: true } } }
                    });

                    // Requirements: Valid deck (10 cards) and must belong to the user
                    if (!deck || deck.userId !== socket.data.userId) {
                        return socket.emit('error', 'This deck does not belong to you');
                    }
                    if (deck._count.cards !== 10) {
                        return socket.emit('error', 'The deck must contain exactly 10 cards');
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

                    // Confirmation sent to the creator
                    socket.emit('roomCreated', newRoom); 
                    // Broadcast updated list to all clients
                    this.io.emit('roomsListUpdated', Array.from(this.rooms.values())); 
                    
                } catch (error) {
                    socket.emit('error', 'Server error during room creation');
                }
            });

            // --- EVENT: getRooms ---
            socket.on('getRooms', () => {
                // Returns only available rooms for matchmaking
                socket.emit('roomsListUpdated', Array.from(this.rooms.values()));
            });

            // --- EVENT: joinRoom ---
            socket.on('joinRoom', async ({ roomId, deckId }) => {
                try {
                    const room = this.rooms.get(roomId);

                    if (!room) return socket.emit('error', 'Room not found');
                    if (room.hostId === socket.data.userId) return socket.emit('error', 'You are already the host');

                    // Check second player's deck validity
                    const deck = await prisma.deck.findUnique({
                        where: { id: deckId },
                        include: { _count: { select: { cards: true } } }
                    });

                    if (!deck || deck.userId !== socket.data.userId || deck._count.cards !== 10) {
                        return socket.emit('error', 'Invalid or unauthorized deck');
                    }

                    socket.join(roomId);
                    this.rooms.delete(roomId);

                    // Automatically start the game for both players
                    this.io.to(roomId).emit('gameStarted', {
                        roomId,
                        players: [
                            { id: room.hostId, name: room.hostName, host: true },
                            { id: socket.data.userId, name: socket.data.email, host: false }
                        ]
                    });

                    // Broadcast list update (room removed)
                    this.io.emit('roomsListUpdated', Array.from(this.rooms.values())); 

                } catch (error) {
                    socket.emit('error', 'Error while joining room');
                }
            });

            socket.on('disconnect', () => {
                // Cleanup: Remove room if the host disconnects before the game starts
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