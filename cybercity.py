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
        self.round = 1
        self.rounds = 10
        self.turn = 'defender'
        self.messages = {
            'defender': [],
            'attacker': [],
        }
        self.messageAll(f"Game started. {self.turn.capitalize()}'s turn.")
        self.used_locations = []  # A player cannot act on the same location twice per turn

    def messageAll(self, message: str) -> None:
        self.messages['defender'].append(message)
        self.messages['attacker'].append(message)
    
    def messageEach(self, *, defender: str = '', attacker: str = '') -> None:
        if defender:
            self.messages['defender'].append(defender)
        if attacker:
            self.messages['attacker'].append(attacker)

    def hack_successful(self, probability: float) -> bool:
        return random.random() < probability
    
    def end_turn(self) -> None:
        self.used_locations.clear()
        self.turn = 'attacker' if self.turn == 'defender' else 'defender'
        
        if self.turn == 'defender':
            if self.round < self.rounds:
                self.round += 1
            else:
                self.turn = None
                if self.budget['attacker'] == self.budget['defender']:
                    self.messageAll(f'Game ended in a tie.')
                else:
                    winner = min(self.budget)
                    self.messageAll(f'Game ended. {winner.capitalize()} wins.')

        if self.turn:
            self.messageAll(f"{self.turn.capitalize()}'s turn.")
