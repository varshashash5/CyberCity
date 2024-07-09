// Copyright SAMSAT

import { html, render } from 'https://unpkg.com/htm/preact/standalone.module.js';

const round = document.querySelector('#round');
const budget = document.querySelector('#budget');
const city = document.querySelector('.city');
const selectDistrict = document.querySelector('#district');
const selectAction = document.querySelector('#action');
const executeButton = document.querySelector('#execute');
const endTurnButton = document.querySelector('#endturn');
const messages = document.querySelector('#messages');

function updateUI(data) {
    round.innerText = `Round ${data.round} of ${data.rounds}`;
    budget.innerText = `Budget: \$${data.budget[window.role]}`;

    render(Object.keys(data.city).sort()
        .map(district => {
            const onOff = data.city[district] ? 'On' : 'Off';
            return html`<div class="district${onOff}">${district}: ${onOff}</div>`
        }), city);

    if (data.budget[window.role] < Math.min(...Object.values(window.actions))) {
        executeButton.disabled = true;
        executeButton.innerText = 'Budget exhausted';
    } else if (data.turn == window.role) {
        executeButton.disabled = false;
        executeButton.innerText = 'Execute action';
    } else if (!data.turn) {
        executeButton.disabled = true;
        executeButton.innerText = 'Game ended';
    } else {
        executeButton.disabled = true;
        executeButton.innerText =
            `Waiting for ${window.role == 'attacker' ? 'defender' : 'attacker'}`;
    }
    endTurnButton.disabled = executeButton.disabled;

    render(Object.keys(data.city).sort()
        .filter(k => data.turn != window.role || !data.usedLocations.includes(k))
        .map(k => html`<option value="${k}">${k}</option>`),
        selectDistrict);

    render(Object.keys(window.actions).sort()
        .filter(k => window.actions[k] <= data.budget[window.role])
        .map(k =>
            html`<option value="${k}">${k} (\$${window.actions[k]})</option>`
        ), selectAction)
    render(data.messages[window.role].reverse().map(message => html`<li>${message}</li>`), messages)
}

let socket = io.connect('http://' + document.domain + ':' + location.port);
socket.on('update', function (data) {
    updateUI(data);
});

executeButton.addEventListener('click', () => {
    const district = document.getElementById('district').value;
    const action = document.getElementById('action').value;
    console.log(`${window.role} executes: action=${action}, district=${district}`);  // Debugging
    if (window.role == 'attacker') {
        socket.emit('battle_action', { action: action, location: district });
    } else {
        socket.emit('manage_district', { action: action, location: district });
    }
});

endTurnButton.addEventListener('click', () => {
    socket.emit('end_turn', {});
});

document.addEventListener('DOMContentLoaded', () => updateUI(window.initialData));
