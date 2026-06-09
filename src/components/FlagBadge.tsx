import React from 'react';

interface FlagBadgeProps {
  teamId: string;
  className?: string;
}

export function FlagBadge({ teamId, className = "w-6 h-4" }: FlagBadgeProps) {
  switch (teamId) {
    case 'ARG':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="2" fill="#74ACDF" />
          <rect y="0.67" width="3" height="0.66" fill="#ffffff" />
          <circle cx="1.5" cy="1" r="0.18" fill="#F4B400" />
        </svg>
      );
    case 'FRA':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="1" height="2" fill="#0055A5" />
          <rect x="1" width="1" height="2" fill="#ffffff" />
          <rect x="2" width="1" height="2" fill="#EF4135" />
        </svg>
      );
    case 'BRA':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 220 154">
          <rect width="220" height="154" fill="#009B3A" />
          <polygon points="110,14 203,77 110,140 17,77" fill="#FFDF00" />
          <circle cx="110" cy="77" r="31" fill="#002776" />
        </svg>
      );
    case 'POR':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="1.2" height="2" fill="#006600" />
          <rect x="1.2" width="1.8" height="2" fill="#FF0000" />
          <circle cx="1.2" cy="1" r="0.25" fill="#FFD700" />
        </svg>
      );
    case 'ESP':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="0.5" fill="#C4151C" />
          <rect y="0.5" width="3" height="1" fill="#F1BF00" />
          <rect y="1.5" width="3" height="0.5" fill="#C4151C" />
          <circle cx="0.8" cy="1" r="0.18" fill="#C4151C" opacity="0.85" />
        </svg>
      );
    case 'GER':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 5 3">
          <rect width="5" height="1" fill="#000000" />
          <rect y="1" width="5" height="1" fill="#FF0000" />
          <rect y="2" width="5" height="1" fill="#FFCC00" />
        </svg>
      );
    case 'ENG':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 5 3">
          <rect width="5" height="3" fill="#ffffff" />
          <rect x="2.1" width="0.8" height="3" fill="#CE1126" />
          <rect y="1.1" width="5" height="0.8" fill="#CE1126" />
        </svg>
      );
    case 'NED':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="0.67" fill="#AE1C28" />
          <rect y="0.67" width="3" height="0.66" fill="#ffffff" />
          <rect y="1.33" width="3" height="0.67" fill="#21468B" />
        </svg>
      );
    case 'URU':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="2" fill="#ffffff" />
          <rect y="0.22" width="3" height="0.22" fill="#4EA9E6" />
          <rect y="0.66" width="3" height="0.22" fill="#4EA9E6" />
          <rect y="1.1" width="3" height="0.22" fill="#4EA9E6" />
          <rect y="1.54" width="3" height="0.22" fill="#4EA9E6" />
          <rect width="1" height="1" fill="#ffffff" />
          <rect y="0.22" width="1" height="0.22" fill="#4EA9E6" />
          <rect y="0.66" width="1" height="0.22" fill="#4EA9E6" />
          <circle cx="0.5" cy="0.5" r="0.2" fill="#FFD700" />
        </svg>
      );
    case 'CRO':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="0.67" fill="#FF0000" />
          <rect y="0.67" width="3" height="0.66" fill="#ffffff" />
          <rect y="1.33" width="3" height="0.67" fill="#171796" />
          <rect x="1.35" y="0.67" width="0.3" height="0.33" fill="#FF0000" />
          <rect x="1.42" y="0.67" width="0.08" height="0.08" fill="#ffffff" />
          <rect x="1.42" y="0.83" width="0.08" height="0.08" fill="#ffffff" />
          <rect x="1.5" y="0.75" width="0.08" height="0.08" fill="#ffffff" />
        </svg>
      );
    case 'BEL':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="1" height="2" fill="#000000" />
          <rect x="1" width="1" height="2" fill="#FDDA24" />
          <rect x="2" width="1" height="2" fill="#EF3340" />
        </svg>
      );
    case 'USA':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 19 10">
          <rect width="19" height="10" fill="#ffffff" />
          <rect y="0" width="19" height="0.77" fill="#B31942" />
          <rect y="1.54" width="19" height="0.77" fill="#B31942" />
          <rect y="3.08" width="19" height="0.77" fill="#B31942" />
          <rect y="4.62" width="19" height="0.77" fill="#B31942" />
          <rect y="6.15" width="19" height="0.77" fill="#B31942" />
          <rect y="7.69" width="19" height="0.77" fill="#B31942" />
          <rect y="9.23" width="19" height="0.77" fill="#B31942" />
          <rect width="7.6" height="5.38" fill="#0A3161" />
          <g fill="#ffffff">
            <circle cx="1.3" cy="1.1" r="0.34" />
            <circle cx="3.1" cy="1.1" r="0.34" />
            <circle cx="4.9" cy="1.1" r="0.34" />
            <circle cx="6.5" cy="1.1" r="0.34" />
            <circle cx="2.2" cy="2.6" r="0.34" />
            <circle cx="4.0" cy="2.6" r="0.34" />
            <circle cx="5.7" cy="2.6" r="0.34" />
            <circle cx="1.3" cy="4.1" r="0.34" />
            <circle cx="3.1" cy="4.1" r="0.34" />
            <circle cx="4.9" cy="4.1" r="0.34" />
            <circle cx="6.5" cy="4.1" r="0.34" />
          </g>
        </svg>
      );
    case 'MEX':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="1" height="2" fill="#006847" />
          <rect x="1" width="1" height="2" fill="#ffffff" />
          <rect x="2" width="1" height="2" fill="#CE1126" />
          <circle cx="1.5" cy="1" r="0.2" fill="#7a5230" />
        </svg>
      );
    case 'ITA':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="1" height="2" fill="#008C45" />
          <rect x="1" width="1" height="2" fill="#ffffff" />
          <rect x="2" width="1" height="2" fill="#CD212A" />
        </svg>
      );
    case 'COL':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 4 2">
          <rect width="4" height="1" fill="#FCD116" />
          <rect y="1" width="4" height="0.5" fill="#003893" />
          <rect y="1.5" width="4" height="0.5" fill="#CE1126" />
        </svg>
      );
    case 'MAR':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="2" fill="#C1272D" />
          <polygon
            points="1.5,0.66 1.579,0.891 1.823,0.895 1.628,1.042 1.7,1.275 1.5,1.135 1.3,1.275 1.372,1.042 1.177,0.895 1.421,0.891"
            fill="none"
            stroke="#006233"
            strokeWidth="0.07"
          />
        </svg>
      );
    case 'JPN':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="2" fill="#ffffff" />
          <circle cx="1.5" cy="1" r="0.35" fill="#BC002D" />
        </svg>
      );
    case 'KOR':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="2" fill="#ffffff" />
          <circle cx="1.5" cy="1" r="0.35" fill="#C60C30" />
          <path d="M1.5 0.65 A0.35 0.35 0 0 0 1.5 1.35" fill="#0C2A52" />
          <g fill="#000000">
            <rect x="0.18" y="0.18" width="0.18" height="0.08" />
            <rect x="0.18" y="0.32" width="0.18" height="0.08" />
            <rect x="0.18" y="0.46" width="0.18" height="0.08" />
            <rect x="2.64" y="0.18" width="0.18" height="0.08" />
            <rect x="2.64" y="0.46" width="0.18" height="0.08" />
            <rect x="0.45" y="1.2" width="0.08" height="0.18" />
            <rect x="0.65" y="1.2" width="0.08" height="0.18" />
            <rect x="2.4" y="1.2" width="0.08" height="0.18" />
            <rect x="2.6" y="1.2" width="0.08" height="0.18" />
          </g>
        </svg>
      );
    case 'SEN':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="1" height="2" fill="#009E60" />
          <rect x="1" width="1" height="2" fill="#FDEF00" />
          <rect x="2" width="1" height="2" fill="#CE1126" />
          <polygon
            points="1.5,0.4 1.62,0.86 2.1,0.86 1.68,1.16 1.78,1.62 1.5,1.34 1.22,1.62 1.32,1.16 0.9,0.86 1.38,0.86"
            fill="#009E60"
          />
        </svg>
      );
    case 'AUS':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="2" fill="#00247D" />
          <g>
            <rect width="1.2" height="0.4" x="0" y="0.8" fill="#ffffff" />
            <rect width="0.4" height="2" x="0.4" y="0" fill="#ffffff" />
            <rect width="0.2" height="2" x="0.5" y="0" fill="#CF142B" />
            <rect width="1.2" height="0.2" x="0" y="0.9" fill="#CF142B" />
            <g fill="#ffffff">
              <polygon points="0,0 0.4,0 1.2,1 1.2,1.2 0.2,0.2" />
              <polygon points="0,2 0.4,2 1.2,1 1.2,0.8 0.2,1.8" />
            </g>
            <g fill="#CF142B">
              <polygon points="0,0 0.3,0 1.2,0.9 1.2,1.1 0.3,0.1" />
              <polygon points="0,2 0.3,2 1.2,1.1 1.2,0.9 0.3,1.9" />
            </g>
          </g>
          <polygon points="1.6,1 1.5,1.2 1.7,1.2 1.55,1.35 1.6,1.55 1.5,1.4 1.4,1.55 1.45,1.35 1.3,1.2 1.5,1.2" fill="#FFB81C" />
          <circle cx="2.3" cy="1.3" r="0.08" fill="#FFB81C" />
          <circle cx="2.0" cy="0.7" r="0.06" fill="#FFB81C" />
          <circle cx="2.5" cy="0.8" r="0.06" fill="#FFB81C" />
          <circle cx="2.3" cy="1.7" r="0.06" fill="#FFB81C" />
        </svg>
      );
    case 'ZAF':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="2" fill="#00663E" />
          <polygon points="0,0 1.2,1 0,2" fill="#FFD700" />
          <rect x="1.2" width="1.8" height="2" fill="#FF0000" />
          <path d="M0,0 L1.2,1 L0,2" fill="#000000" />
        </svg>
      );
    case 'CZE':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="1" fill="#ffffff" />
          <rect y="1" width="3" height="1" fill="#D7141A" />
          <polygon points="0,0 1.2,1 0,2" fill="#21468B" />
        </svg>
      );
    case 'CAN':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="1" height="2" fill="#FF0000" />
          <rect x="1" width="1" height="2" fill="#ffffff" />
          <rect x="2" width="1" height="2" fill="#FF0000" />
          <polygon points="1.5,0.35 1.45,0.55 1.6,0.55 1.4,0.85 1.55,0.85 1.35,1.15 1.6,1.15 1.5,1.4 1.4,1.15 1.65,1.15 1.45,0.85 1.6,0.85 1.4,0.55 1.55,0.55" fill="#FF0000" />
        </svg>
      );
    case 'BIH':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="2" fill="#265CAA" />
          <polygon points="0,0 1.2,1 0,2" fill="#FCD116" />
          <polygon points="0.1,0.5 0.9,1 0.1,1.5" fill="#ffffff" />
        </svg>
      );
    case 'QAT':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="1.1" height="2" fill="#ffffff" />
          <rect x="1.1" width="1.9" height="2" fill="#8A1538" />
          <polygon points="1.1,0 1.25,0.25 1.1,0.5 1.25,0.75 1.1,1 1.25,1.25 1.1,1.5 1.25,1.75 1.1,2" fill="#ffffff" />
        </svg>
      );
    case 'SUI':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="2" fill="#FF0000" />
          <rect x="1.1" width="0.8" height="2" fill="#ffffff" />
          <rect y="0.6" width="3" height="0.8" fill="#ffffff" />
        </svg>
      );
    case 'HAI':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="1" fill="#0055A4" />
          <rect y="1" width="3" height="1" fill="#ffffff" />
          <rect y="2" width="3" height="0" fill="#ff0000" />
        </svg>
      );
    case 'SCO':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="2" fill="#0066B3" />
          <polygon points="0,0 0.4,0 1.5,0.9 2.6,0 3,0 1.5,1.1" fill="#ffffff" />
          <polygon points="0,2 0.4,2 1.5,1.1 2.6,2 3,2 1.5,0.9" fill="#ffffff" />
          <polygon points="0,0 0,0.4 1.1,1 0,1.6 0,2 0.4,2 1.5,1.1 2.6,2 3,2 3,1.6 1.9,1 3,0.4 3,0 2.6,0 1.5,0.9" fill="#ffffff" />
        </svg>
      );
    case 'PAR':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="0.66" fill="#0038A8" />
          <rect y="0.66" width="3" height="0.68" fill="#ffffff" />
          <rect y="1.34" width="3" height="0.66" fill="#D21034" />
          <circle cx="1.5" cy="1" r="0.25" fill="#ffffff" />
        </svg>
      );
    case 'TUR':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="2" fill="#E30A17" />
          <circle cx="1.2" cy="1" r="0.3" fill="#ffffff" />
          <polygon points="1.5,0.75 1.5,1.25 1.9,1 1.5,0.75" fill="#E30A17" />
          <polygon points="1.3,0.9 1.55,1.05 1.3,1.2 1.45,1 1.3,0.9" fill="#ffffff" />
        </svg>
      );
    case 'CUW':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="2" fill="#0072C6" />
          <rect y="1.2" width="3" height="0.25" fill="#ffffff" />
          <rect y="1.45" width="3" height="0.15" fill="#FFCC00" />
          <circle cx="0.7" cy="0.6" r="0.12" fill="#FFCC00" />
          <circle cx="0.9" cy="0.35" r="0.08" fill="#FFCC00" />
          <circle cx="0.9" cy="0.85" r="0.08" fill="#FFCC00" />
        </svg>
      );
    case 'CIV':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="1" height="2" fill="#FF7900" />
          <rect x="1" width="1" height="2" fill="#ffffff" />
          <rect x="2" width="1" height="2" fill="#009B3A" />
        </svg>
      );
    case 'ECU':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 4 2">
          <rect width="4" height="0.8" fill="#FFD100" />
          <rect y="0.8" width="4" height="0.6" fill="#003893" />
          <rect y="1.4" width="4" height="0.6" fill="#CE1126" />
        </svg>
      );
    case 'SWE':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="2" fill="#006AA7" />
          <rect x="0.9" width="0.3" height="2" fill="#FECC00" />
          <rect y="0.7" width="3" height="0.3" fill="#FECC00" />
        </svg>
      );
    case 'TUN':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="2" fill="#E70013" />
          <circle cx="1.5" cy="1" r="0.5" fill="#ffffff" />
          <circle cx="1.5" cy="1" r="0.25" fill="#E70013" />
        </svg>
      );
    case 'EGY':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="0.66" fill="#CE1126" />
          <rect y="0.66" width="3" height="0.66" fill="#ffffff" />
          <rect y="1.33" width="3" height="0.67" fill="#000000" />
        </svg>
      );
    case 'IRN':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="0.66" fill="#239F40" />
          <rect y="0.66" width="3" height="0.66" fill="#ffffff" />
          <rect y="1.33" width="3" height="0.67" fill="#DD0000" />
        </svg>
      );
    case 'NZL':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="2" fill="#00247D" />
          <rect width="1.2" height="0.4" fill="#ffffff" />
          <rect width="0.4" height="2" fill="#ffffff" />
          <rect x="0.4" width="0.2" height="2" fill="#CF142B" />
          <polygon points="2.0,0.5 2.1,0.4 2.2,0.5 2.15,0.7 2.3,0.8 2.1,0.75 2,0.9 1.9,0.75 1.7,0.8 1.85,0.7" fill="#ffffff" />
        </svg>
      );
    case 'CPV':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="2" fill="#0073CF" />
          <rect y="0.9" width="3" height="0.18" fill="#ffffff" />
          <rect y="1.1" width="3" height="0.1" fill="#FF0000" />
          <circle cx="0.6" cy="0.5" r="0.12" fill="#FFD700" />
          <circle cx="0.8" cy="0.3" r="0.06" fill="#FFD700" />
          <circle cx="0.8" cy="0.7" r="0.06" fill="#FFD700" />
        </svg>
      );
    case 'KSA':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="2" fill="#006C35" />
          <path d="M0.4,1 L2.6,1 C2.4,0.8 2.1,0.7 1.8,0.7 C1.5,0.7 1.2,0.8 1,1 C0.8,0.8 0.5,0.7 0.2,0.7 C0.1,0.85 0.2,0.95 0.4,1" fill="#ffffff" />
        </svg>
      );
    case 'IRQ':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="0.66" fill="#CE1126" />
          <rect y="0.66" width="3" height="0.66" fill="#ffffff" />
          <rect y="1.33" width="3" height="0.67" fill="#000000" />
        </svg>
      );
    case 'NOR':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="2" fill="#BA0C2F" />
          <rect x="1.05" width="0.3" height="2" fill="#ffffff" />
          <rect y="0.75" width="3" height="0.5" fill="#ffffff" />
          <rect x="1.175" width="0.15" height="2" fill="#012169" />
          <rect y="0.85" width="3" height="0.3" fill="#012169" />
        </svg>
      );
    case 'ALG':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="1.5" height="2" fill="#006233" />
          <rect x="1.5" width="1.5" height="2" fill="#ffffff" />
          <circle cx="1.35" cy="1" r="0.35" fill="#ff0000" />
          <polygon points="1.2,1 1.4,1.05 1.35,1.2 1.3,1.05 1.2,1" fill="#ffffff" />
        </svg>
      );
    case 'AUT':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="0.67" fill="#ED2939" />
          <rect y="0.67" width="3" height="0.66" fill="#ffffff" />
          <rect y="1.33" width="3" height="0.67" fill="#ED2939" />
        </svg>
      );
    case 'JOR':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="0.66" fill="#000000" />
          <rect y="0.66" width="3" height="0.66" fill="#ffffff" />
          <rect y="1.33" width="3" height="0.67" fill="#007A3D" />
          <polygon points="0,0 1.2,1 0,2" fill="#D21034" />
        </svg>
      );
    case 'COD':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="2" fill="#0F75BC" />
          <rect x="0.2" y="0.2" width="2.6" height="1.6" fill="#FFD700" transform="rotate(-12 1.5 1)" />
          <polygon points="2.6,0.2 2.8,0.2 2.2,1 2.8,1.8 2.6,1.8 2.2,1" fill="#009B3A" />
        </svg>
      );
    case 'UZB':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="0.67" fill="#1EB53A" />
          <rect y="0.67" width="3" height="0.66" fill="#ffffff" />
          <rect y="1.33" width="3" height="0.67" fill="#1EB53A" />
          <rect y="1" width="3" height="0.06" fill="#DD0000" />
          <circle cx="0.4" cy="0.7" r="0.1" fill="#ffffff" />
          <polygon points="0.51,0.66 0.68,0.7 0.51,0.74 0.53,0.7" fill="#ffffff" />
        </svg>
      );
    case 'GHA':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="3" height="0.67" fill="#FF0000" />
          <rect y="0.67" width="3" height="0.66" fill="#FFD100" />
          <rect y="1.33" width="3" height="0.67" fill="#006B3F" />
          <polygon points="1.5,0.65 1.65,1.1 2.1,1.1 1.7,1.35 1.85,1.8 1.5,1.5 1.15,1.8 1.3,1.35 0.9,1.1 1.35,1.1" fill="#000000" />
        </svg>
      );
    case 'PAN':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} preserveAspectRatio="none" viewBox="0 0 3 2">
          <rect width="1.5" height="1" fill="#ffffff" />
          <rect x="1.5" width="1.5" height="1" fill="#D21034" />
          <rect y="1" width="1.5" height="1" fill="#00529B" />
          <rect x="1.5" y="1" width="1.5" height="1" fill="#ffffff" />
          <polygon points="0.45,0.25 0.5,0.4 0.65,0.4 0.52,0.5 0.57,0.65 0.45,0.55 0.33,0.65 0.38,0.5 0.25,0.4 0.4,0.4" fill="#00529B" />
          <polygon points="2.05,1.25 2.1,1.4 2.25,1.4 2.12,1.5 2.17,1.65 2.05,1.55 1.93,1.65 1.98,1.5 1.85,1.4 2.0,1.4" fill="#D21034" />
        </svg>
      );
    default:
      return <div className={`${className} bg-slate-500 rounded-sm`} />;
  }
}
