require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const { createRoom, joinRoom, startGame, generateNumber, validateClaim } = require('./gameStore');

const app = express();
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.path}`);
    next();
});
app.use(cors());
app.use(express.json()); // Enable JSON body parsing

// Connect Database
connectDB();

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/user', require('./routes/userRoutes'));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for now, restrict in production if needed
        methods: ["GET", "POST"]
    }
});

const startGameLoop = (roomId) => {
    const room = require('./gameStore').getRoom(roomId);
    if (!room) return;

    // Start interval
    if (room.interval) clearInterval(room.interval);

    console.log(`Starting game loop for room ${roomId}`);
    const { generateNumber } = require('./gameStore');

    // Emit initial start if needed, though room_update handles status
    io.to(roomId).emit('game_start', { status: 'PLAYING' });

    room.interval = setInterval(() => {
        const numData = generateNumber(roomId);
        if (numData) {
            io.to(roomId).emit('new_number', numData); // { number: 42, history: [...] }
        } else {
            clearInterval(room.interval);
            // logic for end of numbers?
            // Maybe emit game_over if numbers run out?
        }
    }, 5000); // 5 seconds per number
};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Create Room
    socket.on('create_room', async ({ userId, entryFee }, callback) => {
        // Validate Entry Fee
        const fee = parseInt(entryFee) || 0;

        // If fee > 0, check and deduct balance
        if (fee > 0) {
            try {
                const User = require('./models/User');
                const Transaction = require('./models/Transaction');

                const user = await User.findById(userId);
                if (!user) return callback({ error: "User not found" });

                if (user.coins < fee) return callback({ error: "Insufficient Coins" });

                // Deduct Coins
                user.coins -= fee;
                await user.save();

                // Record Transaction
                await Transaction.create({
                    userId: user.id,
                    transactionId: `GAME-ENTRY-${Date.now()}`,
                    orderId: `GAME-ENTRY-${Date.now()}`,
                    amount: 0,
                    coins: -fee,
                    status: 'SUCCESS'
                });

                io.to(socket.id).emit('stats_update', { coins: user.coins, wins: user.wins, losses: user.losses });

            } catch (err) {
                console.error(err);
                return callback({ error: "Transaction Failed" });
            }
        }

        const roomId = createRoom(socket.id, { entryFee: fee });

        // Auto-join the creator to the room (without charging again)
        // We need player name. We found 'user' earlier, let's assume user.name exists.
        // Wait, 'user' variable scope is inside 'if (fee > 0)'.
        // We need to fetch user if fee is 0 OR hoist user fetch.

        let playerName = "Host"; // Fallback
        try {
            const User = require('./models/User');
            // Optimize: if we fetched user for fee, use it. If not, fetch now.
            // But 'user' is block scoped. Let's refactor to fetch user first if needed or use dbId.
            const user = await User.findById(userId);
            if (user) playerName = user.name;

            // If fee was 0, we didn't deduct.
            // If fee > 0, we already deducted.
        } catch (e) { console.error(e); }

        const result = joinRoom(roomId, socket.id, playerName, userId);

        if (result.error) {
            return callback({ error: result.error });
        }

        socket.join(roomId);
        callback({
            roomId,
            player: result.player,
            state: result.state,
            success: true
        });
        io.to(roomId).emit('room_update', result.state);
        console.log(`Room created: ${roomId} by ${socket.id} (Fee: ${fee})`);
    });

    // Join Room
    socket.on('join_room', async ({ roomId, playerName, userId }, callback) => {
        // Check Room Fee first
        const room = require('./gameStore').getRoom(roomId);
        if (!room) return callback({ error: "Room not found" });

        const fee = room.config.entryFee || 0;

        if (fee > 0) {
            try {
                const User = require('./models/User');
                const Transaction = require('./models/Transaction');

                const user = await User.findById(userId);
                if (!user) return callback({ error: "User not found" });

                if (user.coins < fee) return callback({ error: "Insufficient Coins" });

                // Deduct Coins
                user.coins -= fee;
                await user.save();

                // Record Transaction
                await Transaction.create({
                    userId: user.id,
                    transactionId: `GAME-JOIN-${Date.now()}`,
                    orderId: `GAME-JOIN-${Date.now()}`,
                    amount: 0,
                    coins: -fee,
                    status: 'SUCCESS'
                });

                io.to(socket.id).emit('stats_update', { coins: user.coins, wins: user.wins, losses: user.losses });

            } catch (err) {
                console.error(err);
                return callback({ error: "Payment Failed" });
            }
        }

        // Pass userId to joinRoom to store it
        const result = joinRoom(roomId, socket.id, playerName, userId); // Added userId
        if (result.error) {
            callback({ error: result.error });
        } else {
            socket.join(roomId);
            callback({ success: true, player: result.player, state: result.state });
            io.to(roomId).emit('room_update', result.state);
            console.log(`${playerName} joined ${roomId}`);

            // Check if game auto-started (status changed to PLAYING)
            if (result.state.status === 'PLAYING') {
                // Ensure the loop is running.
                startGameLoop(roomId);
            }
        }
    });

    // Start Game - Only Host should ideally, but for now allow any
    socket.on('start_game', ({ roomId }) => {
        // In real app, verify host.
        const room = require('./gameStore').getRoom(roomId);
        if (!room) return;

        console.log(`Starting game in room ${roomId} (manual start)`);
        const { startGame } = require('./gameStore');
        startGame(roomId); // sets status

        startGameLoop(roomId);
    });

    // Mark Number handling check
    socket.on('mark_number', ({ roomId, number, ticketId }, callback) => {
        const result = require('./gameStore').markNumber(roomId, socket.id, number);
        if (result.error) {
            callback({ error: result.error });
        } else {
            callback({ success: true });
        }
    });

    // Claim Win
    socket.on('claim_win', async ({ roomId, type }, callback) => {
        const result = validateClaim(roomId, socket.id, type);
        if (result.success) {
            io.to(roomId).emit('winner_announced', result.broadcastData); // "Player X won 1st place"

            // Update Winner and Loser Stats & Game History
            (async () => {
                try {
                    const User = require('./models/User');
                    const GameHistory = require('./models/GameHistory');
                    const room = require('./gameStore').getRoom(roomId);

                    if (!room) return;

                    const entryFee = room.config.entryFee || 0;
                    const pot = entryFee * room.players.length;
                    // Winner takes all logic for now. 
                    // If multiple winners (e.g. 5-player mode), pot might be split or different logic.
                    // For 2-player, pot = entryFee * 2. Winner gets pot.

                    const winnerPlayer = room.players.find(p => p.id === socket.id);

                    // Update Winner
                    if (winnerPlayer && winnerPlayer.dbId) {
                        // Winner gets the pot (which includes their own entry fee back + opponent's fee)
                        // Net profit = entryFee. 
                        // Update Balance
                        let updatedUser;
                        if (entryFee > 0) {
                            updatedUser = await User.findByIdAndUpdate(winnerPlayer.dbId, {
                                $inc: { wins: 1, coins: pot }
                            }, { new: true });
                        } else {
                            updatedUser = await User.findByIdAndUpdate(winnerPlayer.dbId, { $inc: { wins: 1 } }, { new: true });
                        }

                        // Notify new balance & stats
                        if (updatedUser) {
                            io.to(winnerPlayer.id).emit('stats_update', {
                                coins: updatedUser.coins,
                                wins: updatedUser.wins,
                                losses: updatedUser.losses
                            });
                        }

                        // Record History
                        await GameHistory.create({
                            userId: winnerPlayer.dbId,
                            roomId: roomId,
                            gameMode: entryFee > 0 ? 'PAID' : 'FREE',
                            entryFee: entryFee,
                            winnings: pot,
                            result: 'WIN'
                        });
                    }

                    if (result.gameEnded) {
                        const losers = room.players.filter(p => !room.winners.some(w => w.id === p.id));

                        console.log("Game Ended. Winners:", room.winners.map(w => w.id));
                        console.log("Identified Losers:", losers.map(l => l.id));

                        for (const loser of losers) {
                            if (loser.dbId) {
                                const updatedLoser = await User.findByIdAndUpdate(loser.dbId, { $inc: { losses: 1 } }, { new: true });

                                if (updatedLoser) {
                                    io.to(loser.id).emit('stats_update', {
                                        coins: updatedLoser.coins,
                                        wins: updatedLoser.wins,
                                        losses: updatedLoser.losses
                                    });
                                }

                                // Record History
                                await GameHistory.create({
                                    userId: loser.dbId,
                                    roomId: roomId,
                                    gameMode: entryFee > 0 ? 'PAID' : 'FREE',
                                    entryFee: entryFee,
                                    winnings: 0,
                                    result: 'LOSS'
                                });
                            }
                        }
                    }
                } catch (err) {
                    console.error("Error updating stats:", err);
                }
            })();

            if (result.gameEnded) {
                // ... handle game over stats ...
                io.to(roomId).emit('game_over', { winners: result.winners });
                const room = require('./gameStore').getRoom(roomId);
                if (room && room.interval) clearInterval(room.interval);
            }
        } else {
            callback({ error: "Invalid Claim" });
        }
    });

    // Rejoin Game
    socket.on('rejoin_game', async ({ userId }, callback) => {
        // We need to find if this user is in any active room.
        // Since we don't have a map of User -> Room, we might iterate or change structure.
        // But wait, the client usually knows the roomId from localStorage!
        // Let's ask client for roomId.
    });

    // Correct Rejoin Logic
    socket.on('rejoin_game_request', async ({ roomId, userId }, callback) => {
        const room = require('./gameStore').getRoom(roomId);
        if (!room) return callback({ error: "Room not found" });

        // Find player by userId (we need to store userId in player object!)
        const player = room.players.find(p => p.dbId === userId); // Assuming we add dbId

        if (!player) return callback({ error: "Player not in room" });

        // Update socket ID to new connection
        player.id = socket.id;
        socket.join(roomId);

        callback({
            success: true,
            state: require('./gameStore').getRoomState(room),
            player: player
        });

        console.log(`Player ${player.name} rejoined room ${roomId}`);
    });

    // Rematch Flow
    socket.on('request_rematch', ({ roomId, playerName }) => {
        // Notify all players in the room about the request
        socket.to(roomId).emit('rematch_requested', { by: playerName, byId: socket.id });
    });

    socket.on('respond_rematch', ({ roomId, accepted }) => {
        if (accepted) {
            // Reset Game
            const newState = require('./gameStore').resetGame(roomId);
            if (newState) {
                // Send new tickets to each player individually
                const room = require('./gameStore').getRoom(roomId);
                room.players.forEach(p => {
                    io.to(p.id).emit('player_update', p);
                });

                io.to(roomId).emit('room_update', newState);
                io.to(roomId).emit('game_start', { status: 'PLAYING' });
                // Restart Loop
                startGameLoop(roomId);
            }
        } else {
            // Notify rejection - to everyone or just requester? 
            // Better to everyone so UI clears.
            socket.to(roomId).emit('rematch_rejected', { byId: socket.id });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Implement leaveRoom logic if necessary
    });
});

// Since game loop (number generation) needs to run, we might need an interval per room.
// We'll handle that in gameStore.

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
