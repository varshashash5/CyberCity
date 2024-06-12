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

io.on('connection', (socket) => {
    socket.on('login', (side) => {
        console.log(`${side} logged in`);
        socket.side = side;

        if (side === 'Defender') {
            if (gameState.defender && gameState.defender.disconnected) {

                gameState.defender.socket = socket;
                gameState.defender.disconnected = false;
                socket.emit('defender_game_message', 'You have logged back in as Defender');
                if (gameState.hacker) {
                    socket.emit('game_message', 'Hacker has already logged in');
                    gameState.hacker.socket.emit('game_message', 'Defender has logged back in');
                }
            } else {

                gameState.defender = { socket: socket, disconnected: false };
                socket.emit('defender_game_message', 'You have logged in as Defender');
                if (gameState.hacker) {
                    socket.emit('game_message', 'Hacker has already logged in');
                    gameState.hacker.socket.emit('game_message', 'Defender has logged in');
                }
            }
        } else if (side === 'Hacker') {
            if (gameState.hacker && gameState.hacker.disconnected) {
                // Hacker reconnects
                gameState.hacker.socket = socket;
                gameState.hacker.disconnected = false;
                socket.emit('hacker_game_message', 'You have logged back in as Hacker');
                if (gameState.defender) {
                    socket.emit('game_message', 'Defender has already logged in');
                    gameState.defender.socket.emit('game_message', 'Hacker has logged back in');
                }
            } else {
                // New Hacker logs in
                gameState.hacker = { socket: socket, disconnected: false };
                socket.emit('hacker_game_message', 'You have logged in as Hacker');
                if (gameState.defender) {
                    socket.emit('game_message', 'Defender has already logged in');
                    gameState.defender.socket.emit('game_message', 'Hacker has logged in');
                }
            }
        }
    });


    socket.on('disconnect', () => {
        if (socket.side === 'Defender' && gameState.defender) {
            gameState.defender.disconnected = true;
            if (gameState.hacker && !gameState.hacker.disconnected) {
                gameState.hacker.socket.emit('game_message', 'Defender has disconnected');
            }
        } else if (socket.side === 'Hacker' && gameState.hacker) {
            gameState.hacker.disconnected = true;
            if (gameState.defender && !gameState.defender.disconnected) {
                gameState.defender.socket.emit('game_message', 'Hacker has disconnected');
            }
        }
    });




// socket.on('login', (side) => {
    //     console.log(`${side} logged in`);
    //     socket.side = side; // Assign the side to the socket for future reference
    //     io.emit(`${side.toLowerCase()}_game_message`, `${side} logged in`);
    //     io.emit(`${side === 'Defender' ? 'hacker' : 'defender'}_game_message`, `${side} logged in`);
    // });

    socket.on('ready_up', ({ side }) => {
        if (side === 'Defender') {
            defenderReady = true;
            io.emit('defender_game_message', 'Defender has confirmed they are ready to start');
        } else if (side === 'Hacker') {
            hackerReady = true;
            io.emit('hacker_game_message', 'Hacker has confirmed they are ready to start');
        }

        if (defenderReady && hackerReady) {
            io.emit('game_message', 'Both players are ready. The game begins now!');
            currentTurn = 'Defender';
            io.emit('defender_game_message', 'You get the first two turns, please proceed.');
            io.emit('hacker_game_message', 'Defender gets the first two turns, I will let you know when it is your turn.');
            io.emit('turn', currentTurn);
        } else {
            const waitingMessage = side === 'Defender'
                ? 'Hacker has confirmed they are ready to start, they are waiting on you to click ready up'
                : 'Defender has confirmed they are ready to start, they are waiting on you to click ready up';
            io.emit(`${side === 'Defender' ? 'hacker' : 'defender'}_game_message`, waitingMessage);
        }
    });

    function checkAndEmitTurnCompletion(side) {
        if (selectedAction && selectedLocation) {
            io.emit(`${side.toLowerCase()}_game_message`, `${side} has applied ${selectedAction} to ${selectedLocation}`);

            if (side === 'Defender') {
                if (defenderInitialTurns > 1) {
                    defenderInitialTurns--;
                    io.emit('defender_game_message', 'You have one turn left.');
                } else {
                    io.emit('hacker_game_message', 'The defender has finished their turn, it\'s your turn to act');
                    io.emit('defender_game_message', 'You have finished your turn');
                    currentTurn = 'Hacker'; // Switch to Hacker's turn
                }
            } else if (side === 'Hacker') {
                io.emit('defender_game_message', 'The hacker has completed their turn, it\'s your move now');
                io.emit('hacker_game_message', 'You have finished your turn');
                currentTurn = 'Defender'; // Switch to Defender's turn
            }

            selectedAction = null;
            selectedLocation = null;
            io.emit('turn', currentTurn);
        }
    }

    socket.on('location', ({ side, location }) => {
        if (!defenderReady || !hackerReady) {
            socket.emit('game_message', 'Both sides must ready up before the game can start.');
            return;
        }

        if (side !== currentTurn) {
            console.log(`It's not ${side}'s turn`);
            socket.emit('game_message', 'Please wait, it is not your turn.');
            return;
        }

        selectedLocation = location;
        console.log(`Selected location: ${location} by ${side}`);
        if (!selectedAction) {
            io.emit(`${side.toLowerCase()}_game_message`, `What action would you like to apply to ${location}?`);
        }
        checkAndEmitTurnCompletion(side);
    });

    socket.on('actions', ({ side, action }) => {
        if (!defenderReady || !hackerReady) {
            socket.emit('game_message', 'Both sides must ready up before the game can start.');
            return;
        }

        if (side !== currentTurn) {
            console.log(`It's not ${side}'s turn`);
            socket.emit('game_message', 'Please wait, it is not your turn.');
            return;
        }

        selectedAction = action;
        console.log(`Selected action: ${action} by ${side}`);
        if (!selectedLocation) {
            io.emit(`${side.toLowerCase()}_game_message`, `What location would you like to apply ${action} to?`);
        }
        checkAndEmitTurnCompletion(side);
    });
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

