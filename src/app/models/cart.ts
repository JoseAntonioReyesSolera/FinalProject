export interface Cart {
  id: string;
  name: string;
  image_uris?: {
    normal?: string;
    art_crop?: string;
  };
  oracle_text: string;
  type_line: string;
  mana_cost: string;
  cmc: number;
  power?: number;
  toughness?: number;
  keywords?: Array<string>;
  produced_mana?: Array<string>;
  sanitizedManaCost: any;
  sanitizedProducedMana: any;
  sanitizedOracleText: any;
}
