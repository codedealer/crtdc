<template>
  <div :class="puppetClass" v-show="show">
  </div>
</template>

<script>
import EventEmitter from '../core/eventemitter'

export default {
  props: ['index'],
  ready () {
    this.em.on('cardback.show', (i, player) => {
      if (i !== this.index || this.show) return;

      this.isCard = true;
      this.origin = this.seatLookUp(player);
      this.show = true;
    });

    this.em.on('token.show', (i, player) => {
      if (i !== this.index || this.show) return;

      this.isCard = false;
      this.origin = this.seatLookUp(player);
      this.show = true;
    });

    this.em.on('animation.destination', (i, player) => {
      if (i !== this.index || this.destination !== false) return;

      this.destination = this.seatLookUp(player);
    });

    this.em.on('animation.hide', (i) => {
      if (i !== this.index) return;

      this.show = false;
      this.destination = false;
    });
  },
  data () {
    return {
      em: EventEmitter.getInstance(),
      show: false,
      isCard: false,
      origin: 0,
      destination: false
    }
  },
  computed: {
    puppetClass () {
      let o = {
        'origin-0': false,
        'origin-1': false,
        'origin-2': false,
        'origin-3': false,
        'origin-4': false,
        'origin-5': false,
        'origin-6': false,
        'origin-7': false,
        'origin-8': false,
        'destination-0': false,
        'destination-1': false,
        'destination-2': false,
        'destination-3': false,
        'destination-4': false,
        'destination-5': false,
        'destination-6': false,
        'destination-7': false,
        'destination-8': false,
        'card-transition-0': false,
        'card-transition-1': false,
        'card-back': false,
        'token': false
      };

      if (this.isCard) o['card-back'] = true;
      else o['token'] = true;

      if (this.destination !== false) {
        o[`card-transition-${this.index}`] = true;
        o[`destination-${this.destination}`] = true;
      } else o[`origin-${this.origin}`] = true;

      return o;
    }
  },
  methods: {
    seatLookUp (player) {
      //player = 0 - deck
      //get player's place on board
      if (player === 0) return 0;

      let index = this.$parent.players
                  .findIndex(x => x.uid === player.uid);

      return 1 + this.$parent.seats.findIndex(i => i === index);
    }
  }
}
</script>

<style lang="scss">
.card-back {
  height: 120px;
  width: 75px;
  position: absolute;
  top: auto;
  left: auto;
  background: url(../assets/cards-back.jpg) no-repeat;
  background-size: contain;
}
.token {
  height: 52px;
  width: 52px;
  position: absolute;
  background-image: url(../assets/token-alone.png);
}
.card-transition-0 {
  transition: all ease-out .7s;
  transform: rotate(50deg);
}
.card-transition-1 {
  @extend .card-transition-0;
  transform: rotate(-50deg);
}
.origin-0 {
  top: calc(50% - 98px);
  left: calc(50% - 83px);
}
.token.origin-0 {
  top: calc(50% - 64px);
  left: calc(50% + 28px);
}
.origin-1 {
  left: 80px;
  top: 40px;
}
.origin-2 {
  left: calc(50% - 39px);
  top: 40px;
}
.origin-3 {
  top: 40px;
  left: calc(100% - 135px);
}
.origin-4 {
  top: calc(50% - 60px);
  left: 80px;
}
.origin-5 {
  top: calc(50% - 60px);
  left: calc(100% - 135px);
}
.origin-6 {
  top: calc(100% - 120px);
  left: 80px;
}
.origin-7 {
  top: calc(100% - 120px);
  left: calc(50% - 39px);
}
.origin-8 {
  top: calc(100% - 120px);
  left: calc(100% - 135px);
}
.destination-0 {
  left: calc(50% - 83px);
  top: calc(50% - 98px);
}
.token.destination-0 {
  top: calc(50% - 64px);
  left: calc(50% + 28px);
}
.destination-1 {
  left: 80px;
  top: 40px;
}
.destination-2 {
  left: calc(50% - 39px);
  top: 40px;
}
.destination-3 {
  top: 40px;
  left: calc(100% - 135px);
}
.destination-4 {
  top: calc(50% - 60px);
  left: 80px;
}
.destination-5 {
  top: calc(50% - 60px);
  left: calc(100% - 135px);
}
.destination-6 {
  top: calc(100% - 120px);
  left: 80px;
}
.destination-7 {
  top: calc(100% - 120px);
  left: calc(50% - 39px);
}
.destination-8 {
  top: calc(100% - 120px);
  left: calc(100% - 135px);
}
</style>
