const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
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

// State to keep track of the last message sent to each side
let lastMessageSent = {
    defender: '',
    hacker: ''
};

io.on('connection', (socket) => {
    // Function to emit a game message to a specific side
    function emitGameMessage(side, message) {
        if (gameState[side.toLowerCase()] && !gameState[side.toLowerCase()].disconnected) {
            if (lastMessageSent[side.toLowerCase()] !== message) {
                gameState[side.toLowerCase()].socket.emit(`${side.toLowerCase()}_game_message`, message);
                lastMessageSent[side.toLowerCase()] = message;
                console.log(`Sent to ${side}: ${message}`);
            } else {
                console.log(`Skipped duplicate message for ${side}: ${message}`);
            }
        }
    }

    socket.on('login', (side, ackCallback) => {
        console.log(`${side} logged in`);
        socket.side = side;

        let otherSide = side === 'Defender' ? 'Hacker' : 'Defender';
        let currentState = gameState[side.toLowerCase()];
        let otherState = gameState[otherSide.toLowerCase()];

        if (currentState && currentState.disconnected) {
            // Player is reconnecting
            currentState.socket = socket;
            currentState.disconnected = false;
            socket.emit(`${side.toLowerCase()}_game_message`, 'You have reconnected as ' + side);
            if (ackCallback) {
                ackCallback(`You have reconnected as ${side}`);
            }
            console.log(`${side} has reconnected`);

            if (otherState && !otherState.disconnected) {
                // Notify the other side that this side has reconnected
                emitGameMessage(otherSide, `${side} has reconnected`);
                console.log(`Sent to ${otherSide}: ${side} has reconnected`);
            }
        } else {
            // Player is logging in for the first time
            gameState[side.toLowerCase()] = { socket: socket, disconnected: false };
            socket.emit(`${side.toLowerCase()}_game_message`, 'You have logged in as ' + side);
            if (ackCallback) {
                ackCallback(`You have logged in as ${side}`);
            }
            console.log(`${side} has logged in`);

            if (otherState) {
                // Notify the other side that this side has logged in
                emitGameMessage(otherSide, `${side} has logged in`);
                socket.emit(`${side.toLowerCase()}_game_message`, `${otherSide} was already logged in`);
                console.log(`Sent to ${otherSide}: ${side} has logged in`);
                console.log(`Sent to ${side}: ${otherSide} was already logged in`);
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
                console.log(`${currentSide} has disconnected`);

                if (gameState[otherSide.toLowerCase()] && !gameState[otherSide.toLowerCase()].disconnected) {
                    // Notify the other side that this side has disconnected
                    emitGameMessage(otherSide, `${currentSide} has disconnected`);
                    console.log(`Sent to ${otherSide}: ${currentSide} has disconnected`);
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

        if (defenderReady && hackerReady) {
            if (currentTurn === 'Defender') {
                if (lastMessageSent.defender !== 'Both players are ready. The game begins now!') {
                    io.emit('game_message', 'Both players are ready. The game begins now!');
                    emitGameMessage('defender', 'You get the first two turns, please proceed.');
                    emitGameMessage('hacker', 'Defender gets the first two turns, I will let you know when it is your turn.');
                    io.emit('turn', currentTurn);
                }
            }
        } else {
            const waitingMessage = side === 'Defender'
                ? 'Defender has confirmed they are ready to start, they are waiting on you to click ready up'
                : 'Hacker has confirmed they are ready to start, they are waiting on you to click ready up';
            emitGameMessage(side === 'Defender' ? 'hacker' : 'defender', waitingMessage);
        }
    });

    // function checkReady(socket) {
    //     if (!defenderReady || !hackerReady) {
    //         if (lastMessageSent.defender !== 'Both sides must ready up before the game can start.' && lastMessageSent.hacker !== 'Both sides must ready up before the game can start.') {
    //             socket.emit('game_message', 'Both sides must ready up before the game can start.');
    //             console.log('Sent to both sides: Both sides must ready up before the game can start.');
    //         }
    //         return false;
    //     }
    //     return true;
    // }



    // function checkReady(socket) {
    //     if (!defenderReady || !hackerReady) {
    //         let message = 'Both sides must ready up before the game can start.';
    //         if (socket.side === 'Defender' && lastMessageSent.defender !== message) {
    //             socket.emit('defender_game_message', message);
    //             lastMessageSent.defender = message;
    //             console.log('Sent to Defender: Both sides must ready up before the game can start.');
    //         } else if (socket.side === 'Hacker' && lastMessageSent.hacker !== message) {
    //             socket.emit('hacker_game_message', message);
    //             lastMessageSent.hacker = message;
    //             console.log('Sent to Hacker: Both sides must ready up before the game can start.');
    //         }
    //         return false;
    //     }
    //     return true;
    // }



    function checkReady(socket) {
        if (!defenderReady || !hackerReady) {
            let message = 'Both sides must ready up before the game can start.';
            socket.emit(`${socket.side.toLowerCase()}_game_message`, message);
            console.log(`Sent to ${socket.side}: ${message}`);
            return false;
        }
        return true;
    }



    // socket.on('location', ({ side, location }) => {
    //     if (!checkReady(socket)) return;
    //
    //     if (side !== currentTurn) {
    //         console.log(`It's not ${side}'s turn`);
    //         if (lastMessageSent[side.toLowerCase()] !== 'Please wait, it is not your turn.') {
    //             socket.emit('game_message', 'Please wait, it is not your turn.');
    //             console.log(`Sent to ${side}: Please wait, it is not your turn.`);
    //         }
    //         return;
    //     }
    //
    //     selectedLocation = location;
    //     console.log(`Selected location: ${location} by ${side}`);
    //     if (!selectedAction) {
    //         socket.emit(`${side.toLowerCase()}_game_message`, `What action would you like to apply to ${location}?`);
    //         console.log(`Sent to ${side}: What action would you like to apply to ${location}?`);
    //     }
    //     checkAndEmitTurnCompletion(side);
    // });



    socket.on('location', ({ side, location }) => {
        if (!checkReady(socket)) return;

        if (side !== currentTurn) {
            console.log(`It's not ${side}'s turn`);
            if (lastMessageSent[side.toLowerCase()] !== 'Please wait, it is not your turn.') {
                socket.emit('game_message', 'Please wait, it is not your turn.');
                lastMessageSent[side.toLowerCase()] = 'Please wait, it is not your turn.';
                console.log(`Sent to ${side}: Please wait, it is not your turn.`);
            }
            return;
        }

        selectedLocation = location;
        console.log(`Selected location: ${location} by ${side}`);
        if (!selectedAction) {
            socket.emit(`${side.toLowerCase()}_game_message`, `What action would you like to apply to ${location}?`);
            console.log(`Sent to ${side}: What action would you like to apply to ${location}?`);
        } else {
            checkAndEmitTurnCompletion(side);
        }
    });




    // socket.on('actions', ({ side, action }) => {
    //     if (!checkReady(socket)) return;
    //
    //     if (side !== currentTurn) {
    //         console.log(`It's not ${side}'s turn`);
    //         if (lastMessageSent[side.toLowerCase()] !== 'Please wait, it is not your turn.') {
    //             socket.emit('game_message', 'Please wait, it is not your turn.');
    //             console.log(`Sent to ${side}: Please wait, it is not your turn.`);
    //         }
    //         return;
    //     }
    //
    //     selectedAction = action;
    //     console.log(`Selected action: ${action} by ${side}`);
    //     if (!selectedLocation) {
    //         socket.emit(`${side.toLowerCase()}_game_message`, `What location would you like to apply ${action} to?`);
    //         console.log(`Sent to ${side}: What location would you like to apply ${action} to?`);
    //     }
    //     checkAndEmitTurnCompletion(side);
    // });


    // socket.on('actions', ({ side, action }) => {
    //     if (!checkReady(socket)) return;
    //
    //     if (side !== currentTurn) {
    //         console.log(`It's not ${side}'s turn`);
    //         if (lastMessageSent[side.toLowerCase()] !== 'Please wait, it is not your turn.') {
    //             socket.emit('game_message', 'Please wait, it is not your turn.');
    //             lastMessageSent[side.toLowerCase()] = 'Please wait, it is not your turn.';
    //             console.log(`Sent to ${side}: Please wait, it is not your turn.`);
    //         }
    //         return;
    //     }
    //
    //     selectedAction = action;
    //     console.log(`Selected action: ${action} by ${side}`);
    //     if (!selectedLocation) {
    //         socket.emit(`${side.toLowerCase()}_game_message`, `What location would you like to apply ${action} to?`);
    //         console.log(`Sent to ${side}: What location would you like to apply ${action} to?`);
    //     } else {
    //         checkAndEmitTurnCompletion(side);
    //     }
    // });



    socket.on('actions', ({ side, action }) => {
        if (!checkReady(socket)) return;

        if (side !== currentTurn) {
            console.log(`It's not ${side}'s turn`);
            if (lastMessageSent[side.toLowerCase()] !== 'Please wait, it is not your turn.') {
                socket.emit('game_message', 'Please wait, it is not your turn.');
                lastMessageSent[side.toLowerCase()] = 'Please wait, it is not your turn.';
                console.log(`Sent to ${side}: Please wait, it is not your turn.`);
            }
            return;
        }

        selectedAction = action;
        console.log(`Selected action: ${action} by ${side}`);
        if (!selectedLocation) {
            socket.emit(`${side.toLowerCase()}_game_message`, `What location would you like to apply ${action} to?`);
            console.log(`Sent to ${side}: What location would you like to apply ${action} to?`);
        } else {
            checkAndEmitTurnCompletion(side);
        }
    });




    socket.on('confirm_action', () => {
        if (selectedAction && selectedLocation) {
            io.emit(`${currentTurn.toLowerCase()}_game_message`, `${currentTurn} has applied ${selectedAction} to ${selectedLocation}`);
            console.log(`${currentTurn} has applied ${selectedAction} to ${selectedLocation}`);

            if (currentTurn === 'Defender') {
                if (defenderInitialTurns > 1) {
                    defenderInitialTurns--;
                    emitGameMessage('defender', 'You have one turn left.');
                } else {
                    emitGameMessage('hacker', 'The defender has finished their turn, it\'s your turn to act');
                    emitGameMessage('defender', 'You have finished your turn');
                    currentTurn = 'Hacker'; // Switch to Hacker's turn
                }
            } else if (currentTurn === 'Hacker') {
                emitGameMessage('defender', 'The hacker has completed their turn, it\'s your move now');
                emitGameMessage('hacker', 'You have finished your turn');
                currentTurn = 'Defender'; // Switch to Defender's turn
            }

            selectedAction = null;
            selectedLocation = null;
            io.emit('turn', currentTurn);
            console.log(`Turn: ${currentTurn}`);
        }
    });

    // function checkAndEmitTurnCompletion(side) {
    //     if (selectedAction && selectedLocation) {
    //         socket.emit(`${side.toLowerCase()}_game_message`, `Are you sure you would like to apply ${selectedAction} to ${selectedLocation}? If yes, click Confirm.`);
    //         console.log(`Sent to ${side}: Are you sure you would like to apply ${selectedAction} to ${selectedLocation}? If yes, click Confirm.`);
    //     }
    // }


    function checkAndEmitTurnCompletion(side) {
        if (selectedAction && selectedLocation) {
            socket.emit(`${side.toLowerCase()}_game_message`, `Are you sure you would like to apply ${selectedAction} to ${selectedLocation}? If yes, click Confirm.`);
            console.log(`Sent to ${side}: Are you sure you would like to apply ${selectedAction} to ${selectedLocation}? If yes, click Confirm.`);
        }
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
