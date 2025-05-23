import {Cart} from './cart';
import {Permanent} from './permanent';

export type StackItemType = 'Spell' | 'ActivatedAbility' | 'TriggeredAbility';

export interface StackItem {
  type: StackItemType;
  source: Permanent | Cart;
  description: any;
  cost?: string;
  efecto?: any;
}

