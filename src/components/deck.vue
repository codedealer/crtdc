<template>
  <div class="deck-container">
    <div :class="deckClass"></div>
    <div :class="tokenClass"></div>
  </div>
</template>

<script>
import rulecoordinator from '../world/rulecoordinator'
export default {
  data () {
    return {
      rc: rulecoordinator
    }
  },
  computed: {
    deckClass () {
      let l = 'deck';

      switch (this.rc.deck.length) {
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
    },
    tokenClass () {
      let l;
      switch (this.rc.tokens) {
        case 2:
          l = 'tokens-2';
          break;
        case 1:
          l = 'tokens-1';
          break;
        case 0:
          l = 'no-tokens';
          break;
        default:
          l = 'tokens';
      }

      return l;
    }
  }
}
</script>

<style lang="scss">
.deck-container {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: center;
  align-content: stretch;
  align-items: center;
}
.deck, .tokens {
  order: 0;
  flex: 0 1 auto;
  align-self: auto;
}
.deck {
  height: 130px;
  width: 82px;
  margin-top: 35px;
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
.tokens {
  height: 59px;
  width: 69px;
  margin-left: 20px;
  background: url(../assets/tokens.png) no-repeat;
  background-size: contain;
}
.tokens-2 {
  @extend .tokens;
  background-image: url(../assets/tokens-2.png);
}
.tokens-1 {
  @extend .tokens;
  background-image: url(../assets/tokens-1.png);
}
.no-tokens {
  @extend .tokens;
  background-image: none;
}
</style>
