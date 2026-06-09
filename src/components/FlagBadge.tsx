import React from 'react';

interface FlagBadgeProps {
  teamId: string;
  className?: string;
}

const FLAG_BASE = 'shadow-sm border border-white/10 rounded-sm aspect-[3/2] object-cover';

function Flag({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <svg
      className={`${className ?? ''} ${FLAG_BASE}`}
      viewBox="0 0 30 20"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** FIFA World Cup 2026 — 48 qualified nations */
const FLAGS: Record<string, React.ReactNode> = {
  ARG: (
    <>
      <rect width="30" height="20" fill="#74ACDF" />
      <rect y="6.67" width="30" height="6.66" fill="#ffffff" />
      <circle cx="15" cy="10" r="2.2" fill="#F4B400" />
    </>
  ),
  FRA: (
    <>
      <rect width="10" height="20" fill="#0055A4" />
      <rect x="10" width="10" height="20" fill="#ffffff" />
      <rect x="20" width="10" height="20" fill="#EF4135" />
    </>
  ),
  BRA: (
    <>
      <rect width="30" height="20" fill="#009B3A" />
      <polygon points="15,2 28,10 15,18 2,10" fill="#FFDF00" />
      <circle cx="15" cy="10" r="3.8" fill="#002776" />
    </>
  ),
  POR: (
    <>
      <rect width="12" height="20" fill="#006600" />
      <rect x="12" width="18" height="20" fill="#FF0000" />
      <circle cx="12" cy="10" r="2.5" fill="#FFD700" stroke="#006600" strokeWidth="0.4" />
      <rect x="11.2" y="8.5" width="1.6" height="3" fill="#FF0000" rx="0.2" />
    </>
  ),
  ESP: (
    <>
      <rect width="30" height="5" fill="#AA151B" />
      <rect y="5" width="30" height="10" fill="#F1BF00" />
      <rect y="15" width="30" height="5" fill="#AA151B" />
      <rect x="7" y="7.5" width="4" height="5" fill="#AA151B" rx="0.3" />
    </>
  ),
  GER: (
    <>
      <rect width="30" height="6.67" fill="#000000" />
      <rect y="6.67" width="30" height="6.66" fill="#DD0000" />
      <rect y="13.33" width="30" height="6.67" fill="#FFCC00" />
    </>
  ),
  ENG: (
    <>
      <rect width="30" height="20" fill="#ffffff" />
      <rect x="13" width="4" height="20" fill="#CE1126" />
      <rect y="8" width="30" height="4" fill="#CE1126" />
    </>
  ),
  NED: (
    <>
      <rect width="30" height="6.67" fill="#AE1C28" />
      <rect y="6.67" width="30" height="6.66" fill="#ffffff" />
      <rect y="13.33" width="30" height="6.67" fill="#21468B" />
    </>
  ),
  URU: (
    <>
      <rect width="30" height="20" fill="#ffffff" />
      {[2.2, 6.6, 11, 15.4].map((y) => (
        <rect key={y} y={y} width="30" height="2.2" fill="#4EA9E6" />
      ))}
      <rect width="10" height="10" fill="#ffffff" />
      {[2.2, 6.6].map((y) => (
        <rect key={`c${y}`} y={y} width="10" height="2.2" fill="#4EA9E6" />
      ))}
      <circle cx="5" cy="5" r="2" fill="#FFD700" />
      <circle cx="5" cy="5" r="1.4" fill="#F4B400" />
    </>
  ),
  CRO: (
    <>
      <rect width="30" height="6.67" fill="#FF0000" />
      <rect y="6.67" width="30" height="6.66" fill="#ffffff" />
      <rect y="13.33" width="30" height="6.67" fill="#171796" />
      <rect x="12" y="5.5" width="6" height="9" fill="#FF0000" stroke="#ffffff" strokeWidth="0.5" />
      <rect x="12.8" y="6.3" width="2" height="2" fill="#ffffff" />
      <rect x="15.2" y="6.3" width="2" height="2" fill="#ffffff" />
      <rect x="13.5" y="8.5" width="2" height="2" fill="#ffffff" />
      <rect x="12.8" y="10.7" width="2" height="2" fill="#ffffff" />
      <rect x="15.2" y="10.7" width="2" height="2" fill="#ffffff" />
    </>
  ),
  BEL: (
    <>
      <rect width="10" height="20" fill="#000000" />
      <rect x="10" width="10" height="20" fill="#FDDA24" />
      <rect x="20" width="10" height="20" fill="#EF3340" />
    </>
  ),
  USA: (
    <>
      <rect width="30" height="20" fill="#ffffff" />
      {[0, 2.86, 5.72, 8.58, 11.44, 14.3, 17.16].map((y) => (
        <rect key={y} y={y} width="30" height="1.54" fill="#B31942" />
      ))}
      <rect width="12" height="10.8" fill="#0A3161" />
      {[
        [2, 2], [5, 2], [8, 2], [10.5, 2],
        [3.5, 4.5], [6.5, 4.5], [9.5, 4.5],
        [2, 7], [5, 7], [8, 7], [10.5, 7],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="0.7" fill="#ffffff" />
      ))}
    </>
  ),
  MEX: (
    <>
      <rect width="10" height="20" fill="#006847" />
      <rect x="10" width="10" height="20" fill="#ffffff" />
      <rect x="20" width="10" height="20" fill="#CE1126" />
      <ellipse cx="15" cy="10" rx="2" ry="2.5" fill="#7a5230" />
      <ellipse cx="15" cy="9.5" rx="1.2" ry="1.5" fill="#006847" />
    </>
  ),
  COL: (
    <>
      <rect width="30" height="10" fill="#FCD116" />
      <rect y="10" width="30" height="5" fill="#003893" />
      <rect y="15" width="30" height="5" fill="#CE1126" />
    </>
  ),
  MAR: (
    <>
      <rect width="30" height="20" fill="#C1272D" />
      <polygon
        points="15,6 15.8,8.6 18.5,8.6 16.3,10.2 17.1,12.8 15,11.2 12.9,12.8 13.7,10.2 11.5,8.6 14.2,8.6"
        fill="none"
        stroke="#006233"
        strokeWidth="0.6"
      />
    </>
  ),
  JPN: (
    <>
      <rect width="30" height="20" fill="#ffffff" />
      <circle cx="15" cy="10" r="4" fill="#BC002D" />
    </>
  ),
  KOR: (
    <>
      <rect width="30" height="20" fill="#ffffff" />
      <circle cx="15" cy="10" r="4" fill="#C60C30" />
      <path d="M15 6 A4 4 0 0 0 15 14" fill="#0C2A52" />
      <g fill="#000000">
        <rect x="2" y="2" width="2.5" height="1" /><rect x="2" y="4" width="2.5" height="1" /><rect x="2" y="6" width="2.5" height="1" />
        <rect x="25.5" y="2" width="2.5" height="1" /><rect x="25.5" y="6" width="2.5" height="1" />
        <rect x="5" y="14" width="1" height="2.5" /><rect x="7.5" y="14" width="1" height="2.5" />
        <rect x="21.5" y="14" width="1" height="2.5" /><rect x="24" y="14" width="1" height="2.5" />
      </g>
    </>
  ),
  SEN: (
    <>
      <rect width="10" height="20" fill="#00853F" />
      <rect x="10" width="10" height="20" fill="#FDEF42" />
      <rect x="20" width="10" height="20" fill="#E31B23" />
      <polygon points="15,5 16.2,8.5 19.8,8.5 16.8,10.8 17.8,14.3 15,12 12.2,14.3 13.2,10.8 10.2,8.5 13.8,8.5" fill="#00853F" />
    </>
  ),
  AUS: (
    <>
      <rect width="30" height="20" fill="#012169" />
      <rect width="12" height="6" fill="#ffffff" />
      <rect width="4" height="20" fill="#ffffff" />
      <rect x="1.5" width="1" height="20" fill="#C8102E" />
      <rect y="2.5" width="12" height="1" fill="#C8102E" />
      <polygon points="0,0 3,0 12,9 12,11 3,2" fill="#ffffff" />
      <polygon points="0,20 3,20 12,11 12,9 3,18" fill="#ffffff" />
      <polygon points="0,0 2.5,0 12,8.5 12,9.5 2.5,1" fill="#C8102E" />
      <polygon points="0,20 2.5,20 12,11.5 12,10.5 2.5,19" fill="#C8102E" />
      <polygon points="16,10 15,12 17,12 15.5,13.5 16,15.5 15,14 14,15.5 14.5,13.5 13,12 15,12" fill="#ffffff" />
      <circle cx="22" cy="13" r="1" fill="#ffffff" />
      <circle cx="20" cy="7" r="0.8" fill="#ffffff" />
      <circle cx="24" cy="8" r="0.8" fill="#ffffff" />
      <circle cx="23" cy="16" r="0.8" fill="#ffffff" />
      <circle cx="18" cy="14" r="0.7" fill="#ffffff" />
    </>
  ),
  ZAF: (
    <>
      <rect width="30" height="10" fill="#E03C31" />
      <rect y="10" width="30" height="10" fill="#001489" />
      <polygon points="0,0 14,10 0,20" fill="#007749" />
      <polygon points="0,0 13,10 0,20" fill="#ffffff" />
      <polygon points="0,0 12,10 0,20" fill="#FFB81C" />
      <polygon points="0,0 10.5,10 0,20" fill="#000000" />
    </>
  ),
  CZE: (
    <>
      <rect width="30" height="10" fill="#ffffff" />
      <rect y="10" width="30" height="10" fill="#D7141A" />
      <polygon points="0,0 12,10 0,20" fill="#11457E" />
    </>
  ),
  CAN: (
    <>
      <rect width="10" height="20" fill="#FF0000" />
      <rect x="10" width="10" height="20" fill="#ffffff" />
      <rect x="20" width="10" height="20" fill="#FF0000" />
      <path
        d="M15 4.5 L14.5 7 L12 7.5 L14 9.5 L13.2 12 L15 10.5 L16.8 12 L16 9.5 L18 7.5 L15.5 7 Z"
        fill="#FF0000"
      />
    </>
  ),
  BIH: (
    <>
      <rect width="30" height="20" fill="#002395" />
      <polygon points="0,0 14,10 0,20" fill="#FECB00" />
      <polygon points="1,4 10,10 1,16" fill="#ffffff" />
      <circle cx="5" cy="7" r="0.8" fill="#002395" />
      <circle cx="7" cy="10" r="0.8" fill="#002395" />
      <circle cx="5" cy="13" r="0.8" fill="#002395" />
    </>
  ),
  QAT: (
    <>
      <rect width="11" height="20" fill="#ffffff" />
      <rect x="11" width="19" height="20" fill="#8A1538" />
      <polygon points="11,0 13,2.5 11,5 13,7.5 11,10 13,12.5 11,15 13,17.5 11,20" fill="#ffffff" />
    </>
  ),
  SUI: (
    <>
      <rect width="30" height="20" fill="#FF0000" />
      <rect x="12" width="6" height="20" fill="#ffffff" />
      <rect y="7" width="30" height="6" fill="#ffffff" />
    </>
  ),
  HAI: (
    <>
      <rect width="30" height="10" fill="#00209F" />
      <rect y="10" width="30" height="10" fill="#D21034" />
      <rect x="10" y="4" width="10" height="12" fill="#ffffff" />
      <circle cx="15" cy="9" r="1.5" fill="#00209F" />
      <rect x="14" y="11" width="2" height="3" fill="#016A16" />
    </>
  ),
  SCO: (
    <>
      <rect width="30" height="20" fill="#0065BD" />
      <polygon points="0,0 4,0 15,11 26,0 30,0 17,13 30,20 26,20 15,9 4,20 0,20 13,13" fill="#ffffff" />
    </>
  ),
  PAR: (
    <>
      <rect width="30" height="6.67" fill="#0038A8" />
      <rect y="6.67" width="30" height="6.66" fill="#ffffff" />
      <rect y="13.33" width="30" height="6.67" fill="#D52B1E" />
      <circle cx="15" cy="10" r="2.5" fill="#ffffff" stroke="#0038A8" strokeWidth="0.4" />
      <circle cx="15" cy="10" r="1.5" fill="#0038A8" opacity="0.3" />
    </>
  ),
  TUR: (
    <>
      <rect width="30" height="20" fill="#E30A17" />
      <circle cx="12" cy="10" r="4" fill="#ffffff" />
      <circle cx="13.5" cy="10" r="3.2" fill="#E30A17" />
      <polygon points="18,7 18,13 22,10" fill="#ffffff" />
    </>
  ),
  CUW: (
    <>
      <rect width="30" height="20" fill="#002B7F" />
      <rect y="14" width="30" height="2" fill="#ffffff" />
      <rect y="16" width="30" height="2" fill="#F9E814" />
      <circle cx="6" cy="6" r="1.2" fill="#ffffff" />
      <circle cx="8.5" cy="4" r="0.9" fill="#ffffff" />
      <circle cx="8.5" cy="8" r="0.9" fill="#ffffff" />
      <circle cx="11" cy="6" r="0.9" fill="#ffffff" />
    </>
  ),
  CIV: (
    <>
      <rect width="10" height="20" fill="#F77F00" />
      <rect x="10" width="10" height="20" fill="#ffffff" />
      <rect x="20" width="10" height="20" fill="#009E60" />
    </>
  ),
  ECU: (
    <>
      <rect width="30" height="8" fill="#FFD100" />
      <rect y="8" width="30" height="6" fill="#003893" />
      <rect y="14" width="30" height="6" fill="#CE1126" />
    </>
  ),
  SWE: (
    <>
      <rect width="30" height="20" fill="#006AA7" />
      <rect x="9" width="3" height="20" fill="#FECC00" />
      <rect y="7" width="30" height="3" fill="#FECC00" />
    </>
  ),
  TUN: (
    <>
      <rect width="30" height="20" fill="#E70013" />
      <circle cx="15" cy="10" r="5" fill="#ffffff" />
      <circle cx="16" cy="10" r="4" fill="#E70013" />
      <polygon points="15,7 15.6,8.8 17.5,8.8 15.9,10 16.5,11.8 15,10.6 13.5,11.8 14.1,10 12.5,8.8 14.4,8.8" fill="#E70013" />
    </>
  ),
  EGY: (
    <>
      <rect width="30" height="6.67" fill="#CE1126" />
      <rect y="6.67" width="30" height="6.66" fill="#ffffff" />
      <rect y="13.33" width="30" height="6.67" fill="#000000" />
      <rect x="13" y="8" width="4" height="4" fill="#C09300" rx="0.3" />
    </>
  ),
  IRN: (
    <>
      <rect width="30" height="6.67" fill="#239F40" />
      <rect y="6.67" width="30" height="6.66" fill="#ffffff" />
      <rect y="13.33" width="30" height="6.67" fill="#DA0000" />
      <rect x="14" y="8.5" width="2" height="5" fill="#239F40" />
    </>
  ),
  NZL: (
    <>
      <rect width="30" height="20" fill="#00247D" />
      <rect width="12" height="6" fill="#ffffff" />
      <rect width="4" height="20" fill="#ffffff" />
      <rect x="1.5" width="1" height="20" fill="#CC142B" />
      <rect y="2.5" width="12" height="1" fill="#CC142B" />
      <polygon points="20,4 21,3 22,4 21.5,5.5 23,6.5 21,6 20,7.5 19,6 17,6.5 18.5,5.5" fill="#ffffff" />
      <polygon points="24,12 25,11 26,12 25.5,13.5 27,14.5 25,14 24,15.5 23,14 21,14.5 22.5,13.5" fill="#CC142B" />
      <polygon points="18,15 19,14 20,15 19.5,16.5 21,17.5 19,17 18,18.5 17,17 15,17.5 16.5,16.5" fill="#ffffff" />
    </>
  ),
  CPV: (
    <>
      <rect width="30" height="20" fill="#003893" />
      <rect y="9" width="30" height="2" fill="#ffffff" />
      <rect y="11" width="30" height="1.5" fill="#CF2027" />
      <circle cx="6" cy="5" r="1.5" fill="#F7D116" />
      <circle cx="8.5" cy="3" r="1" fill="#F7D116" />
      <circle cx="8.5" cy="7" r="1" fill="#F7D116" />
      <circle cx="11" cy="5" r="1" fill="#F7D116" />
      <circle cx="10" cy="2.5" r="0.8" fill="#F7D116" />
    </>
  ),
  KSA: (
    <>
      <rect width="30" height="20" fill="#006C35" />
      <rect x="5" y="8" width="20" height="4" fill="#ffffff" rx="0.5" />
      <path d="M8 10 L22 10" stroke="#006C35" strokeWidth="0.8" />
      <path d="M20 9.5 L22 10 L20 10.5" fill="#006C35" />
    </>
  ),
  IRQ: (
    <>
      <rect width="30" height="6.67" fill="#CE1126" />
      <rect y="6.67" width="30" height="6.66" fill="#ffffff" />
      <rect y="13.33" width="30" height="6.67" fill="#000000" />
      <rect x="13" y="8" width="4" height="4" fill="#007A3D" rx="0.3" />
    </>
  ),
  NOR: (
    <>
      <rect width="30" height="20" fill="#BA0C2F" />
      <rect x="10.5" width="3" height="20" fill="#ffffff" />
      <rect y="7.5" width="30" height="5" fill="#ffffff" />
      <rect x="11.75" width="1.5" height="20" fill="#00205B" />
      <rect y="8.75" width="30" height="2.5" fill="#00205B" />
    </>
  ),
  ALG: (
    <>
      <rect width="15" height="20" fill="#006233" />
      <rect x="15" width="15" height="20" fill="#ffffff" />
      <circle cx="14" cy="10" r="4" fill="#D21034" />
      <polygon points="12,10 14,10.5 13.5,12.5 12,11.5 10.5,12.5 10,10.5" fill="#ffffff" />
    </>
  ),
  AUT: (
    <>
      <rect width="30" height="6.67" fill="#ED2939" />
      <rect y="6.67" width="30" height="6.66" fill="#ffffff" />
      <rect y="13.33" width="30" height="6.67" fill="#ED2939" />
    </>
  ),
  JOR: (
    <>
      <rect width="30" height="6.67" fill="#000000" />
      <rect y="6.67" width="30" height="6.66" fill="#ffffff" />
      <rect y="13.33" width="30" height="6.67" fill="#007A3D" />
      <polygon points="0,0 12,10 0,20" fill="#CE1126" />
      <polygon points="0,0 10.5,10 0,20" fill="#ffffff" />
      <polygon points="0,0 9.5,10 0,20" fill="#007A3D" />
      <circle cx="5" cy="10" r="1.2" fill="#CE1126" />
    </>
  ),
  COD: (
    <>
      <rect width="30" height="20" fill="#007FFF" />
      <polygon points="0,0 30,20 0,20" fill="#F7D618" />
      <polygon points="0,0 30,20 30,0" fill="#007FFF" />
      <polygon points="0,2 27,17 0,17" fill="#CE1026" />
    </>
  ),
  UZB: (
    <>
      <rect width="30" height="6.67" fill="#1EB53A" />
      <rect y="6.67" width="30" height="6.66" fill="#ffffff" />
      <rect y="13.33" width="30" height="6.67" fill="#0099B5" />
      <rect y="9.5" width="30" height="1" fill="#CE1126" />
      <rect y="10.5" width="30" height="1" fill="#CE1126" />
      <circle cx="4" cy="7" r="1.2" fill="#ffffff" />
      <circle cx="6" cy="6" r="0.5" fill="#ffffff" />
      <circle cx="7.5" cy="7.5" r="0.5" fill="#ffffff" />
      <circle cx="6" cy="8.5" r="0.5" fill="#ffffff" />
      <circle cx="4.5" cy="8" r="0.5" fill="#ffffff" />
    </>
  ),
  GHA: (
    <>
      <rect width="30" height="6.67" fill="#CE1126" />
      <rect y="6.67" width="30" height="6.66" fill="#FCD116" />
      <rect y="13.33" width="30" height="6.67" fill="#006B3F" />
      <polygon points="15,7.5 16.5,11 20,11 17,13.2 18,16.8 15,14.5 12,16.8 13,13.2 10,11 13.5,11" fill="#000000" />
    </>
  ),
  PAN: (
    <>
      <rect width="15" height="10" fill="#ffffff" />
      <rect x="15" width="15" height="10" fill="#DA121A" />
      <rect y="10" width="15" height="10" fill="#005293" />
      <rect x="15" y="10" width="15" height="10" fill="#ffffff" />
      <polygon points="4,3 4.5,5 6.5,5 4.8,6.2 5.3,8 4,6.8 2.7,8 3.2,6.2 1.5,5 3.5,5" fill="#005293" />
      <polygon points="19,13 19.5,15 21.5,15 19.8,16.2 20.3,18 19,16.8 17.7,18 18.2,16.2 16.5,15 18.5,15" fill="#DA121A" />
    </>
  ),
};

export function FlagBadge({ teamId, className = 'w-6 h-4' }: FlagBadgeProps) {
  const flag = FLAGS[teamId];
  if (!flag) {
    return <div className={`${className} bg-slate-500 rounded-sm aspect-[3/2]`} />;
  }
  return <Flag className={className}>{flag}</Flag>;
}
