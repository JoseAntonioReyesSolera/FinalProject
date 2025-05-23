export interface Cart {
  instanceId?: string;
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
  loyalty?: number;
  power?: number;
  toughness?: number;
  keywords?: Array<string>;
  produced_mana?: Array<string>;
  sanitizedManaCost: any;
  sanitizedProducedMana: any;
  sanitizedOracleText: any;
  card_faces: any;
  currentFaceIndex: number;
  quantity: number;
  color_identity?: string;

  combinedName?: string;
  combinedManaCost?: string;
  combinedOracleText?: string;
  combinedImageUris?: string;

  isSingleImageDoubleFace: boolean;
  isCommander: boolean;

  zone: string;
}
