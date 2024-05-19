from flask import Flask, render_template, request, redirect, url_for, session
from cybercity import Cybercity
import random

app = Flask(__name__)
app.secret_key = 'secret_key'
cybercity = Cybercity()

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

@app.before_first_request
def setup_game():
    session['turn'] = 'defender'
    session['messages'] = []

@app.route('/')
def index():
    messages = session.get('messages', [])
    return render_template('index.html', city=cybercity.districts, turn=session['turn'], budget=cybercity.budget, messages=messages, protection_actions=protection_actions, hacking_actions=hacking_actions)

@app.route('/manage_district', methods=['POST'])
def manage_district():
    if session['turn'] != 'defender':
        return redirect(url_for('index'))  

    action = request.form['action']
    district = request.form['district']
    cost = int(float(request.form['cost']))

    cybercity.budget['defender'] -= cost

    if action == 'Turn Off Lights':
        cybercity.turnOffLight(district)
        session['messages'].append(f"Defender turned off lights in {district}.")
    else:
        cybercity.turnOnLight(district)
        session['messages'].append(f"Defender applied {action} to {district}.")

    session['turn'] = 'attacker'
    return redirect(url_for('index'))

@app.route('/battle_action', methods=['POST'])
def battle_action():
    if session['turn'] != 'attacker':
        return redirect(url_for('index'))  

    action = request.form['attack_action']
    district = request.form['attack_district']
    cost = int(float(request.form['cost']))

    cybercity.budget['attacker'] -= cost

    if action != 'Skip Turn':
        if cybercity.hackSuccessful(hacking_actions[action]['probability']):
            cybercity.turnOffLight(district)
            session['messages'].append(f"Attacker successfully used {action} on {district}. Lights turned off.")
        else:
            session['messages'].append(f"Attacker's {action} on {district} failed.")
    else:
        session['messages'].append("Attacker skipped the turn.")

    session['turn'] = 'defender'
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True)
