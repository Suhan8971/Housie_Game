import React, { useState, useEffect } from 'react';
import socket from '../services/socket';
// import './Ticket.css'; // Removed for Tailwind

const Ticket = ({ ticket, roomId, currentNumber, onMark }) => {
    const [markedNumbers, setMarkedNumbers] = useState([]);

    // Reset marked numbers when ticket changes (new game)
    useEffect(() => {
        setMarkedNumbers([]);
    }, [ticket]);

    const handleCellClick = (number) => {
        if (number === null) return;
        if (markedNumbers.includes(number)) return; // Already marked

        // Validate click against current number
        if (number !== currentNumber) {
            alert("⚠️ You can only mark the current number!");
            return;
        }

        const newMarked = [...markedNumbers, number];
        setMarkedNumbers(newMarked);

        // Optimistically update parent
        if (onMark) onMark(newMarked);

        socket.emit('mark_number', { roomId, number }, (response) => {
            if (response && response.error) {
                alert(response.error);
                // Revert on error
                const reverted = markedNumbers.filter(n => n !== number);
                setMarkedNumbers(reverted);
                if (onMark) onMark(reverted);
            }
        });
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 backdrop-blur-md rounded-xl p-1 border border-white/20 shadow-2xl">
                {/* Header Decoration */}
                <div className="bg-black/30 text-center py-2 rounded-t-lg mb-1 border-b border-white/10">
                    <span className="text-xs font-bold tracking-[0.3em] text-yellow-400 uppercase">Housie Ticket</span>
                </div>

                <div className="grid grid-rows-3 gap-1 bg-black/40 p-2 rounded-lg">
                    {ticket.map((row, rIndex) => (
                        <div key={rIndex} className="grid grid-cols-9 gap-1 h-16 md:h-20">
                            {row.map((num, cIndex) => {
                                const isMarked = num !== null && markedNumbers.includes(num);
                                const isTarget = num === currentNumber;

                                return (
                                    <div
                                        key={cIndex}
                                        onClick={() => handleCellClick(num)}
                                        className={`
                                            relative flex items-center justify-center rounded-md text-lg md:text-2xl font-bold transition-all duration-200 select-none
                                            ${num === null
                                                ? 'bg-transparent' // Empty cell
                                                : isMarked
                                                    ? 'bg-green-500 text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] border border-green-400' // Marked
                                                    : 'bg-white/10 text-white hover:bg-white/20 cursor-pointer border border-white/10' // Active number
                                            }
                                            ${isTarget && !isMarked ? 'ring-2 ring-yellow-400 animate-pulse bg-yellow-500/20' : ''}
                                        `}
                                    >
                                        {num !== null && (
                                            <>
                                                {num}
                                                {isMarked && (
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                        <div className="w-full h-full bg-green-500/30 rounded-md animate-ping opacity-20"></div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                <div className="mt-2 text-center">
                    <p className="text-xs text-gray-400 flex justify-center items-center gap-2">
                        <span className="w-3 h-3 bg-white/10 border border-white/10 rounded-sm inline-block"></span> Unmarked
                        <span className="w-3 h-3 bg-green-500 rounded-sm inline-block shadow-sm"></span> Marked
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Ticket;
