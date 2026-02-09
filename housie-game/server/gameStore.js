const { Server } = require("socket.io");

const rooms = {}; // roomId -> { players: [], gameState: {}, numbers: [], interval: null }

// Helper to generate unique ID with prefix
const generateRoomId = (prefix = '') => {
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `${prefix}${randomPart}`;
};

// Helper to generate random ticket
const generateTicket = () => {
    // 3 rows, 9 cols. 5 numbers per row.
    // Modified constraints for 1-35 range:
    // Col 0: 1-4, Col 1: 5-8, ... Col 8: 33-35

    const ticket = Array(3).fill(null).map(() => Array(9).fill(null));
    const usedNumbers = new Set();
    const colRanges = [
        { start: 1, end: 4 },
        { start: 5, end: 8 },
        { start: 9, end: 12 },
        { start: 13, end: 16 },
        { start: 17, end: 20 },
        { start: 21, end: 24 },
        { start: 25, end: 28 },
        { start: 29, end: 32 },
        { start: 33, end: 35 }
    ];

    // Simple generation implementation
    // For each row, pick 5 distinct columns.
    // For each picked cell, generate valid number for that column.

    for (let r = 0; r < 3; r++) {
        const cols = [];
        while (cols.length < 5) {
            const c = Math.floor(Math.random() * 9);
            if (!cols.includes(c)) cols.push(c);
        }
        cols.sort((a, b) => a - b);

        for (let c of cols) {
            const { start, end } = colRanges[c];

            let num;
            // Generate unique num
            let attempts = 0;
            do {
                num = Math.floor(Math.random() * (end - start + 1)) + start;
                attempts++;
            } while (usedNumbers.has(num) && attempts < 100);

            if (attempts < 100) {
                ticket[r][c] = num;
                usedNumbers.add(num);
            } else {
                // Fallback (try to find any unused in range)
                for (let n = start; n <= end; n++) {
                    if (!usedNumbers.has(n)) {
                        ticket[r][c] = n;
                        usedNumbers.add(n);
                        break;
                    }
                }
            }
        }
    }
    return ticket;
};

const createRoom = (hostId, config = {}) => {
    // Determine Prefix
    const entryFee = config.entryFee || 0;
    const prefix = entryFee > 0 ? 'C-' : 'F-';
    const roomId = generateRoomId(prefix);

    // Enforce 1v1 for Paid Games (Stake System)
    const isPaid = entryFee > 0;

    rooms[roomId] = {
        roomId, // Consistent naming (was 'id' in old, 'roomId' in new. usage in index.js expects return of roomId string)
        hostId,
        players: [],
        currentNumber: null,
        numbers: [],
        status: 'WAITING',
        mode: isPaid ? '2-PLAYER' : 'CLASSIC', // Ensure mode is set for validateClaim
        winners: [],
        config: {
            ...config,
            entryFee,
            requiredPlayers: isPaid ? 2 : (config.requiredPlayers || 2)
        }
    };
    return roomId; // Return the ID string
};

const joinRoom = (roomId, playerId, playerName, dbId = null) => {
    const room = rooms[roomId];
    if (!room) return { error: "Room not found" };
    if (room.status !== 'WAITING') return { error: "Game already started" };
    if (room.players.length >= room.config.requiredPlayers) return { error: "Room full" };

    if (dbId && room.players.some(p => p.dbId === dbId)) {
        return { error: "You are already in this room!" };
    }

    const ticket = generateTicket();
    const player = { id: playerId, dbId: dbId, name: playerName, ticket, struckNumbers: [] };
    room.players.push(player);

    // Auto-start check
    if (room.players.length === room.config.requiredPlayers) {
        startGame(roomId);
    }

    return { player, state: getRoomState(room) };
};

const startGame = (roomId) => {
    const room = rooms[roomId];
    if (!room) return;
    room.status = 'PLAYING';
    // Interval logic handled in index.js for now, or could be here if we pass IO.
};

const generateNextNumber = (room) => {
    let num;
    const allGenerated = new Set(room.numbers);
    // Safety check specific to game end conditions could be here
    if (room.numbers.length >= 35) return null;

    do {
        // Random 1-35
        num = Math.floor(Math.random() * 35) + 1;
    } while (allGenerated.has(num));

    room.numbers.push(num);
    room.currentNumber = num;
    return { number: num, history: room.numbers };
};

const markNumber = (roomId, playerId, number) => {
    const room = rooms[roomId];
    if (!room) return { error: "Room not found" };

    // Validate number
    if (number !== room.currentNumber) {
        return { error: "Can only mark the most recent number!" };
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) return { error: "Player not found" };

    // Check if number is on ticket
    // Flatten ticket 2D array to check existence
    const flatTicket = player.ticket.flat().filter(n => n !== null);
    if (!flatTicket.includes(number)) {
        return { error: "Number not on your ticket!" };
    }

    if (!player.struckNumbers.includes(number)) {
        player.struckNumbers.push(number);
    }
    return { success: true };
};

// Check if ticket is fully struck (Full House / Housie)
const checkFullHouse = (player) => {
    const flatTicket = player.ticket.flat().filter(n => n !== null);
    return flatTicket.every(n => player.struckNumbers.includes(n));
};

const validateClaim = (roomId, playerId, claimType) => {
    const room = rooms[roomId];
    if (!room) return { success: false };

    const player = room.players.find(p => p.id === playerId);
    if (!player) return { success: false };

    // Check if already won (optional, maybe allow multiple wins if different categories?)
    // Requirement implies 1st, 2nd, 3rd places are unique players generally.
    if (room.winners.some(w => w.id === playerId)) {
        return { success: false, error: "Already claimed a win" };
    }

    if (claimType === 'HOUSIE') {
        if (checkFullHouse(player)) {
            // Valid Win
            const place = room.winners.length + 1;
            const winnerData = { id: playerId, dbId: player.dbId, name: player.name, place };
            room.winners.push(winnerData);

            let broadcastData = { winner: winnerData, message: `${player.name} won ${place}${getOrdinal(place)} Place!` };
            let gameEnded = false;

            if (room.mode === '2-PLAYER') {
                gameEnded = true;
                room.status = 'ENDED';
            } else {
                // For non-2-player (e.g. Free/Classic), let's end after 1st Full House for now to show modal, 
                // or check config. 
                // If it's just a free room, usually we might want to continue, but for this specific user request "victory modal not appearing", 
                // implies they expect it to appear.
                // Let's set gameEnded = true for the first full house in CLASSIC too for now, unless we have specific rules.
                gameEnded = true;
                room.status = 'ENDED';
            }

            return { success: true, broadcastData, gameEnded, winners: room.winners };
        }
    }
    return { success: false };
};

const getOrdinal = (n) => {
    return ["st", "nd", "rd"][((n + 90) % 100 - 10) % 10 - 1] || "th";
}

const getRoomState = (room) => ({
    roomId: room.roomId,
    mode: room.mode,
    players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        // We might want to show opponent progress (e.g. struck count), but not ticket
        struckCount: p.struckNumbers.length
    })),
    status: room.status,
    currentNumber: room.currentNumber,
    lastNumbers: room.numbers.slice(-5),
    winners: room.winners
});

// We need a way to emit events from here or move the Interval to index.js
// Let's change strategy: index.js controls the Interval.
// We just expose `generateNumber(roomId)`

module.exports = {
    createRoom,
    joinRoom,
    getRoomState,
    startGame,
    resetGame: (roomId) => {
        const room = rooms[roomId];
        if (!room) return null;

        // Reset state
        room.status = 'PLAYING'; // Auto-start for rematch
        room.numbers = [];
        room.currentNumber = null;
        room.winners = [];

        // Reset players (new tickets)
        room.players.forEach(p => {
            p.ticket = generateTicket();
            p.struckNumbers = [];
        });

        return getRoomState(room);
    },
    generateNumber: (roomId) => {
        const room = rooms[roomId];
        if (!room) return null;
        return generateNextNumber(room);
    },
    getRoom: (id) => rooms[id], // For internal use
    markNumber,
    validateClaim
};
