# Copyright SAMSAT

import random

class Cybercity:
    def __init__(self):
        self.districts = {
            "Business": {"light": "On"},
            "Hospital": {"light": "On"},
            "Fire/Police": {"light": "On"},
            "Industrial": {"light": "On"},
            "University": {"light": "On"},
            "Housing": {"light": "On"},
            "Fort Sam": {"light": "On"},
            "Traffic Lights": {"light": "On"}
        }

        self.budget = {
            "defender": 50000,
            "attacker": 50000
        }

    def turnOnLight(self, district):
        if self.budget['defender'] >= 1000:  # Check if defender has enough budget
            self.districts[district]['light'] = "On"
            self.budget['defender'] -= 1000  # Deduct budget

    def turnOffLight(self, district):
        self.districts[district]['light'] = "Off"

    def getStatus(self, district):
        return self.districts[district]['light']

    def on(self):
        for district in self.districts:
            self.turnOnLight(district)

    def off(self):
        for district in self.districts:
            self.turnOffLight(district)

    def refresh(self):
        for district, status in self.districts.items():
            print(f"{district} lights are {status['light']}")

    def hackSuccessful(self, probability):
        return random.random() < probability
