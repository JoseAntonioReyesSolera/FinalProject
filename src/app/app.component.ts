import {Component} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ScryfallService } from './services/scryfall.service';
import { BattlefieldComponent } from './components/battlefield/battlefield.component';
import { HandComponent } from './components/hand/hand.component';
// import { StackComponent } from './components/stack/stack.component';

@Component({
  selector: 'app-root',
  imports: [
    FormsModule,
    HandComponent,
    BattlefieldComponent,
    // StackComponent
  ],
  template: `
    <app-battlefield></app-battlefield>
    <app-hand></app-hand>
  `,
  providers: [ScryfallService]
})
export class AppComponent { }
