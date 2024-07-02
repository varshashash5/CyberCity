# Copyright SAMSAT

import random

district_names = (
    'Business', 'Hospital', 'Fire/Police', 'Industrial', 'University',
    'Housing', 'Fort Sam', 'Traffic Lights'
)

class Cybercity:
    def __init__(self):
        self.lights = { name: True for name in district_names }
        self.budget = {
            'defender': 50000,
            'attacker': 50000,
        }
        self.turn = 'defender'
        self.messages = [f"Game started. {self.turn.capitalize()}'s turn."]

    def hackSuccessful(self, probability: float) -> bool:
        return random.random() < probability
