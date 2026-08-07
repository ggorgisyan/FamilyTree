export default function LoginLogo() {
  return (
    <svg className="tree-medallion" viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="tm-slate" cx="50%" cy="42%" r="62%">
          <stop offset="0%" stopColor="#3a424a" />
          <stop offset="100%" stopColor="#242b31" />
        </radialGradient>
        <linearGradient id="tm-ring" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a5713a" />
          <stop offset="100%" stopColor="#6b4622" />
        </linearGradient>
        <linearGradient id="tm-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c08a49" />
          <stop offset="100%" stopColor="#7c5223" />
        </linearGradient>
        <clipPath id="tm-disc">
          <circle cx="64" cy="64" r="52" />
        </clipPath>
        <path id="tm-leaf" d="M0 0 C 5 -3 6 -9 0 -15 C -6 -9 -5 -3 0 0 Z" />
      </defs>

      {/* Frame */}
      <circle cx="64" cy="64" r="62" fill="url(#tm-ring)" />
      <circle cx="64" cy="64" r="55" fill="#5c3c1d" />
      <circle cx="64" cy="64" r="52" fill="url(#tm-slate)" />

      <g clipPath="url(#tm-disc)">
        {/* One half is drawn, then mirrored across x = 64 for perfect symmetry */}
        <g id="tm-half">
          {/* Roots */}
          <g stroke="#8a5c2e" fill="none" strokeLinecap="round">
            <path d="M60 99 C 49 104, 40 108, 27 111" strokeWidth="5" />
            <path d="M45 106 C 41 110, 39 114, 38 119" strokeWidth="3" />
            <path d="M61 100 C 54 108, 49 113, 44 120" strokeWidth="4" />
            <path d="M59 101 C 48 103, 39 106, 25 106" strokeWidth="3.5" />
            <path d="M34 105 C 30 108, 28 112, 27 117" strokeWidth="2.4" />
            <path d="M50 109 C 47 113, 46 116, 47 121" strokeWidth="2.2" />
          </g>

          {/* Branches */}
          <g stroke="#a5713a" fill="none" strokeLinecap="round">
            <path d="M62 63 C 54 55, 50 47, 46 37" strokeWidth="4.6" />
            <path d="M52 50 C 46 48, 41 46, 37 42" strokeWidth="2.8" />
            <path d="M50 44 C 46 39, 43 35, 41 29" strokeWidth="2.6" />
            <path d="M60 64 C 50 60, 42 58, 33 55" strokeWidth="4.2" />
            <path d="M44 58 C 39 56, 35 55, 31 53" strokeWidth="2.4" />
            <path d="M61 61 C 57 51, 55 43, 53 32" strokeWidth="3.2" />
            <path d="M63 62 C 60 54, 58 49, 57 41" strokeWidth="2.4" />
          </g>

          {/* Leaves */}
          <g>
            <use href="#tm-leaf" transform="translate(45 33) rotate(-18) scale(1.05)" fill="#4a9c66" />
            <use href="#tm-leaf" transform="translate(40 27) rotate(-30)" fill="#2f7a4e" />
            <use href="#tm-leaf" transform="translate(37 40) rotate(-58)" fill="#4a9c66" />
            <use href="#tm-leaf" transform="translate(30 52) rotate(-80) scale(.9)" fill="#2f7a4e" />
            <use href="#tm-leaf" transform="translate(53 31) rotate(-6)" fill="#57a870" />
            <use href="#tm-leaf" transform="translate(48 40) rotate(-40) scale(.85)" fill="#2f7a4e" />
            <use href="#tm-leaf" transform="translate(33 46) rotate(-70) scale(.8)" fill="#4a9c66" />
          </g>
        </g>
        <use href="#tm-half" transform="matrix(-1 0 0 1 128 0)" />

        {/* Central trunk */}
        <path
          d="M55 101 C 62 96, 66 96, 73 101 C 70 92, 68 86, 69 79 C 70 73, 67 70, 68 65 C 66 62, 65 61, 64 59 C 63 61, 62 62, 60 65 C 61 70, 58 73, 59 79 C 60 86, 58 92, 55 101 Z"
          fill="url(#tm-wood)"
          stroke="#5c3c1d"
          strokeWidth="1"
        />
        <path d="M62 96 C 63 86, 61 74, 62 64" stroke="#5c3c1d" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.55" />
        <path d="M66 96 C 66 84, 67 74, 66 65" stroke="#5c3c1d" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.4" />
        <path d="M64 60 C 62 51, 60 43, 60 32" stroke="#a5713a" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M64 60 C 66 51, 68 44, 69 34" stroke="#a5713a" strokeWidth="3" fill="none" strokeLinecap="round" />

        {/* Crown leaves */}
        <use href="#tm-leaf" transform="translate(60 26) rotate(-4)" fill="#57a870" />
        <use href="#tm-leaf" transform="translate(69 30) rotate(10)" fill="#2f7a4e" />
        <use href="#tm-leaf" transform="translate(64 22) rotate(3) scale(1.1)" fill="#4a9c66" />
      </g>

      {/* Inner rim */}
      <circle cx="64" cy="64" r="52" fill="none" stroke="#1c2126" strokeWidth="1.5" />
    </svg>
  )
}
