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

      this.selectedCards.push(card);

      if (this.selectedCards.length === this.cardsToSelect) {
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
