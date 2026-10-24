import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

/**
 * Hand-drawn library icons. All are 24-unit line drawings so they read like
 * ink on card stock; `color` is the ink, `accent` an optional brass fill.
 */
export interface IconProps {
  size?: number;
  color: string;
  accent?: string;
  strokeWidth?: number;
}

const base = (size: number) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none' as const });

/** Card-catalog drawer with brass label frame and pull. */
export function CatalogIcon({ size = 24, color, accent, strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={2.5} y={5} width={19} height={14} rx={1.5} stroke={color} strokeWidth={strokeWidth} />
      <Rect x={8} y={8} width={8} height={3.5} rx={0.6} stroke={color} strokeWidth={strokeWidth} fill={accent ?? 'none'} />
      <Path d="M9.5 15.5h5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M4.5 19v1.5M19.5 19v1.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Three spines and a leaning book on a shelf. */
export function ShelvesIcon({ size = 24, color, accent, strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={3.5} y={6} width={3.5} height={13} rx={0.5} stroke={color} strokeWidth={strokeWidth} fill={accent ?? 'none'} />
      <Rect x={7} y={4} width={3.5} height={15} rx={0.5} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M8.75 7v2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Rect x={10.5} y={7} width={3} height={12} rx={0.5} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M15.2 8.2l3.4-1 3 11.4-3.4 1z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Path d="M2 19.5h20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** A date-due slip in its pocket. */
export function CheckedOutIcon({ size = 24, color, accent, strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={6} y={2.5} width={12} height={13} rx={1} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M8.5 6h7M8.5 9h4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path
        d="M3.5 12.5h17v7a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z"
        stroke={color}
        strokeWidth={strokeWidth}
        fill={accent ?? 'none'}
        strokeLinejoin="round"
      />
      <Path d="M9 12.5a3 2 0 0 0 6 0" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

/** Banker's lamp: the settings desk. */
export function DeskIcon({ size = 24, color, accent, strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M4 10.5c0-3 3.5-5 8-5s8 2 8 5z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" fill={accent ?? 'none'} />
      <Path d="M12 10.5v7M8 20.5h8M9.5 17.5h5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M17 10.5v3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx={17} cy={14.6} r={0.9} fill={color} />
    </Svg>
  );
}

/** Reading glass with a brass rim. */
export function LoupeIcon({ size = 24, color, accent, strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Circle cx={10} cy={10} r={6} stroke={accent ?? color} strokeWidth={strokeWidth + 0.6} />
      <Path d="M14.5 14.5l6 6" stroke={color} strokeWidth={strokeWidth + 1.2} strokeLinecap="round" />
      <Path d="M7.2 8.4a3.2 3.2 0 0 1 2.4-2" stroke={color} strokeWidth={strokeWidth * 0.8} strokeLinecap="round" />
    </Svg>
  );
}

/** A fresh index card with a quill. */
export function NewCardIcon({ size = 24, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={2.5} y={7} width={14} height={11} rx={1} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M5 10.5h6M5 13.5h4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M21.5 2.5c-4 .5-7.5 4-8.5 9.5 3.5-1 6.8-4.5 8.5-9.5z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Path d="M13 12l-1.5 2.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Card moving from one drawer to another. */
export function ReshelveIcon({ size = 24, color, strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M3 7h11M10.5 3.5L14 7l-3.5 3.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x={9} y={13} width={12} height={8} rx={1} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M13 16h4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Rubber date stamp. */
export function StampIcon({ size = 24, color, strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M9 3.5h6l-1 6h-4z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Rect x={4} y={9.5} width={16} height={5} rx={1.2} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M5.5 14.5v2h13v-2M4 20.5h16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PencilIcon({ size = 24, color, strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Path d="M13.5 7l3 3" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function BinIcon({ size = 24, color, strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M4 6.5h16M9.5 6.5V4h5v2.5M6 6.5l1 14h10l1-14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10 10.5v6M14 10.5v6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function PersonIcon({ size = 24, color, strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Circle cx={12} cy={8} r={3.6} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M4.5 20.5c.8-4 3.8-6 7.5-6s6.7 2 7.5 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function KeyholeIcon({ size = 24, color, strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={4} y={3} width={16} height={18} rx={3} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={12} cy={10} r={2.4} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M11 12.3l-1 4.7h4l-1-4.7" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronIcon({ size = 24, color, strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CloseIcon({ size = 24, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Line x1={6} y1={6} x2={18} y2={18} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={18} y1={6} x2={6} y2={18} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Small pigeonhole: a place. */
export function PigeonholeIcon({ size = 24, color, accent, strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M3 9.5L12 4l9 5.5V20H3z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Rect x={8} y={12} width={8} height={8} stroke={color} strokeWidth={strokeWidth} fill={accent ?? 'none'} />
    </Svg>
  );
}
