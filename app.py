from flask import Flask, request, jsonify
import random

app = Flask(__name__)

# Probabilities and effects for Hacker actions
HACKER_ACTIONS = {
    'Phishing': {'base_probability': 0.85, 'compromise_range': (35, 58)},
    'Virus': {'base_probability': 0.90, 'compromise_range': (40, 78)},
    'Malware': {'base_probability': 0.80, 'compromise_range': (63, 90)},
}

# Probabilities and effects for Defender actions
DEFENDER_ACTIONS = {
    'Firewall': {'compromise_reduction_range': (6, 10), 'hacker_probability_reduction': 0.08},
    'Virus Protection': {'shield_range': (20, 35)},
    'Intrusion Detection': {'revive_range': (50, 70), 'reduction_range': (5, 10)},
    'User Training': {'damage_reduction_range': (10, 30), 'compromise_reduction_range': (6, 15)},
}

# Cooldowns for Defender actions
defender_action_cooldowns = {
    'Intrusion Detection': 0
}

# Hacker action probabilities per location
location_hacker_probabilities = {
    'Business': HACKER_ACTIONS.copy(),
    'Hospital': HACKER_ACTIONS.copy(),
    'Fire/Police': HACKER_ACTIONS.copy(),
    'Industrial': HACKER_ACTIONS.copy(),
    'University': HACKER_ACTIONS.copy(),
    'Housing': HACKER_ACTIONS.copy(),
    'Fort Sam': HACKER_ACTIONS.copy(),
    'Traffic Lights': HACKER_ACTIONS.copy(),
}

def decrement_cooldowns():
    """Decrement the cooldowns for defender actions after each round."""
    for action in defender_action_cooldowns:
        if defender_action_cooldowns[action] > 0:
            defender_action_cooldowns[action] -= 1

@app.route('/process_action', methods=['POST'])
def process_action():
    data = request.json
    side = data['side']
    action = data['action']
    location = data['location']
    current_compromise = data.get('current_compromise', 0)  # Current compromise at the location

    result = {}

    if side == 'Hacker':
        action_details = location_hacker_probabilities[location][action]
        success = random.random() < action_details['base_probability']
        if success:
            compromise_increase = random.randint(*action_details['compromise_range'])
            if action == 'Phishing':
                message = f'A clever phishing scheme targeted {location}, successfully deceiving users and increasing compromise by {compromise_increase}%.'
            elif action == 'Virus':
                message = f'A destructive virus infiltrated {location}, wreaking havoc and raising the compromise level by {compromise_increase}%.'
            elif action == 'Malware':
                message = f'Malware infected the systems at {location}, causing significant damage and increasing compromise by {compromise_increase}%.'
            result = {
                'action': action,
                'location': location,
                'compromise': compromise_increase,
                'message': message
            }
        else:
            if action == 'Phishing':
                message = f'The phishing attempt at {location} was thwarted, preventing any increase in compromise.'
            elif action == 'Virus':
                message = f'The virus attack on {location} was neutralized, sparing the system from further damage.'
            elif action == 'Malware':
                message = f'The malware failed to deploy at {location}, avoiding any compromise increase.'
            result = {
                'action': action,
                'location': location,
                'compromise': 0,
                'message': message
            }

    elif side == 'Defender':
        if action == 'Firewall':
            compromise_decrease = random.randint(*DEFENDER_ACTIONS['Firewall']['compromise_reduction_range'])
            if current_compromise < compromise_decrease:
                compromise_decrease = current_compromise  # Adjust to avoid negative compromise
            for hacker_action in location_hacker_probabilities[location]:
                location_hacker_probabilities[location][hacker_action]['base_probability'] -= \
                    DEFENDER_ACTIONS['Firewall']['hacker_probability_reduction']
            message = f'A robust firewall has been activated at {location}, reducing the compromise by {compromise_decrease}% and lowering hacker action success rates by 15%.'
            result = {
                'action': action,
                'location': location,
                'shield': False,
                'compromise': -compromise_decrease,
                'message': message
            }
        elif action == 'Virus Protection':
            shield = random.randint(*DEFENDER_ACTIONS['Virus Protection']['shield_range'])
            message = f'Virus Protection software has been deployed at {location}, adding a protective shield of {shield}% against future attacks.'
            result = {
                'action': action,
                'location': location,
                'shield': shield,
                'compromise': 0,
                'message': message
            }
        elif action == 'Intrusion Detection':
            if defender_action_cooldowns['Intrusion Detection'] > 0:
                message = f'Intrusion Detection is on cooldown for {defender_action_cooldowns["Intrusion Detection"]} more rounds.'
                result = {
                    'message': message
                }
            elif current_compromise >= 75:
                revive_amount = random.randint(*DEFENDER_ACTIONS['Intrusion Detection']['revive_range'])
                defender_action_cooldowns['Intrusion Detection'] = 2
                message = f'Intrusion Detection revived critical systems at {location}, decreasing the compromise by {revive_amount}%.'
                result = {
                    'action': action,
                    'location': location,
                    'shield': False,
                    'compromise': -revive_amount,
                    'message': message
                }
            else:
                compromise_decrease = random.randint(*DEFENDER_ACTIONS['Intrusion Detection']['reduction_range'])
                message = f'Intrusion Detection detected suspicious activity at {location}, reducing compromise by {compromise_decrease}%.'
                result = {
                    'action': action,
                    'location': location,
                    'shield': False,
                    'compromise': -compromise_decrease,
                    'message': message
                }

            if current_compromise >= 75:
                defender_action_cooldowns['Intrusion Detection'] = 2

        elif action == 'User Training':
            compromise_decrease = random.randint(*DEFENDER_ACTIONS['User Training']['compromise_reduction_range'])
            damage_reduction = random.randint(*DEFENDER_ACTIONS['User Training']['damage_reduction_range'])
            if current_compromise < compromise_decrease:
                compromise_decrease = current_compromise  # Adjust to avoid negative compromise
            message = f'User training conducted at {location} enhanced cyber-awareness, reducing compromise by {compromise_decrease}% and decreasing the next attack\'s damage by {damage_reduction}%.'
            result = {
                'action': action,
                'location': location,
                'shield': False,
                'compromise': -compromise_decrease,
                'message': message
            }

    decrement_cooldowns()

    return jsonify(result)


if __name__ == '__main__':
    app.run(port=4000)
