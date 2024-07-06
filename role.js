// Copyright SAMSAT

import { html, render } from 'https://unpkg.com/htm/preact/standalone.module.js';

const budget = document.querySelector('#budget');
const city = document.querySelector('.city');
const action = document.querySelector('#action');
const executeButton = document.querySelector('#execute');
const messages = document.querySelector('#messages');

function updateUI(data) {
    budget.innerText = `Budget: \$${data.budget[window.role]}`;

    render(Object.keys(data.city).map(district => {
        const onOff = data.city[district] ? 'On' : 'Off';
        return html`<div class="district${onOff}">${district}: ${onOff}</div>`
    }), city);

    if (data.budget[window.role] < Math.min(...Object.values(window.actions))) {
        executeButton.disabled = true;
        executeButton.innerText = 'Budget exhausted';
    } else if (data.turn == window.role) {
        executeButton.disabled = false;
        executeButton.innerText = 'Execute action';
    } else {
        executeButton.disabled = true;
        executeButton.innerText =
            `Waiting for ${window.role == 'attacker' ? 'defender' : 'attacker'}`;
    }

    render(Object.keys(window.actions)
        .filter(k => window.actions[k] <= data.budget[window.role])
        .map(k =>
            html`<option value="${k}">${k} (\$${window.actions[k]})</option>`
        ), action)
    render(data.messages.reverse().map(message => html`<li>${message}</li>`), messages)
}

let socket = io.connect('http://' + document.domain + ':' + location.port);
socket.on('update', function (data) {
    updateUI(data);
});

function executeAction() {
    const district = document.getElementById('district').value;
    const action = document.getElementById('action').value;
    console.log(`${window.role} executes: action=${action}, district=${district}`);  // Debugging
    if (window.role == 'attacker') {
        socket.emit('battle_action', { action: action, location: district });
    } else {
        socket.emit('manage_district', { action: action, location: district });
    }
}

executeButton.addEventListener('click', executeAction);

document.addEventListener('DOMContentLoaded', () => updateUI(window.initialData));
