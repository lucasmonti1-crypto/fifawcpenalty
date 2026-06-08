export interface Team {
  id: string;
  name: string;
  player: string;
  accuracy: number; // 0 - 100
  power: number; // 0 - 100
  curve: number; // 0 - 100
  colors: {
    shirt: string;
    shorts: string;
    socks: string;
    stripes?: string; // e.g. for Argentina white/blue
    pattern?: 'stripes' | 'plain' | 'squares'; // squares for Croatia
  };
}

export type ShotDirection = 'left' | 'center' | 'right';
export type ShotHeight = 'low' | 'high'; // low (ground/mid), high (top corners / under bar)

// Single source of truth for the power "sweet spot". Used by the physics,
// the isPerfect flag and the on-screen power bar so they never drift apart.
export const POWER_SWEET_SPOT = { min: 70, max: 86 } as const;
export const isSweetSpot = (power: number): boolean =>
  power >= POWER_SWEET_SPOT.min && power <= POWER_SWEET_SPOT.max;

export interface ShotResult {
  isGoal: boolean;
  isSaved: boolean;
  isOffTarget: boolean;
  hitWoodwork: boolean;
  keeperDived: ShotDirection;
  keeperHeight: ShotHeight;
  isPerfect: boolean;
  power: number;
  curve: number;
  message: string;
  ballFinalPos: { x: number; y: number; z: number };
}

export type GameState = 'TEAM_SELECT' | 'PRE_SHOT' | 'RUN_UP' | 'KICK' | 'BALL_FLIGHT' | 'CELEBRATION' | 'SAVED' | 'OUT_OF_BOUNDS' | 'MATCH_OVER';

// Knockout bracket: win each tie to advance until you lift the cup.
export const TOURNAMENT_STAGES = ['Octavos de final', 'Cuartos de final', 'Semifinal', 'Final'] as const;

export const TEAMS: Team[] = [
  {
    id: 'ARG',
    name: 'Argentina',
    player: 'Lionel Messi',
    accuracy: 95,
    power: 80,
    curve: 90,
    colors: {
      shirt: '#74ACDF',
      shorts: '#ffffff',
      socks: '#74ACDF',
      stripes: '#ffffff',
      pattern: 'stripes'
    }
  },
  {
    id: 'FRA',
    name: 'France',
    player: 'Kylian Mbappé',
    accuracy: 85,
    power: 95,
    curve: 75,
    colors: {
      shirt: '#0F1E36',
      shorts: '#ffffff',
      socks: '#E11D48',
      pattern: 'plain'
    }
  },
  {
    id: 'BRA',
    name: 'Brazil',
    player: 'Neymar Jr',
    accuracy: 88,
    power: 82,
    curve: 92,
    colors: {
      shirt: '#FFDF00',
      shorts: '#002776',
      socks: '#009B3A',
      pattern: 'plain'
    }
  },
  {
    id: 'POR',
    name: 'Portugal',
    player: 'Cristiano Ronaldo',
    accuracy: 90,
    power: 95,
    curve: 70,
    colors: {
      shirt: '#9B0000',
      shorts: '#004B00',
      socks: '#9B0000',
      pattern: 'plain'
    }
  },
  {
    id: 'ESP',
    name: 'Spain',
    player: 'Pedri',
    accuracy: 87,
    power: 75,
    curve: 85,
    colors: {
      shirt: '#C4151C',
      shorts: '#1E3A8A',
      socks: '#C4151C',
      pattern: 'plain'
    }
  },
  {
    id: 'GER',
    name: 'Germany',
    player: 'Jamal Musiala',
    accuracy: 86,
    power: 80,
    curve: 88,
    colors: {
      shirt: '#ffffff',
      shorts: '#000000',
      socks: '#ffffff',
      pattern: 'plain'
    }
  },
  {
    id: 'ENG',
    name: 'England',
    player: 'Jude Bellingham',
    accuracy: 88,
    power: 85,
    curve: 80,
    colors: {
      shirt: '#ffffff',
      shorts: '#0a192f',
      socks: '#ffffff',
      pattern: 'plain'
    }
  },
  {
    id: 'NED',
    name: 'Netherlands',
    player: 'Virgil van Dijk',
    accuracy: 75,
    power: 90,
    curve: 60,
    colors: {
      shirt: '#F15A24',
      shorts: '#ffffff',
      socks: '#F15A24',
      pattern: 'plain'
    }
  },
  {
    id: 'URU',
    name: 'Uruguay',
    player: 'Federico Valverde',
    accuracy: 85,
    power: 92,
    curve: 78,
    colors: {
      shirt: '#4EA9E6',
      shorts: '#ffffff',
      socks: '#4EA9E6',
      pattern: 'plain'
    }
  },
  {
    id: 'CRO',
    name: 'Croatia',
    player: 'Luka Modric',
    accuracy: 92,
    power: 70,
    curve: 88,
    colors: {
      shirt: '#ffffff',
      shorts: '#1E3A8A',
      socks: '#ffffff',
      stripes: '#E11D48',
      pattern: 'squares'
    }
  },
  {
    id: 'BEL',
    name: 'Belgium',
    player: 'Kevin De Bruyne',
    accuracy: 89,
    power: 84,
    curve: 86,
    colors: {
      shirt: '#E30613',
      shorts: '#000000',
      socks: '#E30613',
      pattern: 'plain'
    }
  },
  {
    id: 'USA',
    name: 'United States',
    player: 'Christian Pulisic',
    accuracy: 84,
    power: 86,
    curve: 78,
    colors: {
      shirt: '#ffffff',
      shorts: '#0A3161',
      socks: '#B31942',
      pattern: 'plain'
    }
  },
  {
    id: 'MEX',
    name: 'Mexico',
    player: 'Hirving Lozano',
    accuracy: 85,
    power: 83,
    curve: 82,
    colors: {
      shirt: '#006847',
      shorts: '#ffffff',
      socks: '#CE1126',
      pattern: 'plain'
    }
  },
  {
    id: 'ITA',
    name: 'Italy',
    player: 'Federico Chiesa',
    accuracy: 88,
    power: 83,
    curve: 84,
    colors: {
      shirt: '#0066A6',
      shorts: '#ffffff',
      socks: '#0066A6',
      pattern: 'plain'
    }
  },
  {
    id: 'COL',
    name: 'Colombia',
    player: 'Luis Díaz',
    accuracy: 86,
    power: 85,
    curve: 83,
    colors: {
      shirt: '#FCD116',
      shorts: '#003893',
      socks: '#CE1126',
      pattern: 'plain'
    }
  },
  {
    id: 'MAR',
    name: 'Morocco',
    player: 'Achraf Hakimi',
    accuracy: 85,
    power: 84,
    curve: 80,
    colors: {
      shirt: '#C1272D',
      shorts: '#C1272D',
      socks: '#006233',
      pattern: 'plain'
    }
  }
];

export interface Goalkeeper {
  name: string;
  reflejos: number;
  alcance: number;
}

export const GOALKEEPER_REGISTRY: Record<string, Goalkeeper> = {
  ARG: { name: 'Emiliano Martínez', reflejos: 92, alcance: 91 },
  FRA: { name: 'Mike Maignan', reflejos: 91, alcance: 90 },
  BRA: { name: 'Alisson Becker', reflejos: 90, alcance: 92 },
  POR: { name: 'Diogo Costa', reflejos: 89, alcance: 90 },
  ESP: { name: 'Unai Simón', reflejos: 89, alcance: 88 },
  GER: { name: 'Marc-André ter Stegen', reflejos: 91, alcance: 89 },
  ENG: { name: 'Jordan Pickford', reflejos: 90, alcance: 86 },
  NED: { name: 'Bart Verbruggen', reflejos: 88, alcance: 89 },
  URU: { name: 'Sergio Rochet', reflejos: 88, alcance: 90 },
  CRO: { name: 'Dominik Livaković', reflejos: 91, alcance: 89 },
  BEL: { name: 'Thibaut Courtois', reflejos: 92, alcance: 94 },
  USA: { name: 'Matt Turner', reflejos: 86, alcance: 87 },
  MEX: { name: 'Guillermo Ochoa', reflejos: 89, alcance: 86 },
  ITA: { name: 'Gianluigi Donnarumma', reflejos: 92, alcance: 93 },
  COL: { name: 'David Ospina', reflejos: 87, alcance: 85 },
  MAR: { name: 'Yassine Bounou', reflejos: 90, alcance: 88 }
};
