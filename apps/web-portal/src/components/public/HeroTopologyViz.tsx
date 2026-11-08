'use client';

import React from 'react';

/**
 * Decorative 3D network topology for the hero background.
 *
 * Pure SVG (no WebGL, no runtime dependency): a receding perspective grid,
 * glowing spherical nodes, connecting arcs and animated data pulses travelling
 * along them. Purely presentational — `aria-hidden` and pointer-events: none.
 */
export function HeroTopologyViz() {
  return (
    <div className="hero-viz-layer" aria-hidden="true">
      <svg
        className="hero-viz-svg"
        viewBox="0 0 1200 640"
        preserveAspectRatio="xMidYMid slice"
        role="presentation"
      >
        <defs>
          <radialGradient id="viz-sphere-blue" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="35%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </radialGradient>
          <radialGradient id="viz-sphere-orange" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffedd5" />
            <stop offset="35%" stopColor="#ff9900" />
            <stop offset="100%" stopColor="#c2410c" />
          </radialGradient>
          <radialGradient id="viz-sphere-emerald" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#d1fae5" />
            <stop offset="35%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#047857" />
          </radialGradient>
          <filter id="viz-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="viz-arc" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.05" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ff9900" stopOpacity="0.1" />
          </linearGradient>
          <clipPath id="viz-floor-clip">
            <polygon points="0,640 320,470 880,470 1200,640" />
          </clipPath>
        </defs>

        {/* Receding perspective floor grid — lines clipped to the trapezoid */}
        <g className="viz-grid-group">
          <polygon
            points="0,640 320,470 880,470 1200,640"
            fill="url(#viz-arc)"
            stroke="#d7e0ec"
            strokeWidth="1"
            opacity="0.35"
          />
          <g stroke="#c3d0e0" strokeWidth="1" opacity="0.45" clipPath="url(#viz-floor-clip)">
            {Array.from({ length: 6 }).map((_, i) => {
              const t = (i + 1) / 7;
              const y = 470 + t * t * 170;
              return <line key={`h${i}`} x1={0} y1={y} x2={1200} y2={y} />;
            })}
            {Array.from({ length: 9 }).map((_, i) => {
              const t = i / 8;
              return (
                <line key={`v${i}`} x1={320 + t * 560} y1={470} x2={t * 1200} y2={640} />
              );
            })}
          </g>
        </g>

        {/* Connecting arcs with travelling pulses */}
        <g fill="none" strokeWidth="1.5">
          <path id="arc-kbl" d="M 240 250 Q 600 120 940 210" stroke="url(#viz-arc)" />
          <path id="arc-hrt" d="M 180 420 Q 560 300 940 210" stroke="url(#viz-arc)" />
          <path id="arc-mzr" d="M 330 540 Q 640 380 940 210" stroke="url(#viz-arc)" />
          <path id="arc-eu" d="M 120 150 Q 600 90 940 210" stroke="url(#viz-arc)" />
          <path id="arc-us" d="M 1050 120 Q 980 150 940 210" stroke="url(#viz-arc)" />
        </g>

        {/* Animated pulses along the arcs */}
        <g className="viz-pulses">
          <circle r="3.5" fill="#7dd3fc" filter="url(#viz-glow)">
            <animateMotion dur="3.4s" repeatCount="indefinite">
              <mpath href="#arc-kbl" xlinkHref="#arc-kbl" />
            </animateMotion>
          </circle>
          <circle r="3.5" fill="#fbbf24" filter="url(#viz-glow)">
            <animateMotion dur="4.1s" repeatCount="indefinite">
              <mpath href="#arc-hrt" xlinkHref="#arc-hrt" />
            </animateMotion>
          </circle>
          <circle r="3.5" fill="#6ee7b7" filter="url(#viz-glow)">
            <animateMotion dur="3.8s" repeatCount="indefinite">
              <mpath href="#arc-mzr" xlinkHref="#arc-mzr" />
            </animateMotion>
          </circle>
          <circle r="3.5" fill="#a5b4fc" filter="url(#viz-glow)">
            <animateMotion dur="4.6s" repeatCount="indefinite">
              <mpath href="#arc-eu" xlinkHref="#arc-eu" />
            </animateMotion>
          </circle>
        </g>

        {/* Nodes */}
        <g className="viz-nodes" filter="url(#viz-glow)">
          <circle cx="240" cy="250" r="16" fill="url(#viz-sphere-blue)" stroke="#0ea5e9" strokeOpacity="0.6" />
          <circle cx="180" cy="420" r="13" fill="url(#viz-sphere-orange)" stroke="#f59e0b" strokeOpacity="0.6" />
          <circle cx="330" cy="540" r="13" fill="url(#viz-sphere-emerald)" stroke="#10b981" strokeOpacity="0.6" />
          <circle cx="120" cy="150" r="11" fill="url(#viz-sphere-blue)" stroke="#0ea5e9" strokeOpacity="0.5" />
          <circle cx="1050" cy="120" r="11" fill="url(#viz-sphere-orange)" stroke="#f59e0b" strokeOpacity="0.5" />
          {/* Central cloud hub */}
          <circle cx="940" cy="210" r="26" fill="url(#viz-sphere-orange)" stroke="#ff9900" strokeOpacity="0.8" />
        </g>

        {/* Node labels */}
        <g className="viz-labels" fill="#475569" fontFamily="SFMono-Regular, Consolas, monospace" fontSize="12">
          <text x="268" y="248">Kabul</text>
          <text x="208" y="418">Herat</text>
          <text x="358" y="538">Mazar</text>
          <text x="140" y="148">Europe</text>
          <text x="1012" y="118">Americas</text>
          <text x="902" y="208" fill="#fbbf24" fontWeight="700">Core</text>
        </g>
      </svg>
    </div>
  );
}
