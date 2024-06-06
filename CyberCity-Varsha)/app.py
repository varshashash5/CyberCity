from flask import Flask, render_template, request, redirect, url_for, session
import random  # Import random module for random number generation
from cybercity import Cybercity

app = Flask(__name__)
app.secret_key = 'secret_key'  # session management
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
    if session['turn'] != 'attacker':
        return redirect(url_for('index'))  

    action = request.form['action']
    location_to_attack = request.form['location']  # Added to specify the location being attacked

    if action == 'attack':
        session['budget']['attacker'] -= 1000
        hack_success = random.random()
    
        # Determine damage 
        damage = int(10 * hack_success)  # Damage calculation
    
        # Apply damage if protection is less than the damage
        if cybercity.locations[location_to_attack]['protection'] < damage:
            cybercity.locations[location_to_attack]['compromised'] = True
            success = cybercity.hackSuccessful(0.5)  # Example probability
    
            if success:
                cybercity.turnOffLight(location_to_attack)

    elif action == 'defend':
        session['budget']['defender'] -= 1000
        location1_budget = int(request.form.get('location1_budget', 0))
        location2_budget = int(request.form.get('location2_budget', 0))
        dice_roll = random.randint(1, 6)

        #still working on this
        success_rate = dice_roll / 6.0
        
        # Increase protection based on success rate and spent budget
        spent_budget = location1_budget + location2_budget
        increased_protection = int(spent_budget * success_rate)
        cybercity.locations[location_to_attack]['protection'] += increased_protection

    # Switch turn to defender after action
    session['turn'] = 'defender'
    return redirect(url_for('index'))

@app.route('/upgrade_district', methods=['POST'])
def upgrade_district():
    if session['turn'] != 'defender':
        return redirect(url_for('index'))  

    district = request.form['district']
    cost = 2000  # Example upgrade cost
    if session['budget']['defender'] >= cost:
        session['budget']['defender'] -= cost
        cybercity.upgradeDefense(district)  # Assume this method upgrades the district's defense

    session['turn'] = 'attacker'
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True, host='192.168.86.41', port=5001)
