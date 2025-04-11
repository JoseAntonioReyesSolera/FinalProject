import {Component, OnInit} from '@angular/core';
import {Cart} from '../../models/cart';
import {DeckService} from '../../services/deck.service';

@Component({
  selector: 'app-commander',
  imports: [],
  templateUrl: './commander.component.html',
  styleUrl: './commander.component.css'
})
export class CommanderComponent implements OnInit{
  commander: Cart | null = null;

  constructor(private readonly deckService: DeckService) {}

  ngOnInit(): void {
    this.commander = this.deckService.getCommander(); // Obtener el comandante desde el servicio
  }
}
