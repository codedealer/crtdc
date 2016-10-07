<template>
  <div class="card-selector-container">
    <slider :cards="cards" :component-name="cardType"></slider>
  </div>
</template>

<script>
import EventEmitter from '../core/eventemitter'
import slider from './slider'
import {ModalOK} from '../modal'

export default {
  ready () {
    this.em.on('board.card-selector.init', this.onInit.bind(this));
    this.em.emit('board.card-selector.ready');

    this.em.on('turn.new', () => {
      this.cards = [];
      this.$dispatch('card-selector');
    });
  },
  data () {
    return {
      em: EventEmitter.getInstance(),
      cards: [],
      selectedCards: [],
      cardsToSelect: 0,
      selectable: false,
      callback: null,
      options: {},
      cardType: 'itemCard'
    }
  },
  methods: {
    onInit (cards, options, callback) {
      this.cardType = options.type || 'itemCard';
      this.cards = cards;
      this.options = options;
      this.$broadcast('slider.reset');

      if (options.dismissable) {
        this.em.once('modal.exec', (arg) => {
          if (typeof callback === 'function') callback(arg);

          this.$dispatch('card-selector');
        });
        this.em.emit('modal.show', new ModalOK());
      }

      if (options.selectable) {
        this.selectedCards = [];
        this.callback = callback;
        this.cardsToSelect = options.numCards || 1;
        this.selectable = true;
        this.$broadcast('slider.select');
      }
    }
  },
  events: {
    'card.selected' (card) {
      if (this.selectable !== true) return;

      this.selectedCards.push(card);

      if (this.selectedCards.length === this.cardsToSelect) {
        this.selectable = false;
        this.$broadcast('slider.selected');
        if (this.options.dismissable) this.em.emit('modal.dismiss');
        if (typeof this.callback === 'function') this.callback(this.selectedCards);
        this.cards = [];
        this.$dispatch('card-selector');
      }
    }
  },
  components: {
    slider
  }
}
</script>

<style lang="scss">
  .card-selector-container{
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    margin: auto;
    z-index: 2;
    width: 100%;
  }
</style>
