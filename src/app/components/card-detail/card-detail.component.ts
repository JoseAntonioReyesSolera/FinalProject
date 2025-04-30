import {Component, EventEmitter, Input, OnChanges, Output} from '@angular/core';
import {Cart} from '../../models/cart';

@Component({
  selector: 'app-card-detail',
  imports: [],
  templateUrl: './card-detail.component.html',
  styleUrl: './card-detail.component.css'
})
export class CardDetailComponent implements OnChanges{
  @Input() card!: Cart;
  @Input() visible = false;
  @Output() closed = new EventEmitter<void>();

  close() {
    this.closed.emit();
  }
  ngOnChanges() {
    if (this.visible && this.card) {
      // mostrar detalle
    }
  }
}
