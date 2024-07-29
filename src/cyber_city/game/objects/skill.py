"""
Skill is a class that represents a skill that a player can use in the game.
"""


class Skill:
    """
    Skill is a class that represents a skill that a player can use in the game.
    """

    def __init__(self, name: str, description: str, cost: int, strength: int):
        self.name = name
        self.description = description
        self.cost = cost
        self.strength = strength

    def __str__(self):
        return f"{self.name} - {self.description} - {self.cost} - {self.strength}"
