import React, { useState } from 'react';
import socket from '../services/socket';
import { useAuth } from '../context/AuthContext';
// import './Lobby.css'; // Removed in favor of Tailwind

const Lobby = ({ onJoin }) => {
    const { user } = useAuth();
    const [roomId, setRoomId] = useState('');
    const [error, setError] = useState('');
    const [gameMode, setGameMode] = useState('FREE'); // 'FREE' or 'PAID'
    const [selectedCoin, setSelectedCoin] = useState(20); // Default coin amount

    const COIN_OPTIONS = [20, 50, 100];

    const handleCreate = () => {
        if (!user.name) return setError("User name not found");

        const fee = gameMode === 'PAID' ? selectedCoin : 0;

        // Optimistic check
        if (fee > 0 && (user.coins || 0) < fee) {
            return setError(`Insufficient Coins! You need ${fee} coins.`);
        }

        socket.emit('create_room', { userId: user.id || user._id, entryFee: fee }, (response) => {
            if (response.error) {
                setError(response.error);
            } else {
                // Success! Server already joined us to the room.
                onJoin(response);
            }
        });
    };

    const handleJoin = () => {
        if (!user.name) return setError("User name not found");
        if (!roomId) return setError("Please enter Room ID");

        // Validate Room ID Format
        const id = roomId.trim().toUpperCase();

        if (gameMode === 'FREE') {
            if (!id.startsWith('F-')) {
                return setError("Invalid Room! Switch to 'Pay with Coins' mode to join this room.");
            }
        } else { // PAID
            if (!id.startsWith('C-')) {
                return setError("Invalid Room! Switch to 'Play Free' mode to join this room.");
            }
        }

        joinRoom(id); // Fee check happens on server for join
    };

    const joinRoom = (id, fee = 0) => {
        setError('');

        // For Join, we don't know Fee until we hit server, 
        // unless we passed it from create (which we do for creator).
        // The server will validate balance.

        socket.emit('join_room', { roomId: id, playerName: user.name, userId: user.id || user._id }, (response) => {
            if (response.error) {
                setError(response.error);
            } else {
                onJoin(response);
            }
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden min-h-[500px]">

                {/* SIDEBAR */}
                <div className="w-full md:w-1/3 bg-black/40 border-r border-white/10 p-6 flex flex-col gap-4">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Game Mode</h3>

                    <button
                        onClick={() => setGameMode('FREE')}
                        className={`text-left px-4 py-4 rounded-xl transition-all flex items-center gap-3 border ${gameMode === 'FREE'
                            ? 'bg-gradient-to-r from-blue-600/20 to-blue-400/10 border-blue-500 shadow-lg shadow-blue-500/10'
                            : 'hover:bg-white/5 border-transparent text-gray-400'
                            }`}
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${gameMode === 'FREE' ? 'bg-blue-500 text-white' : 'bg-gray-700'}`}>
                            🎮
                        </div>
                        <div>
                            <div className={`font-bold ${gameMode === 'FREE' ? 'text-white' : 'text-gray-300'}`}>Play Free</div>
                            <div className="text-xs text-gray-500">Practice & Fun</div>
                        </div>
                    </button>

                    <button
                        onClick={() => setGameMode('PAID')}
                        className={`text-left px-4 py-4 rounded-xl transition-all flex items-center gap-3 border ${gameMode === 'PAID'
                            ? 'bg-gradient-to-r from-yellow-600/20 to-yellow-400/10 border-yellow-500 shadow-lg shadow-yellow-500/10'
                            : 'hover:bg-white/5 border-transparent text-gray-400'
                            }`}
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${gameMode === 'PAID' ? 'bg-yellow-500 text-black' : 'bg-gray-700'}`}>
                            🪙
                        </div>
                        <div>
                            <div className={`font-bold ${gameMode === 'PAID' ? 'text-white' : 'text-gray-300'}`}>Pay with Coins</div>
                            <div className="text-xs text-gray-500">Win & Earn</div>
                        </div>
                    </button>

                    <div className="mt-auto p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex justify-between items-end mb-2">
                            <div>
                                <div className="text-xs text-gray-400 mb-1">Your Wallet</div>
                                <div className="text-2xl font-bold text-white flex items-center gap-2">
                                    {user?.coins || 0} <span className="text-base text-yellow-500">🪙</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4 pt-2 border-t border-white/10">
                            <div>
                                <div className="text-xs text-gray-500">Wins</div>
                                <div className="text-lg font-bold text-green-400">{user?.wins || 0}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500">Losses</div>
                                <div className="text-lg font-bold text-red-400">{user?.losses || 0}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MAIN CONTENT */}
                <div className="flex-1 p-8 flex flex-col justify-center relative">
                    <h2 className="text-3xl font-bold text-center mb-2 text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                        {gameMode === 'FREE' ? 'Free Match' : 'Coin Match'}
                    </h2>

                    <div className="text-center mb-8">
                        <span className="text-xl text-gray-300">Hi, </span>
                        <span className="text-xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500">
                            {user?.name}
                        </span>
                    </div>

                    {error && <p className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded mb-4 text-sm text-center animate-pulse">{error}</p>}

                    {/* COIN SELECTION (Only Paid) */}
                    {gameMode === 'PAID' && (
                        <div className="mb-8">
                            <label className="text-gray-400 text-xs font-bold uppercase tracking-widest block text-center mb-4">Select Stake Amount</label>
                            <div className="flex justify-center gap-4">
                                {COIN_OPTIONS.map(amt => (
                                    <button
                                        key={amt}
                                        onClick={() => setSelectedCoin(amt)}
                                        className={`relative w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg border-2 transition-all transform hover:scale-110 ${selectedCoin === amt
                                            ? 'bg-yellow-500 text-black border-yellow-400 shadow-lg shadow-yellow-500/50 scale-110'
                                            : 'bg-transparent text-gray-400 border-gray-600 hover:border-yellow-500 hover:text-white'
                                            }`}
                                    >
                                        {amt}
                                        {selectedCoin === amt && <div className="absolute -bottom-6 text-xs text-yellow-400 whitespace-nowrap">Selected</div>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-6 max-w-sm mx-auto w-full">
                        {/* Create Room */}
                        <button
                            onClick={handleCreate}
                            className={`w-full font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-xl flex items-center justify-center gap-2
                                ${gameMode === 'FREE'
                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                                    : 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-black'
                                }
                            `}
                        >
                            {gameMode === 'FREE' ? 'Create Free Room' : `Create for ${selectedCoin} 🪙`}
                        </button>

                        <div className="flex items-center gap-4 opacity-50">
                            <div className="h-px bg-white flex-1"></div>
                            <span className="text-white text-xs uppercase">OR</span>
                            <div className="h-px bg-white flex-1"></div>
                        </div>

                        {/* Join Room */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={roomId}
                                onChange={e => setRoomId(e.target.value)}
                                placeholder="ENTER ROOM ID"
                                className="flex-1 bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors uppercase font-mono tracking-wider text-center"
                            />
                            <button
                                onClick={handleJoin}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold px-6 py-3 rounded-lg shadow-lg"
                            >
                                Join
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Lobby;
