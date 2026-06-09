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
  },
  {
    id: 'JPN',
    name: 'Japan',
    player: 'Takefusa Kubo',
    accuracy: 86,
    power: 78,
    curve: 84,
    colors: {
      shirt: '#BC002D',
      shorts: '#000080',
      socks: '#ffffff',
      pattern: 'plain'
    }
  },
  {
    id: 'KOR',
    name: 'South Korea',
    player: 'Son Heung-min',
    accuracy: 92,
    power: 89,
    curve: 80,
    colors: {
      shirt: '#C60C30',
      shorts: '#0C2A52',
      socks: '#ffffff',
      pattern: 'plain'
    }
  },
  {
    id: 'SEN',
    name: 'Senegal',
    player: 'Sadio Mané',
    accuracy: 88,
    power: 86,
    curve: 82,
    colors: {
      shirt: '#009E60',
      shorts: '#FDEF00',
      socks: '#CE1126',
      pattern: 'plain'
    }
  },
  {
    id: 'AUS',
    name: 'Australia',
    player: 'Mathew Leckie',
    accuracy: 84,
    power: 82,
    curve: 80,
    colors: {
      shirt: '#FFB81C',
      shorts: '#006E45',
      socks: '#FFB81C',
      pattern: 'plain'
    }
  },
  {
    id: 'ZAF',
    name: 'South Africa',
    player: 'Percy Tau',
    accuracy: 80,
    power: 82,
    curve: 75,
    colors: {
      shirt: '#00663E',
      shorts: '#F7B500',
      socks: '#00663E',
      pattern: 'plain'
    }
  },
  {
    id: 'CZE',
    name: 'Czechia',
    player: 'Patrik Schick',
    accuracy: 82,
    power: 75,
    curve: 83,
    colors: {
      shirt: '#D7141A',
      shorts: '#ffffff',
      socks: '#21468B',
      pattern: 'plain'
    }
  },
  {
    id: 'CAN',
    name: 'Canada',
    player: 'Jonathan David',
    accuracy: 85,
    power: 84,
    curve: 80,
    colors: {
      shirt: '#FF0000',
      shorts: '#ffffff',
      socks: '#FF0000',
      pattern: 'plain'
    }
  },
  {
    id: 'BIH',
    name: 'Bosnia',
    player: 'Edin Džeko',
    accuracy: 78,
    power: 80,
    curve: 77,
    colors: {
      shirt: '#265CAA',
      shorts: '#ffffff',
      socks: '#265CAA',
      pattern: 'plain'
    }
  },
  {
    id: 'QAT',
    name: 'Qatar',
    player: 'Almoez Ali',
    accuracy: 74,
    power: 76,
    curve: 72,
    colors: {
      shirt: '#8A1538',
      shorts: '#ffffff',
      socks: '#8A1538',
      pattern: 'plain'
    }
  },
  {
    id: 'SUI',
    name: 'Switzerland',
    player: 'Xherdan Shaqiri',
    accuracy: 86,
    power: 79,
    curve: 80,
    colors: {
      shirt: '#FF0000',
      shorts: '#ffffff',
      socks: '#FF0000',
      pattern: 'plain'
    }
  },
  {
    id: 'HAI',
    name: 'Haiti',
    player: 'Frantzdy Pierrot',
    accuracy: 72,
    power: 74,
    curve: 76,
    colors: {
      shirt: '#0055A4',
      shorts: '#ffffff',
      socks: '#0055A4',
      pattern: 'plain'
    }
  },
  {
    id: 'SCO',
    name: 'Scotland',
    player: 'Che Adams',
    accuracy: 83,
    power: 79,
    curve: 82,
    colors: {
      shirt: '#0066B3',
      shorts: '#ffffff',
      socks: '#0066B3',
      pattern: 'plain'
    }
  },
  {
    id: 'PAR',
    name: 'Paraguay',
    player: 'Miguel Almirón',
    accuracy: 81,
    power: 80,
    curve: 78,
    colors: {
      shirt: '#0038A8',
      shorts: '#ffffff',
      socks: '#0038A8',
      pattern: 'plain'
    }
  },
  {
    id: 'TUR',
    name: 'Turkey',
    player: 'Cengiz Ünder',
    accuracy: 85,
    power: 82,
    curve: 81,
    colors: {
      shirt: '#E30A17',
      shorts: '#ffffff',
      socks: '#E30A17',
      pattern: 'plain'
    }
  },
  {
    id: 'CUW',
    name: 'Curacao',
    player: 'Leandro Bacuna',
    accuracy: 72,
    power: 70,
    curve: 74,
    colors: {
      shirt: '#0072C6',
      shorts: '#FCD116',
      socks: '#0072C6',
      pattern: 'plain'
    }
  },
  {
    id: 'CIV',
    name: 'Ivory Coast',
    player: 'Sébastien Haller',
    accuracy: 84,
    power: 86,
    curve: 78,
    colors: {
      shirt: '#FF7900',
      shorts: '#ffffff',
      socks: '#009B3A',
      pattern: 'plain'
    }
  },
  {
    id: 'ECU',
    name: 'Ecuador',
    player: 'Enner Valencia',
    accuracy: 83,
    power: 84,
    curve: 80,
    colors: {
      shirt: '#FFD100',
      shorts: '#0C4076',
      socks: '#FFD100',
      pattern: 'plain'
    }
  },
  {
    id: 'SWE',
    name: 'Sweden',
    player: 'Alexander Isak',
    accuracy: 88,
    power: 82,
    curve: 85,
    colors: {
      shirt: '#006AA7',
      shorts: '#FECC00',
      socks: '#006AA7',
      pattern: 'plain'
    }
  },
  {
    id: 'TUN',
    name: 'Tunisia',
    player: 'Wahbi Khazri',
    accuracy: 78,
    power: 77,
    curve: 76,
    colors: {
      shirt: '#E70013',
      shorts: '#ffffff',
      socks: '#E70013',
      pattern: 'plain'
    }
  },
  {
    id: 'EGY',
    name: 'Egypt',
    player: 'Mohamed Salah',
    accuracy: 89,
    power: 81,
    curve: 82,
    colors: {
      shirt: '#CE1126',
      shorts: '#ffffff',
      socks: '#CE1126',
      pattern: 'plain'
    }
  },
  {
    id: 'IRN',
    name: 'Iran',
    player: 'Sardar Azmoun',
    accuracy: 84,
    power: 80,
    curve: 79,
    colors: {
      shirt: '#239F40',
      shorts: '#ffffff',
      socks: '#DD0000',
      pattern: 'plain'
    }
  },
  {
    id: 'NZL',
    name: 'New Zealand',
    player: 'Chris Wood',
    accuracy: 76,
    power: 72,
    curve: 74,
    colors: {
      shirt: '#000000',
      shorts: '#000000',
      socks: '#000000',
      pattern: 'plain'
    }
  },
  {
    id: 'CPV',
    name: 'Cabo Verde',
    player: 'Ryan Mendes',
    accuracy: 72,
    power: 70,
    curve: 73,
    colors: {
      shirt: '#0073CF',
      shorts: '#ffffff',
      socks: '#0073CF',
      pattern: 'plain'
    }
  },
  {
    id: 'KSA',
    name: 'Saudi Arabia',
    player: 'Salem Al Dawsari',
    accuracy: 82,
    power: 78,
    curve: 75,
    colors: {
      shirt: '#006C35',
      shorts: '#ffffff',
      socks: '#006C35',
      pattern: 'plain'
    }
  },
  {
    id: 'IRQ',
    name: 'Iraq',
    player: 'Mohanad Ali',
    accuracy: 73,
    power: 71,
    curve: 70,
    colors: {
      shirt: '#007A3D',
      shorts: '#ffffff',
      socks: '#000000',
      pattern: 'plain'
    }
  },
  {
    id: 'NOR',
    name: 'Norway',
    player: 'Erling Haaland',
    accuracy: 93,
    power: 92,
    curve: 86,
    colors: {
      shirt: '#BA0C2F',
      shorts: '#ffffff',
      socks: '#012169',
      pattern: 'plain'
    }
  },
  {
    id: 'ALG',
    name: 'Algeria',
    player: 'Riyad Mahrez',
    accuracy: 87,
    power: 80,
    curve: 82,
    colors: {
      shirt: '#006233',
      shorts: '#ffffff',
      socks: '#006233',
      pattern: 'plain'
    }
  },
  {
    id: 'AUT',
    name: 'Austria',
    player: 'Marko Arnautović',
    accuracy: 82,
    power: 79,
    curve: 81,
    colors: {
      shirt: '#ED2939',
      shorts: '#ffffff',
      socks: '#ED2939',
      pattern: 'plain'
    }
  },
  {
    id: 'JOR',
    name: 'Jordan',
    player: 'Baha Faisal',
    accuracy: 74,
    power: 72,
    curve: 73,
    colors: {
      shirt: '#000000',
      shorts: '#ffffff',
      socks: '#007A3D',
      pattern: 'plain'
    }
  },
  {
    id: 'COD',
    name: 'DR Congo',
    player: 'Dieumerci Mbokani',
    accuracy: 79,
    power: 82,
    curve: 76,
    colors: {
      shirt: '#0F75BC',
      shorts: '#FFD700',
      socks: '#0F75BC',
      pattern: 'plain'
    }
  },
  {
    id: 'UZB',
    name: 'Uzbekistan',
    player: 'Eldor Shomurodov',
    accuracy: 81,
    power: 78,
    curve: 77,
    colors: {
      shirt: '#1EB53A',
      shorts: '#ffffff',
      socks: '#1EB53A',
      pattern: 'plain'
    }
  },
  {
    id: 'GHA',
    name: 'Ghana',
    player: 'André Ayew',
    accuracy: 85,
    power: 81,
    curve: 79,
    colors: {
      shirt: '#FF0000',
      shorts: '#FFD100',
      socks: '#006B3F',
      pattern: 'plain'
    }
  },
  {
    id: 'PAN',
    name: 'Panama',
    player: 'Luis Tejada',
    accuracy: 73,
    power: 70,
    curve: 72,
    colors: {
      shirt: '#ffffff',
      shorts: '#D21034',
      socks: '#ffffff',
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
  MAR: { name: 'Yassine Bounou', reflejos: 90, alcance: 88 },
  JPN: { name: 'Shuichi Gonda', reflejos: 86, alcance: 84 },
  KOR: { name: 'Kim Seung-gyu', reflejos: 88, alcance: 87 },
  SEN: { name: 'Édouard Mendy', reflejos: 91, alcance: 90 },
  AUS: { name: 'Mathew Ryan', reflejos: 87, alcance: 85 },
  ZAF: { name: 'Ronwen Williams', reflejos: 84, alcance: 82 },
  CZE: { name: 'Tomáš Vaclík', reflejos: 86, alcance: 84 },
  CAN: { name: 'Milan Borjan', reflejos: 85, alcance: 84 },
  BIH: { name: 'Ibrahim Šehić', reflejos: 83, alcance: 82 },
  QAT: { name: 'Saad Al Sheeb', reflejos: 80, alcance: 81 },
  SUI: { name: 'Yann Sommer', reflejos: 89, alcance: 88 },
  HAI: { name: 'Johny Placide', reflejos: 82, alcance: 81 },
  SCO: { name: 'Angus Gunn', reflejos: 84, alcance: 83 },
  PAR: { name: 'Anthony Silva', reflejos: 83, alcance: 82 },
  TUR: { name: 'Mert Günok', reflejos: 85, alcance: 84 },
  CUW: { name: 'Eloy Room', reflejos: 80, alcance: 79 },
  CIV: { name: 'Sylvain Gbohouo', reflejos: 87, alcance: 86 },
  ECU: { name: 'Alexander Domínguez', reflejos: 84, alcance: 83 },
  SWE: { name: 'Robin Olsen', reflejos: 86, alcance: 85 },
  TUN: { name: 'Aymen Mathlouthi', reflejos: 83, alcance: 82 },
  EGY: { name: 'Mohamed El Shenawy', reflejos: 88, alcance: 86 },
  IRN: { name: 'Alireza Beiranvand', reflejos: 87, alcance: 86 },
  NZL: { name: 'Stefan Marinovic', reflejos: 81, alcance: 80 },
  CPV: { name: 'Vozinha', reflejos: 80, alcance: 79 },
  KSA: { name: 'Mohammed Al-Owais', reflejos: 85, alcance: 84 },
  IRQ: { name: 'Jalal Hassan', reflejos: 82, alcance: 80 },
  NOR: { name: 'André Hansen', reflejos: 89, alcance: 87 },
  ALG: { name: "Rais M'Bolhi", reflejos: 86, alcance: 85 },
  AUT: { name: 'Patrick Pentz', reflejos: 84, alcance: 83 },
  JOR: { name: 'Amer Shafi', reflejos: 81, alcance: 80 },
  COD: { name: 'Robert Kidiaba', reflejos: 84, alcance: 83 },
  UZB: { name: 'Ignatiy Nesterov', reflejos: 82, alcance: 81 },
  GHA: { name: 'Richard Ofori', reflejos: 85, alcance: 84 },
  PAN: { name: 'Jaime Penedo', reflejos: 82, alcance: 80 }
};
