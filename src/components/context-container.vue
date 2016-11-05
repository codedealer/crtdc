<template>
  <div class="context-field-container">
    <card-selector v-show="showCardSelector"></card-selector>
    <duel-display v-if="showDuelDisplay" :options="duelOptions"></duel-display>
  </div>
</template>

<script>
import EventEmitter from '../core/eventemitter'
import cardSelector from './card-selector'
import duelDisplay from './duel-display'
import {ModalOK} from '../modal'

export default {
  compiled () {
    this.em.on('board.card-selector.init', () => { this.showCardSelector = true; });
    this.em.on('board.duel-display.init', (duelOptions, cb) => {
      duelOptions.em = this.em;
      this.duelOptions = duelOptions;
      this.duelCallback = cb;
      this.duelResult = {};
      this.showDuelDisplay = true;
      if (duelOptions.self.uid === duelOptions.caller.uid ||
          duelOptions.self.uid === duelOptions.callee.uid) {
        this.duelCallback(null);
      } else {
        this.duelSelectable = true;
      }
    });
    this.em.on('duel.begin', (caller, callee) => {
      if (this.duelOptions.winner) {
        this.$broadcast('duel-player-ready', this.duelOptions.self.uid);
      } else {
        this.$broadcast('duel-begin', {caller, callee});
      }
    });
    this.em.on('duel.result', callback => {
      this.duelCallback = callback;
      this.$broadcast('duel-result');
    });
    this.em.on('duel.spent_token', player => {
      this.$broadcast('duel.spent-token', player.uid);
    });
    this.em.on('duel.player.ready', player => {
      this.$broadcast('duel-player-ready', player.uid);
    });
    this.em.on('duel.card.toggle', (card, isSelected) => {
      this.$broadcast('duel-card-toggle', {card, isSelected});
    });
    this.em.on('duel.player.exclude', toExclude => {
      if (!this.duelOptions.activeSupporters) return;
      this.duelOptions.activeSupporters = this.duelOptions.activeSupporters
                                       .filter(player => player.uid !== toExclude.uid);

      if (this.duelOptions.self && this.duelOptions.self.uid === toExclude.uid) {
        this.$broadcast('duel-select-cancel');
        this.duelCallback(this.duelOptions.self);
      }
    });
    this.em.on('duel.support.cancel', player => {
      this.$broadcast('duel-select-cancel');
    });
    this.em.on('duel.decide.winner', winner => {
      this.$broadcast('duel-select-cancel');

      this.duelOptions.winner = winner;

      this.duelCallback(this.duelOptions.self);
    });
    this.em.on('duel.result.cancel', () => {
      if (typeof this.duelCallback === 'function') {
        this.duelCallback(null);
      }
    });
    this.em.on('duel.active_players.get', () => {
      this.em.emit('duel.active_players.got', this.duelOptions.activeSupporters);
    });
    this.em.on('duel.occupation.disclosed', player => {
      if (!this.showDuelDisplay) return;
      this.$broadcast('duel-occupation-disclosed', player);
    });
    this.em.on('gm.duel.card', options => {
      this.$broadcast('gm-duel-card', options);
    });
    this.em.on('turn.new', () => {
      this.showCardSelector = false;
      this.showDuelDisplay = false;
    });
    this.em.on('turn.end', () => {
      this.duelSelectable = false;
      this.$broadcast('duel-select-cancel');
      this.duelCallback(null);
    });
  },
  data () {
    return {
      em: EventEmitter.getInstance(),
      showCardSelector: false,
      showDuelDisplay: false,
      duelOptions: {},
      duelCallback: null,
      duelResult: {},
      duelSelectable: false
    }
  },
  events: {
    'card-selector' () { this.showCardSelector = false; },
    'duel-selected' (player) {
      if (this.duelSelectable) {
        this.duelSelectable = false;
        this.duelCallback(player);
      }
    },
    'duel.spend-token' (player) {
      this.em.emit('duel.spend_token', player);
    },
    'duel-result-calculated' (winner) {
      this.duelResult = winner;
      this.em.emit('duel.result.calculated', winner);
      this.em.once('modal.exec', (arg) => {
        if (typeof this.duelCallback === 'function') this.duelCallback(this.duelResult);

        this.showDuelDisplay = false;
      });
      this.em.emit('modal.show', new ModalOK());
    }
  },
  components: {
    cardSelector,
    duelDisplay
  }
}
</script>
