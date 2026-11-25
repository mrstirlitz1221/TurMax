/**
 * Силуэты горных хребтов для обложки: дальний (полупрозрачный, с туманом) и ближний цвета фона страницы.
 * Слои двигаются с разной скоростью (классы hero-ridge-*), что создаёт ощущение глубины,
 * а ближний хребет плавно «перетекает» в следующий блок.
 */
export function Ridges({ near = "var(--color-sand-light)" }: { near?: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[20vh] min-h-[110px]" aria-hidden>
      <svg className="hero-ridge-far absolute inset-x-0 -bottom-[8%] h-full w-full" viewBox="0 0 1440 200" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ridge-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#11241b" stopOpacity="0.55" />
            <stop offset="1" stopColor="#11241b" stopOpacity="0.85" />
          </linearGradient>
        </defs>
        <path
          fill="url(#ridge-far)"
          d="M0 132 C 60 120, 95 92, 140 86 C 175 82, 190 104, 228 100 C 270 96, 300 60, 342 52 C 372 46, 392 70, 420 78 C 470 92, 500 70, 548 62 C 590 55, 612 86, 660 92 C 700 97, 724 66, 770 44 C 800 30, 826 52, 852 64 C 896 84, 930 78, 968 70 C 1012 61, 1040 88, 1084 92 C 1124 96, 1150 70, 1196 58 C 1236 48, 1262 72, 1300 84 C 1340 96, 1388 90, 1440 80 L1440 200 L0 200 Z"
        />
      </svg>
      <svg className="hero-ridge-near absolute inset-x-0 -bottom-px h-[62%] w-full" viewBox="0 0 1440 120" preserveAspectRatio="none">
        <path
          style={{ fill: near }}
          d="M0 92 C 80 86, 130 64, 196 58 C 250 53, 290 74, 350 76 C 420 78, 452 44, 520 40 C 580 37, 612 66, 672 72 C 736 78, 770 58, 830 50 C 890 42, 930 70, 1000 74 C 1060 77, 1100 52, 1164 48 C 1226 44, 1262 70, 1320 76 C 1370 81, 1410 74, 1440 70 L1440 120 L0 120 Z"
        />
      </svg>
    </div>
  );
}
