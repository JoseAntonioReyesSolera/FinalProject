import {Component} from '@angular/core';
import {Cart} from '../../models/cart';
import {DeckService} from '../../services/deck.service';

@Component({
  selector: 'app-commander',
  imports: [],
  templateUrl: './commander.component.html',
  styleUrl: './commander.component.css'
})
export class CommanderComponent{

  constructor(private readonly deckService: DeckService) {}

  getCommanderCards(): Cart[] {
   return this.deckService.getCommander();
  }
}
