import {Component, HostListener} from '@angular/core';
import {DeckService} from '../../services/deck.service';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-library',
  imports: [
    FormsModule
  ],
  templateUrl: './library.component.html',
  styleUrl: './library.component.css'
})
export class LibraryComponent {
  public totalDeckCards: number = 0;
  public decks: any[] = [];
  public showContextMenu = false;
  public contextMenuPosition = { x: 0, y: 0 };
  isDrawingCards: boolean = false;
  cardsToDraw: number = 1;

  constructor(private readonly deckService: DeckService) {}

  ngOnInit() {
    this.deckService.getDeckCards().subscribe(cards => {
      this.totalDeckCards = cards.reduce((sum, card) => sum + (card.quantity || 1), 0);
    });
  }

  onRightClick(event: MouseEvent) {
    event.preventDefault();
    this.contextMenuPosition = { x: event.clientX, y: event.clientY };
    this.showContextMenu = true;
  }

  @HostListener('document:click')
  closeContextMenu() {
    this.showContextMenu = false;
  }

  drawCards(amount: number) {
    console.log(`Robando ${amount} carta(s)`);
    this.closeDrawDialog();
  }

  showDrawCardsDialog() {
    this.isDrawingCards = true;
    this.closeContextMenu();

  }
  closeDrawDialog() {
    this.isDrawingCards = false;
  }


  millCard() {
    console.log('Molando 1 carta');
    this.closeContextMenu();
  }

  searchCard() {
    console.log('Buscando una carta en la biblioteca');
    this.closeContextMenu();
  }

  exileCard() {
    console.log('Exiliando una carta de la biblioteca');
    this.closeContextMenu();
  }
}
