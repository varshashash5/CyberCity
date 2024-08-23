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
let currentTurn = 'Defender';
let defenderReady = false;
let hackerReady = false;
let startMessageSent = false;
let turnCounter = 0;
let roundCounter = 1;
let gameOver = false;
let gameStarted = false;

let gameState = {
    defender: null,
    hacker: null,
    locationStatus: {}
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
        if (gameOver) {
            emitGameMessage(side, 'The game has ended.');
            return false;
        }
        if (side !== currentTurn) {
            emitGameMessage(side, 'Not your turn.');
            return false;
        }
        return true;
    }

    function checkReady(socket) {
        if (!defenderReady || !hackerReady) {
            socket.emit(`${socket.side.toLowerCase()}_game_message`, 'Both players must be ready to start the game.');
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

    function applyActionResult(side, result) {
        const lowerSide = side.toLowerCase();
        const { action, location, compromise, shield, message } = result;

        emitGameMessage(side, message || `${action} applied to ${location}.`);

        if (side === 'Defender') {
            if (action === 'Firewall') {
                emitGameMessage(side, `Damage from future attacks on ${location} will be reduced.`);
            } else if (action === 'Virus Protection') {
                emitGameMessage(side, `${location} is now shielded.`);
            } else if (action === 'Intrusion Detection') {
                emitGameMessage(side, `${location} has been revived.`);
            } else if (action === 'User Training') {
                emitGameMessage(side, `Damage on ${location} has been reduced.`);
            }
        } else if (side === 'Hacker') {
            emitGameMessage(side, `${action} caused a compromise of ${compromise}%.`);
        }

        emitGameMessage(side, 'Turn ended.');
    }


    function handleTurnCompletion() {
        turnCounter++;

        if (turnCounter % 2 === 0) {
            roundCounter++;
            if (roundCounter > 10) {
                gameOver = true;
                io.emit('game_message', 'Game over after 10 rounds.');
                io.emit('game_over', 'The game has ended.');
                return;
            }
        }

        if (roundCounter <= 10) {
            if (roundCounter === 1 || roundCounter === 10) {
                currentTurn = roundCounter === 1 ? 'Defender' : 'Hacker';
            } else {
                currentTurn = currentTurn === 'Defender' ? 'Hacker' : 'Defender';
            }

            emitGameMessage(currentTurn, `Your turn.`);
            io.emit('turn', currentTurn);
            io.emit('round_update', roundCounter); // Add this line to emit the round number
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
            socket.emit(`${side.toLowerCase()}_game_message`, 'Reconnected as ' + side);
            if (ackCallback) ackCallback(`Reconnected as ${side}`);
            console.log(`${side} reconnected`);

            if (otherState && !otherState.disconnected) {
                emitGameMessage(otherSide, `${side} has reconnected`);
            }

            if (gameStarted) {
                socket.emit('hide_ready_buttons');
                socket.emit('round_update', roundCounter);
                socket.emit('turn', currentTurn);
                socket.emit('player_turn_status', {
                    isYourTurn: side === currentTurn
                });
            }
        } else {
            gameState[side.toLowerCase()] = { socket: socket, disconnected: false };
            socket.emit(`${side.toLowerCase()}_game_message`, 'Logged in as ' + side);
            if (ackCallback) ackCallback(`Logged in as ${side}`);

            if (otherState) {
                emitGameMessage(otherSide, `${side} logged in`);
                socket.emit(`${side.toLowerCase()}_game_message`, `${otherSide} is already logged in`);
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
                emitGameMessage(currentSide, 'Disconnected');

                if (gameState[otherSide.toLowerCase()] && !gameState[otherSide.toLowerCase()].disconnected) {
                    emitGameMessage(otherSide, `${currentSide} has disconnected`);
                }
            }
        }
    });


    socket.on('ready_up', ({ side }) => {
        if (gameOver) {
            emitGameMessage(side, 'The game has ended.');
            return;
        }

        if (side === 'Defender') {
            defenderReady = true;
            emitGameMessage('defender', 'Defender has confirmed they are ready to start.');
        } else if (side === 'Hacker') {
            hackerReady = true;
            emitGameMessage('hacker', 'Hacker has confirmed they are ready to start.');
        }

        if (defenderReady && hackerReady && !startMessageSent) {
            // Emit the start game message to each player once
            emitGameMessage('defender', 'Both players are ready. The game begins now!');
            emitGameMessage('hacker', 'Both players are ready. The game begins now!');
            emitGameMessage('defender', 'You get the first two turns, please proceed.');
            emitGameMessage('hacker', 'Defender gets the first two turns. I will let you know when it is your turn.');

            startMessageSent = true; // Ensure the message is only sent once
            gameStarted = true;

            // Hide the ready-up buttons
            io.emit('hide_ready_buttons');

            // Handle game start logic
            io.emit('start_game', { round: roundCounter, turn: currentTurn }); // Include round number here
            io.emit('turn', currentTurn); // Send the current turn
        } else if (!defenderReady || !hackerReady) {
            // Notify sides of their readiness status
            const waitingMessage = side === 'Defender'
                ? 'Defender has confirmed they are ready to start, they are waiting on you to click ready up.'
                : 'Hacker has confirmed they are ready to start, they are waiting on you to click ready up.';
            emitGameMessage(side === 'Defender' ? 'hacker' : 'defender', waitingMessage);
        }
    });


    socket.on('location', ({ side, location }) => {
        if (!checkReady(socket)) return;
        if (!checkTurn(side, socket)) return;

        selectedLocation = location;
        console.log(`Location selected: ${location} by ${side}`);
        if (!selectedAction) {
            socket.emit(`${side.toLowerCase()}_game_message`, `What action would you like to apply to ${location}?`);
        } else {
            checkAndEmitTurnCompletion(side);
        }
    });

    socket.on('action', ({ side, action }) => {
        if (!checkReady(socket)) return;
        if (!checkTurn(side, socket)) return;

        selectedAction = action;
        console.log(`Action selected: ${action} by ${side}`);
        if (!selectedLocation) {
            socket.emit(`${side.toLowerCase()}_game_message`, `What location would you like to apply ${action} to?`);
        } else {
            checkAndEmitTurnCompletion(side);
        }
    });

    socket.on('confirm_action', ({ side }) => {
        if (!checkReady(socket)) return;
        if (!checkTurn(side, socket)) return;

        if (selectedLocation && selectedAction) {
            const actionDetails = {
                side,
                action: selectedAction,
                location: selectedLocation
            };

            axios.post('http://127.0.0.1:4000/process_action', actionDetails)
                .then(response => {
                    const result = response.data;
                    applyActionResult(side, result);
                    handleTurnCompletion();

                    selectedAction = null;
                    selectedLocation = null;
                })
                .catch(error => {
                    console.error('Error processing action:', error.message);
                    socket.emit(`${side.toLowerCase()}_game_message`, 'Error processing your action. Please try again.');
                });
        }
    });
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
