import { io } from "socket.io-client";

// Connect to backend (assuming localhost:3001)
const URL = "http://127.0.0.1:3001";
const socket = io(URL, {
    autoConnect: false
});

export default socket;
