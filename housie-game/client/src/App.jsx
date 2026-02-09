
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import socket from './services/socket';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import BuyCoins from './pages/BuyCoins';
import './App.css';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

// Main Game Component (Logic extracted from original App.js)
const GameContainer = () => {
  const { user } = useAuth(); // Needed for rejoin
  const [gameState, setGameState] = useState(null); // 'LOBBY', 'GAME'
  const [isConnected, setIsConnected] = useState(false);
  const [roomData, setRoomData] = useState(null);
  const [playerData, setPlayerData] = useState(null);

  useEffect(() => {
    // Rejoin Logic
    const attemptRejoin = () => {
      const activeRoomId = localStorage.getItem('housie_active_room');
      if (activeRoomId && user) {
        console.log("Attempting to rejoin room:", activeRoomId);
        socket.emit('rejoin_game_request', { roomId: activeRoomId, userId: user.id || user._id }, (response) => {
          if (response.success) {
            console.log("Rejoined successfully");
            setRoomData(response.state);
            setPlayerData(response.player);
            setGameState('GAME');
          } else {
            console.log("Rejoin failed:", response.error);
            localStorage.removeItem('housie_active_room');
          }
        });
      }
    };

    function onConnect() {
      setIsConnected(true);
      attemptRejoin();
    }
    function onDisconnect() { setIsConnected(false); }
    function onRoomUpdate(state) {
      setRoomData(state);
      if (state.status === 'ENDED') {
        localStorage.removeItem('housie_active_room');
      }
    }
    function onGameStart(data) {
      setRoomData(prev => prev ? { ...prev, status: data.status } : prev);
    }
    function onPlayerUpdate(player) { setPlayerData(player); }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room_update', onRoomUpdate);
    socket.on('game_start', onGameStart);
    socket.on('player_update', onPlayerUpdate);

    // Initial check (in case already connected before listener attached)
    if (socket.connected) {
      onConnect();
    } else {
      socket.connect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room_update', onRoomUpdate);
      socket.off('game_start', onGameStart);
      socket.off('player_update', onPlayerUpdate);
      socket.disconnect();
    };
  }, [user]); // Re-run if user loads

  const handleJoin = (data) => {
    setPlayerData(data.player);
    setRoomData(data.state);
    setGameState('GAME');
    localStorage.setItem('housie_active_room', data.state.roomId);
  };

  const handleLeaveGame = (shouldReload = false) => {
    localStorage.removeItem('housie_active_room');
    setGameState(null);
    setRoomData(null);
    setPlayerData(null);
    // Explicitly emit leave room if needed, but socket disconnection handles it mostly.
    // Ideally emit 'leave_room' to server to clean up immediately.
    if (roomData?.roomId) {
      // socket.emit('leave_room', { roomId: roomData.roomId }); // Optional: if we implement leave logic backend
    }
  };

  return (
    <div className="game-container">
      <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-lg">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-sm font-medium text-white/90">{isConnected ? 'Online' : 'Connecting...'}</span>
        </div>

        {!gameState && (
          <nav className="flex items-center gap-4">
            <Link to="/buy-coins" className="hidden md:flex items-center gap-2 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/50 rounded-full transition-all hover:scale-105 font-medium text-sm">
              <span>🪙</span>
              <span>Buy Coins</span>
            </Link>

            <Link to="/profile" className="group relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 p-0.5 shadow-lg group-hover:shadow-pink-500/50 transition-all duration-300">
                <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center text-white font-bold text-sm group-hover:bg-transparent transition-colors">
                  U
                </div>
              </div>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-white bg-black/80 px-2 py-1 rounded pointer-events-none whitespace-nowrap">
                Profile
              </div>
            </Link>
          </nav>
        )}
      </header>
      {!gameState && <Lobby onJoin={handleJoin} />}
      {gameState === 'GAME' && (
        <GameRoom
          room={roomData}
          player={playerData}
          setRoom={setRoomData}
          onLeave={handleLeaveGame}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-layout">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <GameContainer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/buy-coins"
              element={
                <ProtectedRoute>
                  <BuyCoins />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
