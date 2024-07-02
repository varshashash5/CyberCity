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
                           actions={ k: v.cost for k, v in defender_actions.items() })

@app.route('/attacker')
def attacker():
    if session.get('role') != 'attacker':
        return redirect(url_for('index'))
    return render_template('attacker.html', city=cybercity.lights, turn=cybercity.turn,
                           budget=cybercity.budget, messages=cybercity.messages,
                           actions={ k: v.cost for k, v in attacker_actions.items() })

def emit_update():
    emit('update', {
        'city': cybercity.lights,
        'messages': cybercity.messages,
        'turn': cybercity.turn,
        'budget': cybercity.budget,
    }, broadcast=True)

@socketio.on('manage_district')
def handle_manage_district(data):
    print(f"Handling manage_district: {data}")  # Debugging
    if cybercity.turn != 'defender' or cybercity.budget['defender'] < min_defender_cost:
        return

    district = data['location']
    action = data['action']
    if cybercity.budget['attacker'] >= min_attacker_cost:
        cybercity.turn = 'attacker'
    cybercity.budget['defender'] -= defender_actions[action].cost
    
    if action == 'Turn Off Lights':
        cybercity.lights[district] = False
        cybercity.messages.append(f"Defender turned off the lights in {district}.")
    else:
        if cybercity.hackSuccessful(defender_actions[action].probability):
            cybercity.lights[district] = True
            cybercity.messages.append(f"Defender successfully used {action} on {district}. Lights turned on.")
        else:
            cybercity.messages.append(f"Defender's {action} on {district} failed.")

    if cybercity.budget['defender'] < min_defender_cost:
        cybercity.messages.append(f"Defender's budget exhausted.")
    
    emit_update()

@socketio.on('battle_action')
def handle_battle_action(data):
    print(f"Handling battle_action: {data}")  # Debugging
    if cybercity.turn != 'attacker' or cybercity.budget['attacker'] < 1000:
        return

    action = data['action']
    district = data['location']
    if cybercity.budget['defender'] >= min_defender_cost:
        cybercity.turn = 'defender'
    cybercity.budget['attacker'] -= attacker_actions[action].cost

    if action != "Skip Turn":
        if cybercity.hackSuccessful(attacker_actions[action].probability):
            cybercity.lights[district] = False
            cybercity.messages.append(f"Attacker successfully used {action} on {district}. Lights turned off.")
        else:
            cybercity.messages.append(f"Attacker's {action} on {district} failed.")

    if cybercity.budget['attacker'] < min_attacker_cost:
        cybercity.messages.append(f"Attacker's budget exhausted.")

    emit_update()

if __name__ == '__main__':
    socketio.run(app, debug=True)
