from flask import Flask, request, jsonify
import random

app = Flask(__name__)

# Hacker actions and their probabilities
HACKER_ACTIONS = {
    'Phishing': {'base_probability': 0.90, 'compromise_range': (35, 58)},
    'Virus': {'base_probability': 0.85, 'compromise_range': (48, 82)},
    'Malware': {'base_probability': 0.80, 'compromise_range': (63, 95)},
}

# Defender actions and their effects
DEFENDER_ACTIONS = {
    'Firewall': {'compromise_reduction_range': (6, 10), 'hacker_probability_reduction': 0.08},
    'Virus Protection': {'shield_range': (20, 35)},
    'Intrusion Detection': {'revive_range': (45, 68), 'reduction_range': (5, 10)},
    'User Training': {'damage_reduction_range': (10, 30), 'compromise_reduction_range': (6, 15)},
}

# State tracking for each location
location_damage_reduction = {}
location_hacker_probability_reduction = {loc: 0 for loc in [
    'Business', 'Hospital', 'Fire/Police', 'Industrial',
    'University', 'Housing', 'Lackland', 'Traffic Lights'
]}

defender_action_cooldowns = {'Intrusion Detection': 0}


def decrement_cooldowns():
    """Decrement cooldowns for defender actions."""
    for action in defender_action_cooldowns:
        if defender_action_cooldowns[action] > 0:
            defender_action_cooldowns[action] -= 1


@app.route('/process_action', methods=['POST'])
def process_action():
    data = request.json
    side = data['side']
    action = data['action']
    location = data['location']
    current_compromise = data.get('current_compromise', 0)

    result = {}

    if side == 'Hacker':
        # Get action details and apply any probability reduction from Firewall
        action_details = HACKER_ACTIONS[action]
        total_probability_reduction = location_hacker_probability_reduction.get(location, 0)
        effective_probability = action_details['base_probability'] - total_probability_reduction

        success = random.random() < effective_probability
        location_hacker_probability_reduction[location] = 0  # Reset after attack

        if success:
            compromise_increase = random.randint(*action_details['compromise_range'])
            damage_reduction_percent = location_damage_reduction.get(location, 0)
            damage_reduction_amount = int(compromise_increase * (damage_reduction_percent / 100))
            final_increase = max(compromise_increase - damage_reduction_amount, 0)

            if damage_reduction_percent > 0:
                message = (
                    f'{action} was completed at {location}. It would have done {compromise_increase} but '
                    f'due to previous User Training, the compromise was reduced by {damage_reduction_amount} '
                    f'({damage_reduction_percent}%), causing the compromise increase to only be {final_increase}.'
                )
                if total_probability_reduction > 0:
                    message += f' The probability of success was {total_probability_reduction * 100:.2f}% less than normal due to previous Firewall deployment.'

                location_damage_reduction[location] = 0  # Reset after successful attack
            else:
                message = (
                    f'{action} was completed at {location}, increasing the compromise by {final_increase}.'
                )
                if total_probability_reduction > 0:
                    message += f' The probability of success was {total_probability_reduction * 100:.2f}% less than normal due to previous Firewall deployment.'

            result = {
                'action': action,
                'location': location,
                'compromise': final_increase,
                'message': message
            }
        else:
            if total_probability_reduction > 0:
                message = (
                    f'{action} failed at {location}, likely due to previous Firewall effects. '
                    f'The probability to land a successful attack at {location} was '
                    f'{total_probability_reduction * 100:.2f}% less than normal.'
                )
            else:
                message = f'{action} failed at {location}. Maybe next time...'

            result = {
                'action': action,
                'location': location,
                'compromise': 0,
                'message': message
            }

    elif side == 'Defender':
        if action == 'Firewall':
            reduction = random.randint(*DEFENDER_ACTIONS['Firewall']['compromise_reduction_range'])
            applied_value = min(reduction, current_compromise)
            location_hacker_probability_reduction[location] += DEFENDER_ACTIONS['Firewall'][
                'hacker_probability_reduction']
            total_probability_reduction = location_hacker_probability_reduction[location]

            if applied_value == reduction:
                message = (
                    f'Firewall activated at {location}, compromise decreased by {applied_value}. '
                    f'The probability that the next attack will be successful at {location} was decreased by '
                    f'{total_probability_reduction * 100:.2f}%.'
                )
            else:
                message = (
                    f'Firewall activated at {location}, reducing compromise by {applied_value}. '
                    f'The full reduction was {reduction}, but only {applied_value} could be applied. '
                    f'The probability that the next attack will be successful at {location} was decreased by '
                    f'{total_probability_reduction * 100:.2f}%.'
                )

            result = {
                'action': action,
                'location': location,
                'compromise': -applied_value,
                'message': message
            }

        elif action == 'Intrusion Detection':
            if current_compromise >= 100:
                message = f'{location} has been lost to the Hacker. There is no getting it back...'
                result = {'message': message}
            elif defender_action_cooldowns['Intrusion Detection'] > 0:
                message = f'Intrusion Detection is on cooldown for {defender_action_cooldowns["Intrusion Detection"]} more rounds.'
                result = {'message': message}
            else:
                if current_compromise >= 75:
                    revive_amount = random.randint(*DEFENDER_ACTIONS['Intrusion Detection']['revive_range'])
                    applied_value = min(revive_amount, current_compromise)
                else:
                    revive_amount = random.randint(*DEFENDER_ACTIONS['Intrusion Detection']['reduction_range'])
                    applied_value = min(revive_amount, current_compromise)

                if current_compromise >= 75 and current_compromise < 100:
                    if applied_value == revive_amount:
                        message = (
                            f'Intrusion Detection revived systems at {location}, decreasing compromise by {applied_value}.'
                        )
                    else:
                        message = (
                            f'Intrusion Detection revived systems at {location}, decreasing compromise by {applied_value}. '
                            f'The full revive value was {revive_amount}, but only {applied_value} could be applied.'
                        )

                    defender_action_cooldowns['Intrusion Detection'] = 2
                else:
                    message = (
                        f'Intrusion Detection added into {location}, decreasing compromise by {applied_value}.'
                    )

                result = {
                    'action': action,
                    'location': location,
                    'compromise': -applied_value,
                    'message': message
                }

        elif action == 'Virus Protection':
            shield = random.randint(*DEFENDER_ACTIONS['Virus Protection']['shield_range'])
            message = f'Virus Protection deployed at {location}, adding a shield of {shield}.'
            result = {
                'action': action,
                'location': location,
                'shield': shield,
                'compromise': 0,
                'message': message
            }

        elif action == 'User Training':
            reduction = random.randint(*DEFENDER_ACTIONS['User Training']['compromise_reduction_range'])
            applied_value = min(reduction, current_compromise)
            damage_reduction = random.randint(*DEFENDER_ACTIONS['User Training']['damage_reduction_range'])

            location_damage_reduction[location] = damage_reduction

            message = (
                f'User Training conducted at {location}, reducing compromise by {applied_value} and '
                f'mitigating the next successful attack\'s damage by {damage_reduction}%.'
            )
            result = {
                'action': action,
                'location': location,
                'compromise': -applied_value,
                'message': message
            }

    decrement_cooldowns()
    return jsonify(result)


if __name__ == '__main__':
    app.run(port=4000)
