import {Cart} from './cart';
import {Permanent} from './permanent';
import {StackItem} from './stack-item';

export interface GameState {
  id: string;
  date: string;
  cards: Cart[];
  battlefield: Permanent[];
  stack: StackItem[];
  log: string[];
}
