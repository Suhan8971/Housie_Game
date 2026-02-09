import React, { useEffect, useState } from 'react';
import Ticket from './Ticket';
import { useAuth } from '../context/AuthContext';
import socket from '../services/socket';
// import './GameRoom.css'; // Removed in favor of Tailwind

const GameRoom = ({ room, player, setRoom, onLeave }) => {
    // ... (rest of component state)

    // ... (rest of component logic)

    const handleLeave = () => {
        // Clear local storage and reset app state via parent
        if (onLeave) onLeave();
    };
    const [canClaimHousie, setCanClaimHousie] = useState(false);
    const { user } = useAuth();

    // const [stats, setStats] = useState({ wins: 0, losses: 0 }); // Removed for global stats
    const [showResultModal, setShowResultModal] = useState(false);
    const [rematchStatus, setRematchStatus] = useState('IDLE'); // IDLE, SENT, RECEIVED
    const [rematchInitiator, setRematchInitiator] = useState(null);
    const [showRejectionModal, setShowRejectionModal] = useState(false);

    const checkHousieEligibility = (markedList) => {
        const allTicketNums = player.ticket.flat().filter(n => n !== null);
        const allMarked = allTicketNums.every(n => markedList.includes(n));
        setCanClaimHousie(allMarked);
    };

    useEffect(() => {
        socket.on('new_number', (data) => {
            setRoom(prev => ({
                ...prev,
                currentNumber: data.number,
                lastNumbers: data.history.slice(-5)
            }));
        });

        socket.on('winner_announced', (data) => {
            setRoom(prev => ({
                ...prev,
                winners: [...(prev.winners || []), data.winner]
            }));

            // Update Stats - handled globally via AuthContext now
        });

        socket.on('game_over', (data) => {
            console.log("Game Over Event Received:", data);

            setRoom(prev => {
                const finalWinners = (data.winners && data.winners.length > 0) ? data.winners : prev.winners;
                console.log("Setting final winners:", finalWinners);
                return {
                    ...prev,
                    status: 'ENDED',
                    winners: finalWinners
                };
            });
            setShowResultModal(true);
        });

        socket.on('game_start', (data) => {
            // Reset UI for new game
            setRematchStatus('IDLE');
            setShowResultModal(false);
            setRematchInitiator(null);
            setShowRejectionModal(false);
            setCanClaimHousie(false); // Fix: Reset claim eligibility
        });

        socket.on('rematch_requested', (data) => {
            if (data.byId !== player.id) {
                setRematchStatus('RECEIVED');
                setRematchInitiator(data.by);
            }
        });

        socket.on('rematch_rejected', (data) => {
            if (data && data.byId !== player.id) {
                setShowRejectionModal(true);
            }
            setRematchStatus('IDLE');
        });

        return () => {
            socket.off('new_number');
            socket.off('winner_announced');
            socket.off('game_over');
            socket.off('game_start');
            socket.off('rematch_requested');
            socket.off('rematch_rejected');
        };
    }, [setRoom, player.name, player.id]);

    const handleRematchRequest = () => {
        socket.emit('request_rematch', { roomId: room.roomId, playerName: player.name });
        setRematchStatus('SENT');
        setShowResultModal(false); // Close result modal if open to show waiting status
    };

    const respondRematch = (accepted) => {
        socket.emit('respond_rematch', { roomId: room.roomId, accepted });
        if (!accepted) {
            setRematchStatus('IDLE');
            setRematchInitiator(null);
        }
    };

    const closeRejectionModal = () => {
        setShowRejectionModal(false);
    };

    const handleHousie = () => {
        socket.emit('claim_win', { roomId: room.roomId, type: 'HOUSIE' }, (response) => {
            if (response.error) {
                alert(response.error);
            }
        });
    };

    const handleBackdropClick = (e) => {
        if (e.target.id === 'game-over-overlay') {
            setShowResultModal(false);
        }
    };

    // Fix: useMemo to prevent recalculation issues and add logging
    const isWinner = React.useMemo(() => {
        if (!room.winners || room.winners.length === 0) {
            console.log("No winners in room state yet.");
            return false;
        }

        const winner = room.winners.find(w => {
            if (w.dbId && (user?.id || user?._id)) {
                return w.dbId === user.id || w.dbId === user._id;
            }
            return w.id === player.id;
        });

        if (winner) {
            console.log("I am a winner:", winner);
            return true;
        }

        console.log("I am NOT a winner. Winners:", room.winners, "My ID:", user?.id || player.id);
        return false;
    }, [room.winners, user, player.id]);



    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden relative">
            {/* Back Button Overlay */}
            <div className="absolute top-4 left-4 z-50">
                <button
                    onClick={handleLeave}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-full transition-all backdrop-blur-md"
                >
                    <span>←</span> Leave Match
                </button>
            </div>
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-4 pt-24 font-sans">
                <div className="max-w-6xl mx-auto">
                    {/* Room Info Header */}
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 mb-8 flex flex-col md:flex-row justify-between items-center gap-4 shadow-lg">
                        <div className="flex gap-6 text-sm md:text-base">
                            <span className="flex items-center gap-2">
                                <span className="text-gray-400">Room:</span>
                                <span className="font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30">{room.roomId}</span>
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="text-gray-400">Players:</span>
                                <span className="font-bold">{room.players.length}</span>
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="text-gray-400">Status:</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider
                                ${room.status === 'WAITING' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : ''}
                                ${room.status === 'PLAYING' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : ''}
                                ${room.status === 'ENDED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : ''}
                            `}>
                                    {room.status}
                                </span>
                            </span>
                        </div>
                        <div className="flex gap-4">
                            <div className="px-4 py-1 rounded-full bg-black/20 border border-white/10 text-sm">
                                <span className="text-gray-400 mr-2">Wins:</span>
                                <span className="text-green-400 font-bold">{user?.wins || 0}</span>
                            </div>
                            <div className="px-4 py-1 rounded-full bg-black/20 border border-white/10 text-sm">
                                <span className="text-gray-400 mr-2">Losses:</span>
                                <span className="text-red-400 font-bold">{user?.losses || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* WAITING SCREEN */}
                    {room.status === 'WAITING' && (
                        <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
                            <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-6"></div>
                            <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                                Waiting for players to join...
                            </h3>
                            <p className="text-gray-500 mt-2">Share the Room ID: <span className="text-white font-mono">{room.roomId}</span></p>
                        </div>
                    )}

                    {/* GAME AREA */}
                    {(room.status === 'PLAYING' || room.status === 'ENDED') && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                            {/* LEFT: Game Board & Numbers */}
                            <div className="lg:col-span-4 flex flex-col items-center gap-6">
                                {/* Current Number */}
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
                                    <div className="relative w-40 h-40 bg-gray-900 border-4 border-white/10 rounded-full flex items-center justify-center shadow-2xl">
                                        <span className="text-7xl font-black bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-400">
                                            {room.currentNumber || '?'}
                                        </span>
                                    </div>
                                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-center w-full">
                                        <span className="text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold">Current Ball</span>
                                    </div>
                                </div>

                                {/* History */}
                                <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mt-8">
                                    <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-3 text-center">Last 5 Numbers</h4>
                                    <div className="flex justify-center gap-3">
                                        {room.lastNumbers.map((n, i) => (
                                            <div key={i} className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-sm font-bold shadow-inner">
                                                {n}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* HOUSIE BUTTON */}
                                <button
                                    onClick={handleHousie}
                                    disabled={room.status === 'ENDED' || !canClaimHousie}
                                    className={`w-full py-4 rounded-full font-black text-xl tracking-widest shadow-xl transition-all transform hover:scale-105 active:scale-95
                                    ${room.status === 'ENDED' || !canClaimHousie
                                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                                            : 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white shadow-pink-500/30'
                                        }`}
                                >
                                    HOUSIE!
                                </button>
                            </div>

                            {/* CENTER/RIGHT: Ticket */}
                            <div className="lg:col-span-8">
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
                                    <Ticket
                                        key={player.ticket ? JSON.stringify(player.ticket) : 'ticket'}
                                        ticket={player.ticket}
                                        roomId={room.roomId}
                                        currentNumber={room.currentNumber}
                                        onMark={checkHousieEligibility}
                                    />
                                </div>

                                {/* Winners List */}
                                {room.winners && room.winners.length > 0 && (
                                    <div className="mt-6 bg-green-500/10 border border-green-500/20 rounded-xl p-6">
                                        <h3 className="text-green-400 font-bold text-lg mb-4 flex items-center gap-2">
                                            <span>🏆</span> Winners Circle
                                        </h3>
                                        <ul className="space-y-3">
                                            {room.winners.map((w, i) => (
                                                <li key={i} className="flex justify-between items-center bg-green-900/20 px-4 py-3 rounded-lg border border-green-500/10">
                                                    <span className="font-semibold text-white">{w.place} Place</span>
                                                    <span className="text-green-300 font-mono">{w.name}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Game Ended Controls (Inline) */}
                                {room.status === 'ENDED' && !showResultModal && (
                                    <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 text-center animate-fade-in">
                                        <h3 className="text-xl font-bold text-white mb-2">Game Over</h3>
                                        {rematchStatus === 'IDLE' && (
                                            <button
                                                onClick={handleRematchRequest}
                                                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold shadow-lg shadow-blue-500/30 transition-all hover:scale-105"
                                            >
                                                Request Rematch
                                            </button>
                                        )}
                                        {rematchStatus === 'SENT' && (
                                            <p className="text-yellow-400 animate-pulse">Waiting for opponent to accept rematch...</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* MODALS */}

                {/* Victory/Defeat Modal */}
                {room.status === 'ENDED' && showResultModal && (
                    <div id="game-over-overlay" onClick={handleBackdropClick} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                        <div onClick={(e) => e.stopPropagation()} className="bg-gray-900 border border-white/10 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-full h-2 ${isWinner ? 'bg-green-500' : 'bg-red-500'}`}></div>

                            <div className="mb-6 text-6xl">{isWinner ? '🏆' : '💔'}</div>

                            <h2 className={`text-3xl font-black mb-2 ${isWinner ? 'text-green-400' : 'text-red-500'}`}>
                                {isWinner ? 'VICTORY!' : 'DEFEAT'}
                            </h2>

                            <p className="text-gray-400 mb-8 text-lg">
                                {isWinner ? 'Congratulations, you won the house!' : 'Better luck next time!'}
                            </p>

                            <div className="space-y-3">
                                {rematchStatus === 'IDLE' && (
                                    <button
                                        onClick={handleRematchRequest}
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all"
                                    >
                                        {isWinner ? 'Play Again' : 'Try Again'}
                                    </button>
                                )}
                                {rematchStatus === 'SENT' && (
                                    <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-lg border border-yellow-500/20">
                                        Rematch Requested...
                                    </div>
                                )}
                                <button
                                    onClick={() => setShowResultModal(false)}
                                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Rematch Request Modal */}
                {rematchStatus === 'RECEIVED' && (
                    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
                        <div className="bg-gray-800 border border-yellow-500/50 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl shadow-yellow-500/10 animate-bounce-in">
                            <h3 className="text-2xl font-bold text-yellow-400 mb-4">⚔️ Rematch Challenge!</h3>
                            <p className="text-white mb-8"><span className="font-bold text-blue-400">{rematchInitiator}</span> wants to play again.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => respondRematch(true)}
                                    className="py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold"
                                >
                                    Accept
                                </button>
                                <button
                                    onClick={() => respondRematch(false)}
                                    className="py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold"
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Rejection Modal */}
                {showRejectionModal && (
                    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
                        <div className="bg-gray-800 border border-white/10 p-6 rounded-xl max-w-sm w-full text-center">
                            <h3 className="text-xl font-bold text-red-400 mb-2">Declined</h3>
                            <p className="text-gray-400 mb-6">Opponent rejected the rematch.</p>
                            <button
                                onClick={closeRejectionModal}
                                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                            >
                                Okay
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GameRoom;
