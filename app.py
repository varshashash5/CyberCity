from flask import Flask, request, jsonify
import random

app = Flask(__name__)

# Probabilities and effects for Hacker actions
HACKER_ACTIONS = {
    'Phishing': {'base_probability': 0.60, 'compromise_range': (15, 37)},
    'Virus': {'base_probability': 0.75, 'compromise_range': (10, 30)},
    'Malware': {'base_probability': 0.30, 'compromise_range': (35, 73)},
}

# Defender actions always have 100% success rate
defender_action_cooldowns = {
    'Intrusion Detection': 0
}


@app.route('/process_action', methods=['POST'])
def process_action():
    data = request.json
    side = data['side']
    action = data['action']
    location = data['location']

    result = {}

    if side == 'Hacker':
        action_details = HACKER_ACTIONS[action]
        success = random.random() < action_details['base_probability']
        if success:
            compromise_increase = random.randint(*action_details['compromise_range'])
            result = {
                'action': action,
                'location': location,
                'compromise': compromise_increase,
                'message': f'{action} was successful on {location}, increasing compromise by {compromise_increase}%.'
            }
        else:
            result = {
                'action': action,
                'location': location,
                'compromise': 0,
                'message': f'{action} failed on {location}. No compromise increase.'
            }

    elif side == 'Defender':
        if action == 'Firewall':
            compromise_decrease = random.randint(4, 9)
            result = {
                'action': action,
                'location': location,
                'shield': False,
                'compromise': -compromise_decrease,
                'message': f'Firewall applied to {location}, reducing compromise by {compromise_decrease}%.'
            }
        elif action == 'Virus Protection':
            shield = random.randint(10, 25)
            result = {
                'action': action,
                'location': location,
                'shield': shield,
                'compromise': 0,
                'message': f'Virus Protection applied to {location}, adding a shield of {shield}%.'
            }
        elif action == 'Intrusion Detection':
            current_compromise = data.get('current_compromise', 0)
            if current_compromise > 75:
                revive_amount = random.randint(25, 56)
                defender_action_cooldowns['Intrusion Detection'] = 2  # Set cooldown
                result = {
                    'action': action,
                    'location': location,
                    'shield': False,
                    'compromise': -revive_amount,
                    'message': f'Intrusion Detection revived {location}, decreasing compromise by {revive_amount}%.'
                }
            else:
                compromise_decrease = random.randint(5, 12)
                result = {
                    'action': action,
                    'location': location,
                    'shield': False,
                    'compromise': -compromise_decrease,
                    'message': f'Intrusion Detection applied to {location}, reducing compromise by {compromise_decrease}%.'
                }
        elif action == 'User Training':
            compromise_decrease = random.randint(4, 13)
            damage_reduction = random.randint(7, 35)
            result = {
                'action': action,
                'location': location,
                'shield': False,
                'compromise': -compromise_decrease,
                'message': f'User Training applied to {location}, reducing compromise by {compromise_decrease}% and decreasing future damage by {damage_reduction}%.'
            }

    return jsonify(result)


if __name__ == '__main__':
    app.run(port=4000)
