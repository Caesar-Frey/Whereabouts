import { useColorScheme } from 'react-native';

/**
 * "Reading room" by day, "after hours" by night: aged paper, catalog-card
 * stock, oxblood leather, banker's-lamp green and brass fittings.
 */
export interface Palette {
  scheme: 'light' | 'dark';
  /** The room: page background. */
  room: string;
  /** Faint wood-grain stripes laid over the room. */
  grain: string;
  /** Catalog card stock. */
  card: string;
  cardEdge: string;
  /** Faint blue ruling on index cards. */
  rule: string;
  /** Red header rule on index cards. */
  headRule: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  leather: string;
  leatherDeep: string;
  onLeather: string;
  lamp: string;
  lampDeep: string;
  onLamp: string;
  brass: string;
  brassLight: string;
  brassDark: string;
  stamp: string;
  stampReturned: string;
  shadow: string;
}

const light: Palette = {
  scheme: 'light',
  room: '#EFE4CC',
  grain: 'rgba(122, 90, 52, 0.05)',
  card: '#FBF6EA',
  cardEdge: '#E3D6BA',
  rule: 'rgba(86, 128, 170, 0.20)',
  headRule: '#C4574C',
  ink: '#2A1F17',
  inkSoft: '#6B5843',
  inkFaint: '#A08D74',
  leather: '#6E2620',
  leatherDeep: '#4F1915',
  onLeather: '#F6E7CF',
  lamp: '#2E4B3B',
  lampDeep: '#1F3529',
  onLamp: '#EFE6CF',
  brass: '#B38B4D',
  brassLight: '#E2C58E',
  brassDark: '#7C5D2C',
  stamp: '#B23A31',
  stampReturned: '#3D6B52',
  shadow: '#3B2A1A',
};

const dark: Palette = {
  scheme: 'dark',
  room: '#17110D',
  grain: 'rgba(226, 197, 142, 0.03)',
  card: '#261C15',
  cardEdge: '#3A2C21',
  rule: 'rgba(140, 170, 200, 0.10)',
  headRule: '#A3463D',
  ink: '#EDE1CA',
  inkSoft: '#B7A588',
  inkFaint: '#7D6C57',
  leather: '#7D2E27',
  leatherDeep: '#5A1E19',
  onLeather: '#F6E7CF',
  lamp: '#3F6650',
  lampDeep: '#2A4535',
  onLamp: '#F1E9D3',
  brass: '#C59C5A',
  brassLight: '#E9CF9B',
  brassDark: '#8A6935',
  stamp: '#D2564B',
  stampReturned: '#6FA584',
  shadow: '#000000',
};

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export const fonts = {
  /** Book titles and headings. */
  display: 'Fraunces_600SemiBold',
  displayItalic: 'Fraunces_400Regular_Italic',
  serif: 'Fraunces_400Regular',
  /** Typed catalog-card text: call numbers, dates, metadata. */
  typed: 'CourierPrime_400Regular',
  typedBold: 'CourierPrime_700Bold',
  /** Rubber stamps. */
  stamp: 'SpecialElite_400Regular',
} as const;

export const space = (n: number) => n * 4;
