import {Cart} from './cart';
import {TriggeredAbility} from './triggered-ability';

export interface Permanent {
  instanceId: string;
  cardId: string;
  name: string;
  image: string;
  power?: number;
  toughness?: number;
  loyalty?:number;
  tapped: boolean;
  counters: { [type: string]: number };
  oracle_text: any;
  type: string;
  originalCard: Cart;
  triggeredAbilities: TriggeredAbility[];
}
