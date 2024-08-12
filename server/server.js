const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const axios = require('axios');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(path.join(__dirname, '../clients')));

let selectedAction = null;
let selectedLocation = null;
let currentTurn = 'Defender'; // Start with Defender's turn
let defenderReady = false;
let hackerReady = false;
let defenderInitialTurns = 2;

// State to keep track of which sides have logged in
let gameState = {
    defender: null,
    hacker: null
};

// Flag to track if the start game message has been sent
let startMessageSent = false;

// Location health state
let locationHealth = {
    'Business': 100,
    'Hospital': 120,
    'Fire/Police': 110,
    'Industrial': 130,
    'University': 90,
    'Housing': 100,
    'Fort Sam': 150,
    'Traffic Lights': 80
};

io.on('connection', (socket) => {
    function emitGameMessage(side, message) {
        const lowerSide = side.toLowerCase();
        if (gameState[lowerSide] && !gameState[lowerSide].disconnected) {
            gameState[lowerSide].socket.emit(`${lowerSide}_game_message`, message);
            console.log(`Sent to ${side}: ${message}`);
        }
    }

    function checkTurn(side, socket) {
        if (side !== currentTurn) {
            let message = 'Please wait, it is not your turn.';
            emitGameMessage(side, message);
            console.log(`Sent to ${side}: ${message}`);
            return false;
        }
        return true;
    }

    function checkReady(socket) {
        if (!defenderReady || !hackerReady) {
            let message = 'Both sides must ready up before the game can start.';
            socket.emit(`${socket.side.toLowerCase()}_game_message`, message);
            console.log(`Sent to ${socket.side}: ${message}`);
            return false;
        }
        return true;
    }

    function checkAndEmitTurnCompletion(side) {
        if (selectedAction && selectedLocation) {
            let confirmMessage = `Are you sure you would like to apply ${selectedAction} to ${selectedLocation}? If yes, click `;
            confirmMessage += side === 'Defender' ? 'Defend.' : 'Hack.';
            emitGameMessage(side, confirmMessage);
        }
    }

    socket.on('login', (side, ackCallback) => {
        console.log(`${side} logged in`);
        socket.side = side;

        let otherSide = side === 'Defender' ? 'Hacker' : 'Defender';
        let currentState = gameState[side.toLowerCase()];
        let otherState = gameState[otherSide.toLowerCase()];

        if (currentState && currentState.disconnected) {
            currentState.socket = socket;
            currentState.disconnected = false;
            socket.emit(`${side.toLowerCase()}_game_message`, 'You have reconnected as ' + side);
            if (ackCallback) {
                ackCallback(`You have reconnected as ${side}`);
            }
            console.log(`${side} has reconnected`);

            if (otherState && !otherState.disconnected) {
                emitGameMessage(otherSide, `${side} has reconnected`);
            }
        } else {
            gameState[side.toLowerCase()] = { socket: socket, disconnected: false };
            socket.emit(`${side.toLowerCase()}_game_message`, 'You have logged in as ' + side);
            if (ackCallback) {
                ackCallback(`You have logged in as ${side}`);
            }

            if (otherState) {
                emitGameMessage(otherSide, `${side} has logged in`);
                socket.emit(`${side.toLowerCase()}_game_message`, `${otherSide} was already logged in`);
            }
        }
    });

    socket.on('disconnect', () => {
        if (socket.side) {
            let currentSide = socket.side;
            let otherSide = currentSide === 'Defender' ? 'Hacker' : 'Defender';
            let currentState = gameState[currentSide.toLowerCase()];

            if (currentState) {
                currentState.disconnected = true;
                emitGameMessage(currentSide, 'You have disconnected');

                if (gameState[otherSide.toLowerCase()] && !gameState[otherSide.toLowerCase()].disconnected) {
                    emitGameMessage(otherSide, `${currentSide} has disconnected`);
                }
            }
        }
    });

    socket.on('ready_up', ({ side }) => {
        if (side === 'Defender') {
            defenderReady = true;
            emitGameMessage('defender', 'Defender has confirmed they are ready to start');
        } else if (side === 'Hacker') {
            hackerReady = true;
            emitGameMessage('hacker', 'Hacker has confirmed they are ready to start');
        }

        // Ensure that the start game message is only sent once
        if (defenderReady && hackerReady && !startMessageSent) {
            emitGameMessage('defender', 'Both players are ready. The game begins now!');
            emitGameMessage('hacker', 'Both players are ready. The game begins now!');
            emitGameMessage('defender', 'You get the first two turns. I will let you know when your turns are over.');
            emitGameMessage('hacker', 'Defender gets the first two turns. I will let you know when it is your turn.');
            startMessageSent = true;

            io.emit('hide_ready_buttons');
            io.emit('start_game', currentTurn);
        } else if (!defenderReady || !hackerReady) {
            const waitingMessage = side === 'Defender'
                ? 'Defender has confirmed they are ready to start, they are waiting on you to click ready up'
                : 'Hacker has confirmed they are ready to start, they are waiting on you to click ready up';
            emitGameMessage(side === 'Defender' ? 'hacker' : 'defender', waitingMessage);
        }
    });

    socket.on('start_game', () => {
        if (defenderReady && hackerReady && startMessageSent) {
            emitGameMessage('defender', 'You get the first two turns. I will let you know when your turns are over.');
            emitGameMessage('hacker', 'Defender gets the first two turns. I will let you know when it is your turn.');
            io.emit('turn', currentTurn);
        }
    });

    socket.on('location', ({ side, location }) => {
        if (!checkReady(socket)) return;

        if (!checkTurn(side, socket)) return;

        selectedLocation = location;
        console.log(`Selected location: ${location} by ${side}`);
        if (!selectedAction) {
            socket.emit(`${side.toLowerCase()}_game_message`, `What action would you like to apply to ${location}?`);
        } else {
            checkAndEmitTurnCompletion(side);
        }
    });

    socket.on('actions', ({ side, action }) => {
        if (!checkReady(socket)) return;

        if (!checkTurn(side, socket)) return;

        selectedAction = action;
        console.log(`Selected action: ${action} by ${side}`);
        if (!selectedLocation) {
            socket.emit(`${side.toLowerCase()}_game_message`, `What location would you like to apply ${action} to?`);
        } else {
            checkAndEmitTurnCompletion(side);
        }
    });

    socket.on('confirm_action', async (data) => {
        console.log('Data received from client:', data);

        // Check if data is correctly received
        if (!data || !data.side || !data.action || !data.location) {
            console.error('Received incomplete data:', data);
            socket.emit('error_message', 'Incomplete data received. Please try again.');
            return;
        }

        try {
            // Send a POST request to the Flask server with the action data
            const response = await axios.post('http://127.0.0.1:4000/process_action', {
                side: data.side,
                action: data.action,
                location: data.location
            });


            // Process the response from the Python server
            const modifiedData = response.data;

            console.log('Data received from Python server:', modifiedData);

            // Emit the modified data back to the client whose turn it was
            emitGameMessage(data.side, `Received from Python: ${modifiedData.action} was applied to ${modifiedData.location} by ${modifiedData.side}`);

        } catch (error) {
            console.error('Error communicating with the Python server:', error.message);
            socket.emit('error_message', 'Failed to process action. Please try again.');
        }
    });



});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
