from flask import Flask, render_template, request, redirect, url_for, session
import random
from cybercity import Cybercity
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.secret_key = 'secret_key'  # session management
cybercity = Cybercity()
socketio = SocketIO(app)

# Initial Game Setup
@app.before_first_request
def setup_game():
    session['turn'] = 'defender'  # Start with the defender's turn
    session['budget'] = {
        "defender": 50000,
        "attacker": 50000
    }
    session['messages'] = []

protection_actions = {
    "Firewall": {"effect": 0.30, "probability": 0.7},
    "Virus Protection": {"effect": 0.15, "probability": 0.8},
    "Intrusion Detection System": {"effect": 0.25, "probability": 0.9},
    "User Training": {"effect": 0.20, "probability": 1.0},
    "Turn Off Lights": {"effect": 0, "probability": 1.0}
}

hacking_actions = {
    "Phishing": {"effect": 0.35, "probability": 0.7},
    "Virus": {"effect": 0.25, "probability": 0.8},
    "Malware": {"effect": 0.20, "probability": 0.9},
    "Skip Turn": {"effect": 0, "probability": 1.0}
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/choose_role', methods=['POST'])
def choose_role():
    role = request.form['role']
    session['role'] = role
    if role == 'defender':
        return redirect(url_for('defender'))
    else:
        return redirect(url_for('attacker'))

@app.route('/defender')
def defender():
    if session.get('role') != 'defender':
        return redirect(url_for('index'))
    messages = session.get('messages', [])
    return render_template('defender.html', city=cybercity.districts, budget=session['budget'], messages=messages)

@app.route('/attacker')
def attacker():
    if session.get('role') != 'attacker':
        return redirect(url_for('index'))
    messages = session.get('messages', [])
    return render_template('attacker.html', city=cybercity.districts, budget=session['budget'], messages=messages, hacking_actions=hacking_actions)

@socketio.on('manage_district')
def handle_manage_district(data):
    if session['turn'] != 'defender':
        return

    district = data['district']
    action = data['action']
    if action == 'turnOn':
        cybercity.turnOnLight(district)
    elif action == 'turnOff':
        cybercity.turnOffLight(district)
    
    session['turn'] = 'attacker'
    session['messages'].append(f"Defender turned {action} the lights in {district}.")
    emit('update', {'city': cybercity.districts, 'messages': session['messages'], 'turn': session['turn'], 'budget': session['budget']}, broadcast=True)

@socketio.on('battle_action')
def handle_battle_action(data):
    if session['turn'] != 'attacker':
        return

    action = data['action']
    location_to_attack = data['location']
    session['budget']['attacker'] -= 1000

    if action != "Skip Turn":
        if cybercity.hackSuccessful(hacking_actions[action]['probability']):
            cybercity.turnOffLight(location_to_attack)
            session['messages'].append(f"Attacker successfully used {action} on {location_to_attack}. Lights turned off.")
        else:
            session['messages'].append(f"Attacker's {action} on {location_to_attack} failed.")

    session['turn'] = 'defender'
    emit('update', {'city': cybercity.districts, 'messages': session['messages'], 'turn': session['turn'], 'budget': session['budget']}, broadcast=True)

if __name__ == '__main__':
    socketio.run(app, debug=True)
