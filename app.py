from flask import Flask, render_template, request, redirect, url_for, session
from cybercity import Cybercity

app = Flask(__name__)
app.secret_key = 'secret_key'  # Necessary for session management
cybercity = Cybercity()

# Initial Game Setup
@app.before_first_request
def setup_game():
    session['turn'] = 'defender'  # Start with the defender's turn
    session['budget'] = {
        "defender": 50000,
        "attacker": 50000
    }

@app.route('/')
def index():
    # Pass current turn and budget to the template
    return render_template('index.html', city=cybercity.districts, budget=session['budget'], turn=session['turn'])

@app.route('/manage_district', methods=['POST'])
def manage_district():
    if session['turn'] != 'defender':
        return redirect(url_for('index'))  

    district = request.form['district']
    action = request.form['action']
    if action == 'turnOn':
        cybercity.turnOnLight(district)
    elif action == 'turnOff':
        cybercity.turnOffLight(district)
    # Switch turn to attacker after action
    session['turn'] = 'attacker'
    return redirect(url_for('index'))

@app.route('/battle_action', methods=['POST'])
def battle_action():
    action = request.form['action']
    if session['turn'] != 'attacker':
        return redirect(url_for('index'))  

    if action == 'attack':
        session['budget']['attacker'] -= 1000
        # Implement attack logic here (e.g., hacking success based on probability)
        success = cybercity.hackSuccessful(0.5)  # Example probability
        if success:
            # implement successful attack
            pass
    elif action == 'defend':
        session['budget']['defender'] -= 1000
        # Implement defense logic 
    # switch turn to defender after action
    session['turn'] = 'defender'
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True, host='192.168.86.41', port=5001)


# second app here ? not sure 
 

