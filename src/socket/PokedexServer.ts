import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../env';
import { prisma } from '../database';

// Interfaces for Game State
interface GamePlayer {
    id: number;
    name: string;
    socketId: string;
    deck: any[];
    hand: any[];
    activeCard: any | null;
    score: number;
}

interface GameRoom {
    id: string;
    players: GamePlayer[];
    turnIndex: number; 
}

export class PokedexServer {
    private io: Server;
    private rooms: Map<string, GameRoom> = new Map();

    constructor(httpServer: HTTPServer) {
        this.io = new Server(httpServer, {
            cors: { origin: '*' },
        });

        // Use Authentication Middleware
        this.setupAuthentication();
        this.initializeEvents();
    }

    private setupAuthentication() {
        this.io.use((socket, next) => {
            // Retrieve token sent by HTML client
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error("Connection refused: Token missing"));
            }

            try {
                // JWT Verification
                const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: number, email: string };
                
                // Inject info into socket (Requirement)
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
                        include: { cards: { include: { card: true } } } 
                    });

                    // Verification: Deck must exist, belong to user, and have 10 cards
                    if (!deck || deck.userId !== socket.data.userId || deck.cards.length !== 10) {
                        socket.emit('error', "Invalid deck (must be 10 cards)");
                        return; // Fix TS7030
                    }

                    const room: GameRoom = {
                        id: `room_${socket.id}`,
                        players: [{
                            id: socket.data.userId,
                            name: socket.data.email,
                            socketId: socket.id,
                            deck: deck.cards.map(c => ({ ...c.card, hp: c.card.hp })), // Clone card with HP
                            hand: [],
                            activeCard: null,
                            score: 0
                        }],
                        turnIndex: 0
                    };

                    this.rooms.set(room.id, room);
                    socket.join(room.id);
                    this.io.emit('roomsListUpdated', Array.from(this.rooms.values()));
                } catch (error) {
                    socket.emit('error', "Server error");
                }
            });

            // --- EVENT: joinRoom ---
            socket.on('joinRoom', async ({ roomId, deckId }) => {
                try {
                    const room = this.rooms.get(roomId);
                    if (!room || room.players.length >= 2) {
                        socket.emit('error', "Room full or not found");
                        return; 
                    }

                    const deck = await prisma.deck.findUnique({ 
                        where: { id: deckId }, 
                        include: { cards: { include: { card: true } } } 
                    });

                    if (!deck || deck.userId !== socket.data.userId || deck.cards.length !== 10) {
                        socket.emit('error', "Invalid deck");
                        return; 
                    }

                    room.players.push({
                        id: socket.data.userId,
                        name: socket.data.email,
                        socketId: socket.id,
                        deck: deck.cards.map(c => ({ ...c.card, hp: c.card.hp })),
                        hand: [],
                        activeCard: null,
                        score: 0
                    });

                    socket.join(roomId);
                    // Start game automatically when 2 players are present
                    this.io.to(roomId).emit('gameStarted', { roomId });
                    this.broadcastGameState(room);
                } catch (error) {
                    socket.emit('error', "Join error");
                }
            });

            // --- EVENT: drawCards ---
            socket.on('drawCards', ({ roomId }) => {
                const room = this.rooms.get(roomId);
                if (!this.checkTurn(socket, room)) return;

                const player = room!.players[room!.turnIndex];
                // Draw up to 5 cards maximum
                while (player.hand.length < 5 && player.deck.length > 0) {
                    player.hand.push(player.deck.shift());
                }
                this.broadcastGameState(room!);
            });

            // --- EVENT: playCard ---
            socket.on('playCard', ({ roomId, cardIndex }) => {
                const room = this.rooms.get(roomId);
                if (!this.checkTurn(socket, room)) return;

                const player = room!.players[room!.turnIndex];
                // Only 1 active card allowed on field
                if (player.activeCard || !player.hand[cardIndex]) {
                    socket.emit('error', "Move illegal (Active card already present or invalid index)");
                    return;
                }

                player.activeCard = player.hand.splice(cardIndex, 1)[0];
                this.broadcastGameState(room!);
            });

            // --- EVENT: attack ---
            socket.on('attack', ({ roomId }) => {
                const room = this.rooms.get(roomId);
                if (!this.checkTurn(socket, room)) return;

                const attacker = room!.players[room!.turnIndex];
                const defender = room!.players[room!.turnIndex === 0 ? 1 : 0];

                if (!attacker.activeCard || !defender.activeCard) {
                    socket.emit('error', "Active cards missing for attack");
                    return;
                }

                // Damage Calculation (Basic logic, apply type weaknesses here if needed)
                defender.activeCard.hp -= attacker.activeCard.attack;
                
                // Score increases if opponent card is KO (HP <= 0)
                if (defender.activeCard.hp <= 0) {
                    attacker.score += 1;
                    defender.activeCard = null;
                }

                // Victory detection (first to 3 points)
                if (attacker.score >= 3) {
                    this.io.to(roomId).emit('gameEnded', { winner: attacker.name });
                    this.rooms.delete(roomId);
                } else {
                    room!.turnIndex = room!.turnIndex === 0 ? 1 : 0; 
                    this.broadcastGameState(room!);
                }
            });

            socket.on('disconnect', () => {
                console.log("Client disconnected");
            });
        });
    }

    // Helper to validate if it's the player's turn
    private checkTurn(socket: Socket, room?: GameRoom): boolean {
        if (!room || room.players[room.turnIndex].socketId !== socket.id) {
            socket.emit('error', "It is not your turn");
            return false;
        }
        return true;
    }

    // Broadcast game state with security constraints (Hidden opponent info)
    private broadcastGameState(room: GameRoom) {
        room.players.forEach(player => {
            const opponent = room.players.find(p => p.socketId !== player.socketId);
            // Opponent's hand is never exposed (Security Requirement)
            this.io.to(player.socketId).emit('gameStateUpdated', {
                me: { hand: player.hand, activeCard: player.activeCard, score: player.score },
                opponent: { handCount: opponent?.hand.length, activeCard: opponent?.activeCard, score: opponent?.score },
                currentPlayerSocketId: room.players[room.turnIndex].socketId
            });
        });
    }
}