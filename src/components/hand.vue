<template>
  <slider :cards="hand" :component-name="'itemCard'"></slider>
</template>

<script>
import EventEmitter from '../core/eventemitter'
import {ModalOK} from '../modal'

import slider from './slider'

export default {
  props: ['hand'],
  ready () {
    this.em.on('hand.select', (options, callback) => {
      this.cardsToSelect = options.numPlayers || 1;
      this.selectedCards = [];
      this.callback = callback;
      this.options = options;
      this.selectable = true;
      this.$broadcast('slider.select', options);

      if (options.dismissable) {
        this.em.once('modal.exec', (arg) => {
          if (this.selectable === false || arg === null) return;

          this.selectable = false;
          this.$broadcast('slider.selected');
          if (typeof callback === 'function') callback(arg);
        });
        this.em.emit('modal.show', new ModalOK('Отклонить'));
      }
    });

    this.em.on('duel.begin', (caller, callee, self) => {
      if (self === undefined) return;

      this.cardsToSelect = 99;
      this.selectedCards = [];
      this.options = {
        isDuel: true,
        caller,
        callee,
        self
      };
      this.selectable = true;
      this.$broadcast('slider.select', this.options);

      this.em.once('modal.exec', (arg) => {
        if (this.selectable === false || arg === null) return;

        this.selectable = false;
        this.$broadcast('slider.selected');
        this.em.emit('duel.player.ready', this.options.self);
      });
      this.em.emit('modal.show', new ModalOK('Готов'));
    });

    this.em.on('turn.new', () => {
      this.$broadcast('slider.reset');
    });
  },
  data () {
    return {
      em: EventEmitter.getInstance(),
      selectable: false,
      options: {},
      selectedCards: [],
      cardsToSelect: 0,
      callback: null
    }
  },
  events: {
    'card.selected' (card) {
      if (this.selectable !== true) return;

      if (this.options.excludeCriteria && !this.options.excludeCriteria(card)) {
        this.em.emit('log', 'a', 'Нельзя выбрать эту карту в настоящий момент');
        return;
      }

      let cardIndex = this.selectedCards.findIndex(c => c.uid === card.uid);
      let selected = true;
      if (cardIndex === -1) {
        this.selectedCards.push(card);
      } else {
        this.selectedCards.splice(cardIndex, 1);
        selected = false;
      }

      if (this.options.isDuel) {
        this.em.emit('duel.card.toggle', card, selected);
      } else if (this.selectedCards.length === this.cardsToSelect) {
        this.selectable = false;
        this.$broadcast('slider.selected');
        if (this.options.dismissable) this.em.emit('modal.dismiss');
        if (typeof this.callback === 'function') this.callback(this.selectedCards);
      }
    }
  },
  components: {
    slider
  }
}
</script>
