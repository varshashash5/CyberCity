# app.py
from flask import Flask, request, jsonify

app = Flask(__name__)


@app.route('/process_action', methods=['POST'])
def process_action():
    data = request.json
    # Modify the data by appending "py" to each value
    modified_data = {
        "side": data['side'] + "py",
        "action": data['action'] + "py",
        "location": data['location'] + "py"
    }

    # Return the modified data as JSON
    return jsonify(modified_data)


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=4000)


# from flask import Flask, request, jsonify
# from flask_cors import CORS
#
# app = Flask(__name__)
# CORS(app)  # Allows cross-origin requests
#
# # Initial location health and compromise percentages
# location_data = {
#     'Business': {'health': 100, 'compromise': 0},
#     'Hospital': {'health': 120, 'compromise': 0},
#     'Fire/Police': {'health': 110, 'compromise': 0},
#     'Industrial': {'health': 130, 'compromise': 0},
#     'University': {'health': 90, 'compromise': 0},
#     'Housing': {'health': 100, 'compromise': 0},
#     'Fort Sam': {'health': 150, 'compromise': 0},
#     'Traffic Lights': {'health': 80, 'compromise': 0}
# }
#
# @app.route('/process_action', methods=['POST'])
# def process_action():
#     data = request.json
#     side = data['side']
#     action = data['action']
#     location = data['location']
#     current_health = data['currentHealth']
#
#     # Get the location's current data
#     location_info = location_data.get(location, {'health': 100, 'compromise': 0})
#
#     outcome_message = ""
#     location_neutralized = False
#
#     if side == 'Defender':
#         if action == 'User Training':
#             location_info['health'] += 10
#         elif action == 'Virus Protection':
#             location_info['health'] += 5
#         elif action == 'Firewall':
#             location_info['health'] += 5
#         elif action == 'Intrusion Detection':
#             pass
#
#     elif side == 'Hacker':
#         if action == 'Phishing':
#             location_info['compromise'] += 10
#         elif action == 'Virus':
#             location_info['compromise'] += 15
#         elif action == 'Malware':
#             location_info['compromise'] += 20
#
#     # Update location data
#     location_data[location] = location_info
#
#     # Check if the location is neutralized
#     if location_info['compromise'] > 75:
#         location_neutralized = True
#         outcome_message = f"{location} has been neutralized."
#     else:
#         outcome_message = f"The action was successful! {location} now has {location_info['health']} health."
#
#     return jsonify({
#         'newHealth': location_info['health'],
#         'outcomeMessage': outcome_message,
#         'locationNeutralized': location_neutralized
#     })
#
# if __name__ == '__main__':
#     app.run(port=4000)
# /////////////////////


# if __name__ == '__main__':
#     app.run(port=3000)

# # Copyright SAMSAT
# from flask import Flask, request, jsonify
# from flask_cors import CORS
# import random
#
# app = Flask(__name__)
# CORS(app)
#
# @app.route('/process_action', methods=['POST'])
# def process_action():
#     data = request.json
#     side = data['side']
#     action = data['action']
#     location = data['location']
#     current_health = data['currentHealth']
#
#     success = random.random() < 0.5 if side == 'Hacker' else True
#     outcome_message = ''
#     location_neutralized = False
#
#     if success:
#         if side == 'Hacker':
#             damage = random.randint(10, 30)
#             new_health = current_health - damage
#             outcome_message = f'{action} on {location} was successful! {damage} damage was done.'
#         else:
#             repair = random.randint(10, 30)
#             new_health = current_health + repair
#             outcome_message = f'{action} on {location} was successful! {location} was repaired by {repair}.'
#     else:
#         new_health = current_health
#         outcome_message = f'{action} on {location} failed! No changes were made.'
#
#     if new_health <= 0:
#         new_health = 0
#         location_neutralized = True
#
#     return jsonify({
#         'newHealth': new_health,
#         'outcomeMessage': outcome_message,
#         'locationNeutralized': location_neutralized
#     })
#
# if __name__ == '__main__':
#     app.run(port=5000)
