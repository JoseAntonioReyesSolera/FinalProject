import {Cart} from './cart';
import {Permanent} from './permanent';

export type StackItemType = 'Spell' | 'ActivatedAbility' | 'TriggeredAbility';

export interface StackItem {
  type: StackItemType;
  source: Permanent | Cart;
  description: string;
  cost?: string;
  efecto?: string;
}

