import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
// import './BuyCoins.css'; // Removed for Tailwind

const PACKAGES = [
    { id: 1, amount: 10, coins: 100, label: 'Starter' },
    { id: 2, amount: 50, coins: 600, label: 'Popular' },
    { id: 3, amount: 100, coins: 1300, label: 'Best Value' }
];

const BuyCoins = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleBuy = async (pkg) => {
        setLoading(true);
        try {
            // 1. Create Order
            const orderRes = await api.post('/payment/create-order', {
                amount: pkg.amount,
                coins: pkg.coins
            });

            // 2. Simulate Payment Gateway Interaction
            const confirm = window.confirm(`Pay ₹${pkg.amount} for ${pkg.coins} Coins? (Mock Gateway)`);

            if (confirm) {
                // 3. Verify Payment
                await api.post('/payment/verify', {
                    orderId: orderRes.data.orderId,
                    amount: pkg.amount,
                    coins: pkg.coins,
                    status: 'SUCCESS'
                });
                alert('Payment Successful! Coins Added.');
                navigate('/profile');
            } else {
                alert('Payment Cancelled');
            }
        } catch (err) {
            console.error(err);
            alert('Transaction Failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-4 pt-24 font-sans flex flex-col items-center">

            <div className="w-full max-w-5xl flex justify-start mb-8">
                <button
                    onClick={() => navigate('/')}
                    className="group flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-full transition-all duration-300 border border-white/10 hover:border-yellow-500/50 shadow-lg hover:shadow-yellow-500/20 backdrop-blur-md"
                >
                    <span className="transform transition-transform duration-300 group-hover:-translate-x-1">←</span>
                    <span className="font-medium tracking-wide">Back to Home</span>
                </button>
            </div>

            <h2 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500">
                Coin Store
            </h2>
            <p className="text-gray-400 mb-12">Top up your wallet to play more matches!</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
                {PACKAGES.map(pkg => (
                    <div
                        key={pkg.id}
                        className={`relative bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-8 flex flex-col items-center text-center transition-all duration-300 hover:scale-105 hover:bg-white/10 hover:shadow-2xl hover:shadow-yellow-500/10
                            ${pkg.id === 2 ? 'ring-2 ring-yellow-500/50 transform scale-105 bg-white/10' : ''}
                        `}
                    >
                        {pkg.id === 2 && (
                            <div className="absolute -top-4 bg-yellow-500 text-black font-bold px-4 py-1 rounded-full text-sm shadow-lg">
                                MOST POPULAR
                            </div>
                        )}
                        {pkg.id === 3 && (
                            <div className="absolute -top-4 bg-purple-500 text-white font-bold px-4 py-1 rounded-full text-sm shadow-lg">
                                BEST VALUE
                            </div>
                        )}

                        <div className="text-6xl mb-4 animate-bounce-slow">
                            🪙
                        </div>

                        <div className="text-3xl font-bold text-white mb-2">
                            {pkg.coins} <span className="text-yellow-400 text-lg">Coins</span>
                        </div>

                        <div className="text-gray-400 mb-8 text-sm">
                            {pkg.label} Pack
                        </div>

                        <button
                            onClick={() => handleBuy(pkg)}
                            disabled={loading}
                            className="w-full mt-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Processing...' : `Buy for ₹${pkg.amount}`}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BuyCoins;
