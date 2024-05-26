// server.js
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const path = require('path'); // Import path module

// Serve static files from the 'clients' directory
app.use(express.static(path.join(__dirname, '../clients')));

let selectedAction = null;
let selectedLocation = null;

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });

    socket.on('login', (side) => {
        console.log(`${side} logged in`);
        if (side === 'Defender') {
            // socket.emit('budget', defenderBudget);
        } else if (side === 'Hacker') {
            // socket.emit('budget', attackerBudget);
        }
    });

    socket.on('hack', () => {
        // Implement attacker's turn logic
        // Deduct budget for hacking actions
        // Roll dice to determine success rate
        // Emit results to clients
        console.log("hacker sends hack")
    });

    socket.on('location', ({ side, location }) => {
        if (selectedAction) {
            console.log(`${side} has applied ${selectedAction} to ${location}`);
            // Reset selected action
            selectedAction = null;
        } else {
            console.log(`What action would you like to apply to ${location}?`);
            selectedLocation = location;
        }
    });

    socket.on('defenderAction', ({ side, action }) => {
        if (selectedLocation) {
            console.log(`${side} has applied ${action} to ${selectedLocation}`);
            // Reset selected location
            selectedLocation = null;
        } else {
            console.log(`What location would you like to apply ${action} to?`);
            selectedAction = action;
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
