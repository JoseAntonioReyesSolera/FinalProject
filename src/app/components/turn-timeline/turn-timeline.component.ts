import { Component } from '@angular/core';
import {Phase} from '../../models/phase';
import {TriggerService} from '../../services/trigger.service';
import {BattlefieldService} from '../../services/battlefield.service';
import {StackService} from '../../services/stack.service';
import {TurnService} from '../../services/turn.service';

@Component({
  selector: 'app-turn-timeline',
  imports: [],
  templateUrl: './turn-timeline.component.html',
  styleUrl: './turn-timeline.component.css',
})
export class TurnTimelineComponent {
  phases: Phase[] = [
    {
      name: 'Beginning Phase', label: '🔄',
      steps: [{name: 'Untap', label: '🌀'},
        {name: 'upkeep', label: '⚙️'},
        {name: 'draw', label: '📥'}
      ]
    },
    { name: 'PreCombat Main Phase', label: '📜' },
    {
      name: 'Combat Phase', label: '⚔️',
      steps: [
        {name: 'Beginning of Combat', label: '🎯️'},
        {name: 'Declare Attackers', label: '🏹'},
        {name: 'Declare Blockers',  label: '🛡️'},
        {name: 'Combat Damage', label: '💢'},
        {name: 'End of Combat', label: '🕊️'}
      ]
    },
    { name: 'PostCombat Main Phase', label: '📜'},
    { name: 'Ending Phase', label: '🌙',
      steps: [
        {name: 'End Step', label: '🚪'},
        {name: 'Cleanup', label: '🧹'}
      ]
    },
    { name: 'Opponent Turn',  label: '👤'}
    ];

  phaseIndex = 0;
  stepIndex = 0;

  constructor(private readonly triggerService: TriggerService,
              private readonly battlefieldService: BattlefieldService,
              private readonly stackService: StackService,
              private readonly turnService: TurnService
  ) {}

  get currentPhase(): Phase {
    return this.phases[this.phaseIndex];
  }

  get currentStep(): string {
    const current = this.currentPhase.steps?.[this.stepIndex];
    return current ? current.name : this.currentPhase.name;
  }

  next(): void {
    if (this.currentPhase.steps && this.stepIndex < this.currentPhase.steps.length - 1) {
      this.stepIndex++;
    } else {
      this.phaseIndex = (this.phaseIndex + 1) % this.phases.length;
      this.stepIndex = 0;
    }
    this.turnService.setCurrentStep(this.currentStep);

    this.triggerService.detectTriggers('beginStep', this.battlefieldService.getPermanentsSnapshot(), {
      stepName: this.currentStep,
    });
    if (this.currentStep === 'Untap') {
      this.battlefieldService.untapAll();
    }
    if (this.currentPhase.name === 'Opponent Turn') {
      this.stackService.startNewTurn();
    }
    if (this.currentStep === 'Declare Attackers') {
      this.triggerService.detectTriggers('attack', this.battlefieldService.getPermanentsSnapshot());
    }
  }

  prev(): void {
    if (this.currentPhase.steps && this.stepIndex > 0) {
      this.stepIndex--;
    } else {
      this.phaseIndex =
        (this.phaseIndex - 1 + this.phases.length) % this.phases.length;
      this.stepIndex = this.phases[this.phaseIndex].steps
        ? this.phases[this.phaseIndex].steps!.length - 1
        : 0;
    }
    this.turnService.setCurrentStep(this.currentStep);
    this.triggerService.detectTriggers('beginStep', this.battlefieldService.getPermanentsSnapshot(), {
      stepName: this.currentStep,
    });
    if (this.currentStep === 'Untap') {
      this.battlefieldService.untapAll();
    }
  }
}
