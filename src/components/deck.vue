<template>
  <div class="deck-container">
    <div :class="deckClass"></div>
  </div>
</template>

<script>
import rulecoordinator from '../world/rulecoordinator'
export default {
  data () {
    return {
      deck: rulecoordinator.deck
    }
  },
  computed: {
    deckClass () {
      let l = 'deck';

      switch (this.deck.length) {
        case 3:
          l = 'deck-3';
          break;
        case 2:
          l = 'deck-2';
          break;
        case 1:
          l = 'deck-1';
          break;
        case 0:
          l = 'no-deck';
          break;
      }
      return {[l]: true}
    }
  }
}
</script>

<style lang="scss">
.deck {
  height: 130px;
  width: 82px;
  margin: 0 auto;
  background: url(../assets/deck.png) no-repeat;
  background-size: contain;
}
.deck-3 {
  @extend .deck;
  background-image: url(../assets/deck3.png);
}
.deck-2 {
  @extend .deck;
  background-image: url(../assets/deck2.png);
}
.deck-1 {
  @extend .deck;
  background-image: url(../assets/deck1.png);
}
.no-deck {
  display: none;
}
</style>
