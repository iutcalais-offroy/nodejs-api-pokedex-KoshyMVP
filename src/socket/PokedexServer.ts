import { Server as HTTPServer } from 'http';
import { Server} from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../env';

export class PokedexServer {
    private io: Server;

    constructor(httpServer: HTTPServer) {
        this.io = new Server(httpServer, {
            cors: { origin: '*' },
        });

        // Utilisation du Middleware d'authentification
        this.setupAuthentication();
        this.initializeEvents();
    }

    private setupAuthentication() {
        this.io.use((socket, next) => {
            // Récupération du token envoyé par le client HTML
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error("Connexion refusée : Token manquant"));
            }

            try {
                // Vérification du JWT
                const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: number, email: string };
                
                // Injection des infos dans le socket (Exigence du TP)
                socket.data.userId = decoded.userId;
                socket.data.email = decoded.email;
                
                next();
            } catch (err) {
                next(new Error("Connexion refusée : Token invalide"));
            }
        });
    }

    private initializeEvents() {
        this.io.on('connection', (socket) => {
            console.log(`✅ Joueur connecté : ${socket.data.email} (ID: ${socket.data.userId})`);

            // Ici tu géreras tes rooms et tes actions de jeu (piocher, attaquer...)
            socket.on('joinRoom', (roomId) => {
                socket.join(roomId);
                console.log(`User ${socket.data.userId} a rejoint la room ${roomId}`);
            });

            socket.on('disconnect', () => {
                console.log("Client déconnecté");
            });
        });
    }
}