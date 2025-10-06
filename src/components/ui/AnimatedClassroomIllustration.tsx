import React from 'react';

const AnimatedClassroomIllustration: React.FC = () => {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg 
        width="400" 
        height="320" 
        viewBox="0 0 400 320" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-lg"
      >
        <defs>
          {/* Simple gradients */}
          <linearGradient id="laptopGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
          </linearGradient>
          
          <linearGradient id="screenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
          </linearGradient>
          
          <linearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
          </linearGradient>
        </defs>

        {/* Laptop base */}
        <path 
          d="M70 230 L330 230 L350 250 L50 250 Z" 
          fill="url(#laptopGradient)" 
          stroke="rgba(255,255,255,0.3)" 
          strokeWidth="1"
        />
        
        {/* Laptop screen */}
        <rect 
          x="90" 
          y="70" 
          width="220" 
          height="160" 
          rx="12" 
          fill="url(#screenGradient)" 
          stroke="rgba(255,255,255,0.4)" 
          strokeWidth="2"
        />
        
        {/* Screen content */}
        <rect 
          x="100" 
          y="80" 
          width="200" 
          height="140" 
          rx="8" 
          fill="rgba(255,255,255,0.1)"
        />

        {/* Screen header */}
        <rect x="110" y="90" width="180" height="10" rx="5" fill="rgba(255,255,255,0.3)" />
        <text x="115" y="98" fontSize="7" fill="rgba(255,255,255,0.6)">ClassRoom Dashboard</text>
        
        {/* Content cards */}
        <rect x="110" y="110" width="50" height="35" rx="6" fill="url(#cardGradient)" />
        <text x="135" y="125" fontSize="10" fill="rgba(255,255,255,0.7)">👥</text>
        <text x="120" y="140" fontSize="5" fill="rgba(255,255,255,0.5)">Students</text>
        
        <rect x="170" y="110" width="50" height="35" rx="6" fill="url(#cardGradient)" />
        <text x="195" y="125" fontSize="10" fill="rgba(255,255,255,0.7)">📝</text>
        <text x="180" y="140" fontSize="5" fill="rgba(255,255,255,0.5)">Assignments</text>
        
        <rect x="230" y="110" width="50" height="35" rx="6" fill="url(#cardGradient)" />
        <text x="255" y="125" fontSize="10" fill="rgba(255,255,255,0.7)">📊</text>
        <text x="240" y="140" fontSize="5" fill="rgba(255,255,255,0.5)">Grades</text>
        
        {/* Progress bar */}
        <rect x="110" y="160" width="140" height="6" rx="3" fill="rgba(255,255,255,0.2)" />
        <rect x="110" y="160" width="90" height="6" rx="3" fill="rgba(34, 197, 94, 0.6)" />
        <text x="260" y="165" fontSize="5" fill="rgba(255,255,255,0.5)">65% Complete</text>

        {/* Floating elements */}
        <rect x="50" y="60" width="30" height="40" rx="4" fill="url(#cardGradient)" />
        <text x="60" y="80" fontSize="8" fill="rgba(255,255,255,0.6)">📖</text>
        <rect x="52" y="65" width="12" height="2" rx="1" fill="rgba(255,255,255,0.4)" />
        <rect x="52" y="70" width="20" height="1.5" rx="0.75" fill="rgba(255,255,255,0.3)" />
        <rect x="52" y="75" width="16" height="1.5" rx="0.75" fill="rgba(255,255,255,0.3)" />

        <rect x="320" y="90" width="60" height="40" rx="8" fill="url(#cardGradient)" />
        <text x="340" y="110" fontSize="10" fill="rgba(255,255,255,0.7)">🔔</text>
        <text x="330" y="125" fontSize="5" fill="rgba(255,255,255,0.5)">New Message!</text>

        {/* Floating icons */}
        <circle cx="70" cy="190" r="15" fill="rgba(255,255,255,0.15)" />
        <text x="62" y="198" fontSize="12" fill="rgba(255,255,255,0.6)">⭐</text>

        <circle cx="330" cy="210" r="12" fill="rgba(255,255,255,0.15)" />
        <text x="323" y="218" fontSize="10" fill="rgba(255,255,255,0.6)">💡</text>

        {/* Decorative particles */}
        <circle cx="60" cy="120" r="2" fill="rgba(255,255,255,0.4)" />
        <circle cx="350" cy="150" r="1.5" fill="rgba(255,255,255,0.3)" />
        <circle cx="40" cy="200" r="2" fill="rgba(255,255,255,0.2)" />

        {/* Connection lines */}
        <path 
          d="M90 140 Q150 120 200 130" 
          stroke="rgba(255,255,255,0.2)" 
          strokeWidth="2" 
          fill="none" 
          strokeDasharray="5,5"
        />
        <path 
          d="M300 160 Q250 140 220 150" 
          stroke="rgba(255,255,255,0.2)" 
          strokeWidth="2" 
          fill="none" 
          strokeDasharray="5,5"
        />

        {/* Decorative cloud */}
        <path d="M50 30 Q40 20 50 20 Q60 20 70 30 Q80 20 90 30 Q80 40 70 40 Q60 40 50 30" 
              fill="rgba(255,255,255,0.2)" />
        <text x="65" y="35" fontSize="6" fill="rgba(255,255,255,0.5)">☁️</text>

        {/* Decorative star */}
        <text x="360" y="40" fontSize="14" fill="rgba(255,255,255,0.4)">✨</text>
      </svg>
    </div>
  );
};

export default AnimatedClassroomIllustration;