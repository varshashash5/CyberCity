<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Cyber City Defender</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta3/dist/css/bootstrap.min.css">
    <style>
        body {
            background-color: #121212;
            color: #c0c0c0;
            font-family: 'Orbitron', sans-serif;
        }
        .container {
            background-image: linear-gradient(to bottom right, #242424, #484848);
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0, 255, 255, 0.5);
        }
        h1, h2 {
            color: #00ffea;
        }
        .btn {
            margin-top: 10px;
        }
        .btn-danger {
            background-color: #ff073a;
        }
        .btn-success {
            background-color: #4caf50;
        }
        .btn-warning {
            background-color: #ff9800;
        }
        .btn-secondary {
            background-color: #6c757d;
        }
        .alert-primary {
            background-color: #007bff;
            border-color: #0056b3;
        }
        /* Hover effects for buttons */
        .btn:hover {
            opacity: 0.8;
        }
        /* Custom scroll bars */
        ::-webkit-scrollbar {
            width: 10px;
        }
        ::-webkit-scrollbar-track {
            background: #f1f1f1;
        }
        ::-webkit-scrollbar-thumb {
            background: #888;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #555;
        }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap" rel="stylesheet">
</head>
<body>
<div class="container">
    <h1>Cyber City Defender</h1>
    <div class="alert alert-primary" role="alert">
        Current Turn: {{ turn.capitalize() }} | Defender Budget: {{ budget.defender }} | Attacker Budget: {{ budget.attacker }}
    </div>
    <div class="row">
        <div class="col-md-6">
            <h2>Districts</h2>
            {% for district, properties in city.items() %}
                <div>{{ district }}: Light is {{ properties['light'] }}
                    <form action="/manage_district" method="post" style="display:inline;">
                        <input type="hidden" name="district" value="{{ district }}">
                        <select class="form-select" name="action" id="action-{{ district }}">
                            {% for action, details in protection_actions.items() %}
                                <option value="{{ action }}" {% if properties['light'] == 'On' and action == 'Turn Off Lights' %}selected{% elif properties['light'] == 'On' and action != 'Turn Off Lights' %}disabled{% elif properties['light'] == 'Off' and action == 'Turn Off Lights' %}disabled{% endif %}>{{ action }}</option>
                            {% endfor %}
                        </select>
                        <input type="hidden" name="cost" value="0" id="cost-{{ district }}">
                        <button type="submit" class="btn btn-sm btn-warning">Submit</button>
                    </form>
                </div>
            {% endfor %}
        </div>
        <div class="col-md-6">
            <h2>Battle Actions</h2>
            <form action="/battle_action" method="post">
                <label for="attack-select">Select District to Attack:</label>
                <select class="form-select" id="attack-select" name="attack_district">
                    {% for district in city %}
                        <option value="{{ district }}">{{ district }}</option>
                    {% endfor %}
                </select>
                <label for="attack-action-select">Select Attack Action:</label>
                <select class="form-select" id="attack-action-select" name="attack_action">
                    {% for action, details in hacking_actions.items() %}
                        <option value="{{ action }}">{{ action }}</option>
                    {% endfor %}
                </select>
                <input type="hidden" name="cost" value="0" id="attack-cost">
                <button type="submit" class="btn btn-danger">Attack</button>
            </form>
        </div>
    </div>
    <div class="alert alert-secondary mt-4" role="alert">
        <h2>Game Messages</h2>
        <ul>
            {% for message in messages %}
                <li>{{ message }}</li>
            {% endfor %}
        </ul>
    </div>
</div>
<!-- Bootstrap JS and dependencies -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta3/dist/js/bootstrap.min.js"></script>
<script>
    document.addEventListener('DOMContentLoaded', function() {
        const protectionActions = JSON.parse('{{ protection_actions | tojson | safe }}');
        const hackingActions = JSON.parse('{{ hacking_actions | tojson | safe }}');
        const defenderBudget = {{ budget.defender }};
        const attackerBudget = {{ budget.attacker }};

        // Update cost values based on selected action for protection actions
        document.querySelectorAll('select[name="action"]').forEach(select => {
            select.addEventListener('change', function() {
                const district = this.id.split('-')[1];
                const costInput = document.getElementById(`cost-${district}`);
                const action = this.value;
                costInput.value = Math.floor(defenderBudget * protectionActions[action].probability);
            });
        });

        // Update cost value for battle actions
        document.getElementById('attack-action-select').addEventListener('change', function() {
            const costInput = document.getElementById('attack-cost');
            const action = this.value;
            costInput.value = Math.floor(attackerBudget * hackingActions[action].probability);
        });
    });
</script>
</body>
</html>