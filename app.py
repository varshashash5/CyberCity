# Copyright SAMSAT

from flask import Flask, render_template, request, redirect, url_for, session
from cybercity import Cybercity
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.secret_key = 'secret_key'  # session management
cybercity = Cybercity()
socketio = SocketIO(app)

base_cost = 10000

class Action():
    def __init__(self, effect: float, probability: float):
        self.effect = effect
        self.probability = probability
        self.cost = int(base_cost * self.effect * self.probability)

defender_actions = {
    "Firewall": Action(0.3, 0.7),
    "Virus Protection": Action(0.15, 0.8),
    "Intrusion Detection System": Action(0.25, 0.9),
    "User Training": Action(0.2, 1.0),
    "Turn Off Lights": Action(0.0, 1.0),
}
min_defender_cost = min(x.cost for x in defender_actions.values())

attacker_actions = {
    "Phishing": Action(0.35, 0.7),
    "Virus": Action(0.25, 0.8),
    "Malware": Action(0.2, 0.9),
    "Skip Turn": Action(0.0, 1.0),
}
min_attacker_cost = min(x.cost for x in attacker_actions.values())

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/choose_role', methods=['POST'])
def choose_role():
    role = request.form['role']
    session['role'] = role
    return redirect(url_for(role))

@app.route('/defender')
def defender():
    if session.get('role') != 'defender':
        return redirect(url_for('index'))
    return render_template('defender.html', city=cybercity.lights, turn=cybercity.turn,
                           budget=cybercity.budget, messages=cybercity.messages,
                           round=cybercity.round, rounds=cybercity.rounds,
                           usedLocations=cybercity.used_locations,
                           actions={ k: v.cost for k, v in defender_actions.items() })

@app.route('/attacker')
def attacker():
    if session.get('role') != 'attacker':
        return redirect(url_for('index'))
    return render_template('attacker.html', city=cybercity.lights, turn=cybercity.turn,
                           budget=cybercity.budget, messages=cybercity.messages,
                           round=cybercity.round, rounds=cybercity.rounds,
                           usedLocations=cybercity.used_locations,
                           actions={ k: v.cost for k, v in attacker_actions.items() })

def emit_update():
    if len(cybercity.used_locations) == len(cybercity.lights):
        cybercity.end_turn()
    
    emit('update', {
        'city': cybercity.lights,
        'messages': cybercity.messages,
        'turn': cybercity.turn,
        'round': cybercity.round,
        'rounds': cybercity.rounds,
        'budget': cybercity.budget,
        'usedLocations': cybercity.used_locations,
    }, broadcast=True)

#tracking defenses present
@socketio.on('manage_district')
def handle_manage_district(data):
    print(f"Handling manage_district: {data}")  # Debugging
    district = data['location']
    action = data['action']

    if (cybercity.turn != 'defender'
        or cybercity.budget['defender'] < defender_actions[action].cost):
        return
    
    if action == 'Turn Off Lights':
       cybercity.lights[district] = False
       cybercity.messageEach(
            defender=f"Defender turned off the lights in {district}.",
            attacker=f'Lights turned off in {district}.')
    else:
        cybercity.defender_actions_active[district].append(action)  # Track active defenses
        cybercity.messageEach(
            defender=f"Defender successfully used {action} on {district}.",
            attacker=f'Defense {action} activated in {district}.')

    cybercity.used_locations.append(district)
    cybercity.budget['defender'] -= defender_actions[action].cost
    emit_update()

#calculating attack prob based on base prob and defenses
@socketio.on('battle_action')
def handle_battle_action(data):
    print(f"Handling battle_action: {data}")  # Debugging
    action = data['action']
    district = data['location']

    if (cybercity.turn != 'attacker'
        or cybercity.budget['attacker'] < attacker_actions[action].cost):
        return

    if action != "Skip Turn":
        base_probability = attacker_actions[action].probability
        attack_probability = cybercity.calculate_attack_probability(district, base_probability)
        if cybercity.hack_successful(attack_probability):
            cybercity.lights[district] = False
            cybercity.messageEach(
                defender=f'Lights turned off in {district}.',
                attacker=f"Attacker successfully used {action} on {district}. Lights turned off.")
        else:
            cybercity.messageEach(
                attacker=f"Attacker's {action} on {district} failed.")

    cybercity.used_locations.append(district)
    cybercity.budget['attacker'] -= attacker_actions[action].cost
    emit_update()

@socketio.on('end_turn')
def handle_end_turn(data):
    print(f"Handling end_turn: {data}")  # Debugging
    cybercity.end_turn()
    emit_update()

if __name__ == '__main__':
    socketio.run(app, host='192.168.68.104', port=5001, debug=True)
