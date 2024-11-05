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
    locationStatus: {
        'Business': { compromise: 0, shield: 0 },
        'Hospital': { compromise: 0, shield: 0 },
        'Fire/Police': { compromise: 0, shield: 0 },
        'Industrial': { compromise: 0, shield: 0 },
        'University': { compromise: 0, shield: 0 },
        'Housing': { compromise: 0, shield: 0 },
        'Lackland': { compromise: 0, shield: 0 },
        'Traffic Lights': { compromise: 0, shield: 0 }
    },
    defenderCooldown: { 'Intrusion Detection': 0 } , // Cooldown for Intrusion Detection only
    budgets: {
        'Defender': 100000,
        'Hacker': 100000
    }
};

let gameOverState = {
    isGameOver: false,
    winner: null,
    hackerScore: 0,
    defenderScore: 0,
    restartClicked: {
        defender: false,
        hacker: false
    }
};


let players = { hacker: null, defender: null };
let restartRequests = { hacker: false, defender: false };


const actionCosts = {
    'Defender': {
        'Firewall': 7000,
        'Virus Protection': 13000,
        'Intrusion Detection': 26000,
        'User Training': 8000,
    },
    'Hacker': {
        'Phishing': 8000,
        'Virus': 9500,
        'Malware': 18000,
    }
};


io.on('connection', (socket) => {

    socket.on('restart_game', ({ clientType }) => {
        console.log(`Received restart request from ${clientType || ' client'}`);

        if (clientType === 'Hacker') {
            restartRequests.hacker = true;
        } else if (clientType === 'Defender') {
            restartRequests.defender = true;
        } else {
            console.log('Unknown clientType received after if else if else.');
        }
        // Check if both clients are ready to restart the game
        if (restartRequests.hacker && restartRequests.defender) {
            console.log('Both clients ready. Resetting game state.');
            resetGameState();

            // Redirect both clients to the start page
            io.emit('redirect', { url: 'http://localhost:3000' });

            // Reset the restartRequests object for the next game
            restartRequests = { hacker: false, defender: false };
        }
    });

    // Event for when a player chooses a side
    socket.on('choose_side', (side) => {
        if (!players.hacker && !players.defender) {
            // First player chooses a side
            players[side.toLowerCase()] = socket.id;
            socket.emit('waiting_for_opponent');
        } else if (!players[side.toLowerCase()]) {
            // Second player chooses the other side
            players[side.toLowerCase()] = socket.id;
            startGame();
        } else {
            // Auto-assign remaining side to second player
            const otherSide = players.hacker ? 'Defender' : 'Hacker';
            players[otherSide.toLowerCase()] = socket.id;
            startGame();
        }
    });


    // Ensure game starts only after both players choose a side
    function startGame() {
        const hackerSocket = io.sockets.sockets.get(players.hacker);
        const defenderSocket = io.sockets.sockets.get(players.defender);

        if (hackerSocket && defenderSocket) {
            hackerSocket.emit('opponent_found', 'hacker');
            defenderSocket.emit('opponent_found', 'defender');

            // Emit start game event
            io.emit('start_game', { round: roundCounter, turn: currentTurn });
        }
    }


    function emitGameMessage(side, message) {
        const lowerSide = side.toLowerCase();
        if (gameState[lowerSide] && !gameState[lowerSide].disconnected) {
            gameState[lowerSide].socket.emit(`${lowerSide}_game_message`, message);
            console.log(`Sent to ${side}: ${message}`);
        }
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



    function deductBudget(side, action) {
        const cost = actionCosts[side][action] || 0;  // Get the cost of the action
        if (gameState.budgets[side] >= cost) {
            gameState.budgets[side] -= cost;  // Deduct the cost from the player's budget
            return true;  // Successful deduction
        } else {
            emitGameMessage(side.toLowerCase(), `Not enough budget to perform ${action}.`);
            return false;  // Not enough funds
        }
    }



    function applyActionResult(side, result) {
        const { action, location, compromise, shield, message } = result;

        if (!action || !location) {
            console.error('Error: Action or location is undefined.');
            emitGameMessage(side.toLowerCase(), 'Action or location not properly selected. Please try again.');
            return;
        }

        console.log('Action:', action);
        console.log('Location:', location);

        // Handle cooldown for Defender's "Intrusion Detection"
        if (side === 'Defender') {
            if (action === 'Intrusion Detection') {
                // Check if Intrusion Detection is on cooldown
                if (gameState.defenderCooldown['Intrusion Detection'] > 0) {
                    emitGameMessage(side.toLowerCase(), `Intrusion Detection is on cooldown for ${gameState.defenderCooldown['Intrusion Detection']} more round(s).`);
                    emitGameMessage(side.toLowerCase(), 'Please select a new action and location.');
                    return;
                }

                // Only trigger cooldown if compromise >= 75 and revive_range is used
                if (gameState.locationStatus[location].compromise >= 75) {
                    gameState.defenderCooldown['Intrusion Detection'] = 2;  // Start cooldown for 2 rounds
                    emitGameMessage(side.toLowerCase(), 'Intrusion Detection is now on cooldown for 2 rounds.');
                }
            }

            // Apply compromise and shield changes
            gameState.locationStatus[location].shield = (gameState.locationStatus[location].shield || 0) + (shield || 0);
            gameState.locationStatus[location].compromise = Math.max(gameState.locationStatus[location].compromise + compromise, 0);
        } else if (side === 'Hacker') {
            const currentShield = gameState.locationStatus[location].shield || 0;
            const effectiveCompromise = Math.max(compromise - currentShield, 0);
            gameState.locationStatus[location].shield = Math.max(currentShield - compromise, 0);
            gameState.locationStatus[location].compromise = Math.min(gameState.locationStatus[location].compromise + effectiveCompromise, 100);

            if (gameState.locationStatus[location].compromise >= 75) {
                emitGameMessage(side.toLowerCase(), `${location} is now compromised!`);
            }
        }

        // Emit updated compromise levels to both clients
        io.emit('update_compromise', gameState.locationStatus);

        // Handle turn completion and cooldown decrement
        handleTurnCompletion(side);
    }


    socket.on('skip_turn', ({ side }) => {
        if (checkTurn(side, socket)) {
            const budgetIncrease = Math.floor(Math.random() * (8000 - 3000 + 1)) + 3000;
            gameState.budgets[side] += budgetIncrease;

            emitGameMessage(side, `You skipped your turn. ${budgetIncrease} was added to your budget.`);

            io.emit('budget_update', {
                defenderBudget: gameState.budgets['Defender'],
                hackerBudget: gameState.budgets['Hacker'],
                message: `${side} skipped their turn. ${budgetIncrease} was added to their budget.`
            });

            handleTurnCompletion(side);
        }
    });




    function calculateScoresAndEndGame() {
        let hackerScore = 0;
        let defenderScore = 0;

        // Calculate scores based on the compromise level of each location
        for (const [location, status] of Object.entries(gameState.locationStatus)) {
            if (status && status.compromise !== undefined) {  // Ensure compromise is defined
                const isCompromised = status.compromise >= 75;
                const points = location === 'Lackland' ? 2 : 1;

                if (isCompromised) {
                    hackerScore += points;  // Hacker gets points if compromised
                } else {
                    defenderScore += points;  // Defender gets points otherwise
                }
            } else {
                console.error(`Location ${location} has undefined compromise status`);
            }
        }

        // Determine the winner based on final scores
        let winner = '';
        if (hackerScore > defenderScore) {
            winner = 'Hacker';
        } else if (defenderScore > hackerScore) {
            winner = 'Defender';
        } else {
            winner = 'No one';  // Fallback for a tie (unlikely due to Lackland’s point value)
        }

        // Update the gameOverState with the scores and winner
        gameOverState.isGameOver = true;
        gameOverState.hackerScore = hackerScore;
        gameOverState.defenderScore = defenderScore;
        gameOverState.winner = winner;

        // Emit the game over event with final scores and winner
        io.emit('game_over', {
            winner,
            hackerScore,
            defenderScore
        });
    }

// Login or Reconnect Logic
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

            // If the game is over, send the stored scores from gameOverState
            if (gameOver) {
                restartRequests[side] = true;

                socket.emit('game_over', {
                    winner: gameOverState.winner || 'No one',
                    hackerScore: gameOverState.hackerScore,
                    defenderScore: gameOverState.defenderScore
                });
            } else if (gameStarted) {
                // Emit current game state details upon reconnection if game is ongoing
                socket.emit('hide_ready_buttons');
                socket.emit('round_update', roundCounter);
                socket.emit('turn', currentTurn);
                socket.emit('player_turn_status', {
                    isYourTurn: side === currentTurn
                });
                socket.emit('budget_update', {
                    defenderBudget: gameState.budgets.Defender,
                    hackerBudget: gameState.budgets.Hacker
                });
                socket.emit('update_shield_values', gameState.locationStatus);
                socket.emit('update_compromise', gameState.locationStatus);
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


// Handle Disconnections
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
            // Check if Intrusion Detection is on cooldown for the Defender
            if (side === 'Defender' && selectedAction === 'Intrusion Detection') {
                const cooldown = gameState.defenderCooldown['Intrusion Detection'];
                if (cooldown > 0) {
                    emitGameMessage(side, `Intrusion Detection is on cooldown for ${cooldown} more rounds.`);
                    return;
                }
            }

            // Deduct budget for the action
            if (!deductBudget(side, selectedAction)) return;  // If deduction fails, exit

            const actionDetails = {
                side,
                action: selectedAction,
                location: selectedLocation,
                current_compromise: gameState.locationStatus[selectedLocation].compromise
            };

            axios.post('http://127.0.0.1:4000/process_action', actionDetails)
                .then(response => {
                    const result = response.data;
                    applyActionResult(side, result);
                    console.log("result data received from app.py file:", result);
                    socket.emit(`${side.toLowerCase()}_game_message`, result.message, result.compromise);

                    // Emit the updated budget to the clients
                    io.emit('budget_update', {
                        defenderBudget: gameState.budgets['Defender'],
                        hackerBudget: gameState.budgets['Hacker']
                    });

                    selectedAction = null;
                    selectedLocation = null;

                })
                .catch(error => {
                    console.error('Error in sending action to app.py:', error);
                    emitGameMessage(side, 'An error occurred. Please try again.');
                });
        } else {
            emitGameMessage(side, 'Action or location not properly selected. Please try again.');
        }
    });


    function checkTurn(side, socket) {
        if (gameOver) {
            emitGameMessage(side, 'The game has ended.');
            return false;
        }
        if (side !== currentTurn) {
            emitGameMessage(side, 'Not your turn.');
            return false;
        }

        // Check if the player has enough budget for at least one action
        const availableActions = actionCosts[side];
        const canAffordAnyAction = Object.values(availableActions).some(cost => gameState.budgets[side] >= cost);

        if (!canAffordAnyAction) {
            emitGameMessage(side, 'Not enough budget to perform any action. Your turn is being skipped.');
            autoSkipTurn(side);  // Auto-skip if no affordable action
            return false;
        }
        return true;
    }

    function autoSkipTurn(side) {
        const budgetIncrease = Math.floor(Math.random() * (8000 - 3000 + 1)) + 3000;
        gameState.budgets[side] += budgetIncrease;

        emitGameMessage(side, `Your turn was skipped. ${budgetIncrease} was added to your budget.`);

        io.emit('budget_update', {
            defenderBudget: gameState.budgets['Defender'],
            hackerBudget: gameState.budgets['Hacker'],
            message: `${side} skipped their turn. ${budgetIncrease} was added to their budget.`
        });

        handleTurnCompletion(side);  // Move to the next player's turn
    }

    let extraTurnFlag = false; // Track if the extra turn is triggered


    function handleTurnCompletion(side) {
        turnCounter++;

        if (turnCounter % 2 === 0) {
            roundCounter++;
            if (roundCounter > 10) {
                gameOver = true;
                io.emit('game_message', 'Game over after 10 rounds.');
                io.emit('game_over', 'The game has ended.');
                calculateScoresAndEndGame();
                return;
            }
        }

        if (roundCounter <= 10) {
            // Handle special consecutive turns for round 1 (Defender) and round 10 (Hacker)
            if (roundCounter === 1 && currentTurn === 'Defender' && !extraTurnFlag) {
                emitGameMessage('Defender', 'Go again. You have two consecutive turns for the first round.');
                extraTurnFlag = true;
                io.emit('turn', 'Defender');
            } else if (roundCounter === 10 && currentTurn === 'Hacker' && !extraTurnFlag) {
                emitGameMessage('Hacker', 'Go again. This is your last turn before the game ends. Make it count!');
                extraTurnFlag = true;
                io.emit('turn', 'Hacker');
            } else {
                extraTurnFlag = false;
                currentTurn = currentTurn === 'Defender' ? 'Hacker' : 'Defender';

                if (currentTurn === 'Defender' && gameState.defenderCooldown['Intrusion Detection'] > 0) {
                    gameState.defenderCooldown['Intrusion Detection']--;
                    if (gameState.defenderCooldown['Intrusion Detection'] === 1) {
                        emitGameMessage('Defender', 'Intrusion Detection is on cooldown for 1 more round.');
                    } else if (gameState.defenderCooldown['Intrusion Detection'] === 0) {
                        emitGameMessage('Defender', 'Intrusion Detection is available once again!');
                    }
                }

                emitGameMessage(currentTurn, 'Your turn.');
                emitGameMessage(currentTurn === 'Defender' ? 'Hacker' : 'Defender', 'Your turn ended, please wait.');
            }

            io.emit('turn', currentTurn);
            io.emit('round_update', roundCounter);
        }
    }

    ///

    socket.on('reconnect_request', () => {
        // Check if the game has already ended
        if (gameOverState.isGameOver) {
            const side = (socket.id === defenderSocketId) ? 'defender' : 'hacker';

            // Log current gameOverState to troubleshoot
            console.log("Reconnecting player:", side);
            console.log("Current gameOverState:", gameOverState);

            // Send game over modal data to reconnecting client with stored winner and scores
            socket.emit('game_over', {
                winner: gameOverState.winner,
                hackerScore: gameOverState.hackerScore,
                defenderScore: gameOverState.defenderScore
            });

            // If the player hasn’t clicked restart yet, simulate it
            if (!gameOverState.restartClicked[side]) {
                gameOverState.restartClicked[side] = true;
                checkForGameRestart();
            }
        } else {
            // Send regular game state if game hasn’t ended
            socket.emit('send_full_state', {
                defenderBudget: gameState.budgets.Defender,
                hackerBudget: gameState.budgets.Hacker,
                locationStatus: gameState.locationStatus,
                roundCounter: roundCounter,
                currentTurn: currentTurn,
                isYourTurn: (socket.id === defenderSocketId && currentTurn === 'Defender')
            });
        }
    });


});

// Check for Game Restart Function
function checkForGameRestart() {
    if (gameOverState.restartClicked.defender && gameOverState.restartClicked.hacker) {
        resetGameState();
    }
}

// Function to handle game end and set gameOverState
function handleGameEnd(winner, hackerScore, defenderScore) {
    // Set game over state with final scores
    gameOverState.isGameOver = true;
    gameOverState.winner = winner;
    gameOverState.hackerScore = hackerScore;
    gameOverState.defenderScore = defenderScore;
    gameOverState.restartClicked.defender = false;
    gameOverState.restartClicked.hacker = false;

    // Emit the game over event with final scores
    io.emit('game_over', { winner, hackerScore, defenderScore });
}

// Reset Game State Function
function resetGameState() {
    selectedAction = null;
    selectedLocation = null;
    currentTurn = 'Defender';
    defenderReady = false;
    hackerReady = false;
    startMessageSent = false;
    turnCounter = 0;
    roundCounter = 1;
    gameOver = false;
    gameStarted = false;

    // Reset gameState but keep gameOverState until reset is emitted
    gameState = {
        defender: null,
        hacker: null,
        locationStatus: {
            'Business': { compromise: 0, shield: 0 },
            'Hospital': { compromise: 0, shield: 0 },
            'Fire/Police': { compromise: 0, shield: 0 },
            'Industrial': { compromise: 0, shield: 0 },
            'University': { compromise: 0, shield: 0 },
            'Housing': { compromise: 0, shield: 0 },
            'Lackland': { compromise: 0, shield: 0 },
            'Traffic Lights': { compromise: 0, shield: 0 }
        },
        defenderCooldown: { 'Intrusion Detection': 0 },
        budgets: {
            'Defender': 100000,
            'Hacker': 100000
        }
    };

    players = { hacker: null, defender: null };
    restartRequests = { hacker: false, defender: false };
    extraTurnFlag = false;

    console.log("Game state has been reset.");

    // Emit the reset event to all clients
    io.emit('game_reset');

    // Only reset gameOverState after the reset is emitted
    gameOverState.isGameOver = false;
    gameOverState.winner = null;
    gameOverState.hackerScore = 0;
    gameOverState.defenderScore = 0;
    gameOverState.restartClicked = { defender: false, hacker: false };
}

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
