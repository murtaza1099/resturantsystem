import { useId } from 'react';

export function AppLogo() {
  const gradientId = `flippin-mark-${useId()}`;
  return (
    <div className="flex items-center justify-center relative p-2">
      <svg
        width="160"
        height="38"
        viewBox="0 0 203 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Flippin"
      >
        <defs>
          <linearGradient id={gradientId} x1="12" y1="6" x2="88" y2="112" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#9BE870" />
            <stop offset="1" stopColor="#2E9E4F" />
          </linearGradient>
        </defs>
        <g transform="scale(0.4)">
          <path
            d="M50 4C25.7 4 6 23.7 6 48c0 31.5 44 68 44 68s44-36.5 44-68C94 23.7 74.3 4 50 4z"
            fill={`url(#${gradientId})`}
          />
          <path
            d="M45 84V52h-8v-9h8v-5c0-10 6-15 15-15 3 0 6 .4 8 1v9c-1.6-.5-3.6-.8-5.5-.8-4.4 0-6.5 2-6.5 6.3V43h11v9H56v32z"
            fill="#fff"
          />
        </g>
        <text
          x="48"
          y="35"
          className="fill-black dark:fill-white"
          fontFamily="inherit"
          fontSize="32"
          fontWeight="800"
          letterSpacing="-0.5"
        >
          Flippin
        </text>
      </svg>
    </div>
  );
}
