import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const Profile = () => {
    const { user, logout, refreshProfile } = useAuth();
    const [stats, setStats] = useState({ walletHistory: [], gameHistory: [] });
    const [activeTab, setActiveTab] = useState('WALLET'); // 'WALLET' or 'GAMES'
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const initProfile = async () => {
            try {
                // Refresh user details (coins etc)
                if (refreshProfile) await refreshProfile();

                // Fetch separated history
                const res = await api.get('/user/profile');
                setStats({
                    walletHistory: res.data.walletHistory || [],
                    gameHistory: res.data.gameHistory || []
                });
            } catch (err) {
                console.error("Failed to load profile data", err);
            } finally {
                setLoading(false);
            }
        };
        initProfile();
    }, []);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
    };

    if (loading) return (
        <div className="flex justify-center items-center h-screen bg-gray-900 text-white">
            <div className="animate-pulse text-xl font-semibold">Loading Profile...</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans p-6 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <Link to="/" className="text-gray-400 hover:text-white transition-colors">
                    <span className="text-2xl">‹</span> Back
                </Link>
                <div className="text-xl font-bold">Profile</div>
                <div className="w-8"></div>
            </div>

            {/* Profile Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 text-center backdrop-blur-sm relative">
                <button
                    onClick={logout}
                    className="absolute top-4 right-4 text-xs text-red-400 hover:text-red-300 border border-red-500/30 px-3 py-1 rounded-full transition-colors"
                >
                    Logout
                </button>
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 p-0.5 mx-auto mb-4 shadow-lg shadow-purple-500/20">
                    <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center text-3xl font-bold text-white">
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                </div>
                <h2 className="text-2xl font-bold mb-1">{user?.name}</h2>
                <div className="text-gray-400 text-sm mb-4">{user?.email}</div>

                <div className="inline-flex items-center gap-2 bg-yellow-500/20 text-yellow-500 px-4 py-2 rounded-full border border-yellow-500/30">
                    <span className="text-xl">🪙</span>
                    <span className="font-bold text-lg">{user?.coins}</span>
                    <button
                        onClick={() => navigate('/buy-coins')}
                        className="ml-2 w-6 h-6 flex items-center justify-center bg-yellow-500 text-black rounded-full text-xs hover:scale-110 transition-transform"
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                    <div className="text-2xl font-bold text-green-400">{user?.wins || 0}</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Wins</div>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                    <div className="text-2xl font-bold text-red-400">{user?.losses || 0}</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Losses</div>
                </div>
            </div>

            {/* History Tabs */}
            <div className="flex gap-4 border-b border-white/10 mb-6">
                <button
                    onClick={() => setActiveTab('WALLET')}
                    className={`pb-2 px-2 text-sm font-bold uppercase tracking-wide transition-colors ${activeTab === 'WALLET' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300'
                        }`}
                >
                    Wallet History
                </button>
                <button
                    onClick={() => setActiveTab('GAMES')}
                    className={`pb-2 px-2 text-sm font-bold uppercase tracking-wide transition-colors ${activeTab === 'GAMES' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300'
                        }`}
                >
                    Game History
                </button>
            </div>

            {/* Wallet History Table */}
            {activeTab === 'WALLET' && (
                <div className="space-y-4">
                    {stats.walletHistory.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                            <p>No purchase history found</p>
                            <button
                                onClick={() => navigate('/buy-coins')}
                                className="mt-2 text-blue-400 hover:text-blue-300 underline text-sm"
                            >
                                Buy Tokens
                            </button>
                        </div>
                    ) : (
                        stats.walletHistory.map((tx) => (
                            <div key={tx._id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center">
                                <div>
                                    <div className="text-sm font-medium text-white mb-1">
                                        Coins Purchased
                                    </div>
                                    <div className="text-xs text-gray-500">{formatDate(tx.createdAt)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-green-400 font-bold">+{tx.coins} 🪙</div>
                                    <div className="text-xs text-gray-500 uppercase">{tx.status}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Game History Table */}
            {activeTab === 'GAMES' && (
                <div className="space-y-4">
                    {stats.gameHistory.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">No games played yet</div>
                    ) : (
                        stats.gameHistory.map((game) => (
                            <div key={game._id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center">
                                <div>
                                    <div className="text-sm font-medium text-white mb-1 flex items-center gap-2">
                                        {game.gameMode === 'PAID' ? '💰 Paid Game' : '🎮 Free Game'}
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${game.result === 'WIN'
                                                ? 'bg-green-500/20 text-green-400 border-green-500/50'
                                                : 'bg-red-500/20 text-red-400 border-red-500/50'
                                            }`}>
                                            {game.result}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500">{formatDate(game.playedAt)}</div>
                                </div>
                                <div className="text-right">
                                    {game.gameMode === 'PAID' ? (
                                        <>
                                            <div className={game.result === 'WIN' ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                                                {game.result === 'WIN' ? `+${game.winnings}` : `-${game.entryFee}`} 🪙
                                            </div>
                                            <div className="text-xs text-gray-500">Fee: {game.entryFee}</div>
                                        </>
                                    ) : (
                                        <div className="text-gray-400 font-bold text-sm">Free Play</div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default Profile;
