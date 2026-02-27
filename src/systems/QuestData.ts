import type { QuestType } from './QuestSystem'

export const QUEST_DESCRIPTIONS: Record<QuestType, string[]> = {
  slay_dragon: [
    'Hunt the dragon terrorizing the lands',
    'Slay the beast that burns our fields',
    'Bring down the winged menace'
  ],
  explore_ruins: [
    'Explore the ancient ruins',
    'Uncover secrets of the old world',
    'Venture into forgotten depths'
  ],
  defend_village: [
    'Defend the village from raiders',
    'Protect our people from harm',
    'Stand guard against the enemy'
  ],
  find_artifact: [
    'Seek a lost relic of power',
    'Recover the ancient treasure',
    'Find the legendary artifact'
  ],
  escort_caravan: [
    'Escort the trade caravan safely',
    'Guard the merchants on their journey',
    'Protect the supply convoy'
  ],
  holy_pilgrimage: [
    'Undertake a sacred pilgrimage',
    'Journey to the holy site',
    'Complete the spiritual quest'
  ]
}

export const BALLAD_TEMPLATES = [
  '{name} the {title}, slayer of beasts',
  'The ballad of {name}, hero of {civ}',
  '{name} who walked through fire and shadow',
  'Songs of {name} the Undaunted',
  'The legend of {name}, champion of {civ}'
]
