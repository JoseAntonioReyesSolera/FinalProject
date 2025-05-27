import {Cart} from './cart';

export interface Permanent {
  instanceId: string;
  cardId: string;
  name: string;
  image: string;
  power?: number;
  toughness?: number;
  loyalty?:number;
  tapped: boolean;
  counters: Counter[];
  oracle_text?: any;
  type: string;
  chosenCreatureType?: string;
  originalCard: Cart;
}

export interface Counter {
  type: string;
  amount: number;
}
