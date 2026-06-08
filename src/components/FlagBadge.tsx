import React from 'react';

interface FlagBadgeProps {
  teamId: string;
  className?: string;
}

export function FlagBadge({ teamId, className = "w-6 h-4" }: FlagBadgeProps) {
  switch (teamId) {
    case 'ARG':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} viewBox="0 0 3 2">
          <rect width="3" height="2" fill="#74ACDF" />
          <rect y="0.67" width="3" height="0.66" fill="#ffffff" />
          <circle cx="1.5" cy="1" r="0.18" fill="#F4B400" />
        </svg>
      );
    case 'FRA':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} viewBox="0 0 3 2">
          <rect width="1" height="2" fill="#0055A5" />
          <rect x="1" width="1" height="2" fill="#ffffff" />
          <rect x="2" width="1" height="2" fill="#EF4135" />
        </svg>
      );
    case 'BRA':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} viewBox="0 0 220 154">
          <rect width="220" height="154" fill="#009B3A" />
          <polygon points="110,14 203,77 110,140 17,77" fill="#FFDF00" />
          <circle cx="110" cy="77" r="31" fill="#002776" />
        </svg>
      );
    case 'POR':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} viewBox="0 0 3 2">
          <rect width="1.2" height="2" fill="#006600" />
          <rect x="1.2" width="1.8" height="2" fill="#FF0000" />
          <circle cx="1.2" cy="1" r="0.25" fill="#FFD700" />
        </svg>
      );
    case 'ESP':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} viewBox="0 0 3 2">
          <rect width="3" height="0.5" fill="#C4151C" />
          <rect y="0.5" width="3" height="1" fill="#F1BF00" />
          <rect y="1.5" width="3" height="0.5" fill="#C4151C" />
          <circle cx="0.8" cy="1" r="0.18" fill="#C4151C" opacity="0.85" />
        </svg>
      );
    case 'GER':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} viewBox="0 0 5 3">
          <rect width="5" height="1" fill="#000000" />
          <rect y="1" width="5" height="1" fill="#FF0000" />
          <rect y="2" width="5" height="1" fill="#FFCC00" />
        </svg>
      );
    case 'ENG':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} viewBox="0 0 5 3">
          <rect width="5" height="3" fill="#ffffff" />
          <rect x="2.1" width="0.8" height="3" fill="#CE1126" />
          <rect y="1.1" width="5" height="0.8" fill="#CE1126" />
        </svg>
      );
    case 'NED':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} viewBox="0 0 3 2">
          <rect width="3" height="0.67" fill="#AE1C28" />
          <rect y="0.67" width="3" height="0.66" fill="#ffffff" />
          <rect y="1.33" width="3" height="0.67" fill="#21468B" />
        </svg>
      );
    case 'URU':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} viewBox="0 0 3 2">
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
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} viewBox="0 0 3 2">
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
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} viewBox="0 0 3 2">
          <rect width="1" height="2" fill="#000000" />
          <rect x="1" width="1" height="2" fill="#FDDA24" />
          <rect x="2" width="1" height="2" fill="#EF3340" />
        </svg>
      );
    case 'USA':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} viewBox="0 0 19 10">
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
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} viewBox="0 0 3 2">
          <rect width="1" height="2" fill="#006847" />
          <rect x="1" width="1" height="2" fill="#ffffff" />
          <rect x="2" width="1" height="2" fill="#CE1126" />
          <circle cx="1.5" cy="1" r="0.2" fill="#7a5230" />
        </svg>
      );
    case 'ITA':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} viewBox="0 0 3 2">
          <rect width="1" height="2" fill="#008C45" />
          <rect x="1" width="1" height="2" fill="#ffffff" />
          <rect x="2" width="1" height="2" fill="#CD212A" />
        </svg>
      );
    case 'COL':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} viewBox="0 0 4 2">
          <rect width="4" height="1" fill="#FCD116" />
          <rect y="1" width="4" height="0.5" fill="#003893" />
          <rect y="1.5" width="4" height="0.5" fill="#CE1126" />
        </svg>
      );
    case 'MAR':
      return (
        <svg className={`${className} shadow-sm border border-white/10 rounded-sm`} viewBox="0 0 3 2">
          <rect width="3" height="2" fill="#C1272D" />
          <polygon
            points="1.5,0.66 1.579,0.891 1.823,0.895 1.628,1.042 1.7,1.275 1.5,1.135 1.3,1.275 1.372,1.042 1.177,0.895 1.421,0.891"
            fill="none"
            stroke="#006233"
            strokeWidth="0.07"
          />
        </svg>
      );
    default:
      return <div className={`${className} bg-slate-500 rounded-sm`} />;
  }
}
