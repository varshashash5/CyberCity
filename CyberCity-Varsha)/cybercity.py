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

    def turnOnLight(self, district):
        self.districts[district]['light'] = "On"

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

    def allRelaysOn(self):
        pass

    def allRelaysOff(self):
        pass

    def allPiRelaysOn(self, PiIP):
        pass

    def allPiRelaysOff(self, PiIP):
        pass

    def relayOn(self, PiIP, relayNo):
        pass

    def relayOff(self, PiIP, relayNo):
        pass

    def refresh(self):
        for district, status in self.districts.items():
            print(f"{district} lights are {status['light']}")

    def hackSuccessful(self, probability):
        return random.random() < probability
