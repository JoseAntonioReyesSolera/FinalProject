import {Cart} from './cart';
import {Permanent} from './permanent';
import {StackItem} from './stack-item';

export interface GameState {
  id: string;
  date: string;
  deckMain: Cart[];
  sideboard: Cart[];
  zones: {
    hand: Cart[];
    graveyard: Cart[];
    exile: Cart[];
    command: Cart[];
    library: Cart[];
  };
  battlefield: Permanent[];
  stack: StackItem[];
  log: string[];
}
