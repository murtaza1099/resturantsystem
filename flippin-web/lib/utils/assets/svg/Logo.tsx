// components/Logo.tsx
// Temporary Flippin text wordmark. Replace with the official Flippin logo
// artwork once it is available.

import { useTheme } from "@/lib/providers/ThemeProvider";

const Logo = ({
  fillColor = "#000000",
  darkmode = "#ffffffff",
}) => {
  const { theme } = useTheme();
  return (
    <svg
      width="198"
      height="35"
      viewBox="0 0 198 35"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className=" w-32 md:w-36"
      role="img"
      aria-label="Flippin"
    >
      <text
        x="0"
        y="28"
        fontFamily="inherit"
        fontSize="30"
        fontWeight="800"
        letterSpacing="1"
        fill={theme === "dark" ? darkmode : fillColor}
      >
        FLIPPIN<tspan fill="#5AC12F">.</tspan>
      </text>
    </svg>
  );
};

export default Logo;
