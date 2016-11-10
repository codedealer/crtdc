<template>
  <div class="card-back" :class="cardClass" v-show="show">
  </div>
</template>

<script>
import EventEmitter from '../core/eventemitter'

export default {
  ready () {
    this.em.on('cardback.show', player => {
      this.origin = this.seatLookUp(player);
      console.log(this.origin);
      this.show = true;
    });

    this.em.on('cardback.destination', player => {
      this.destination = this.seatLookUp(player);
      console.log(this.destination);
    });

    this.em.on('cardback.hide', () => {
      this.show = false;
      this.destination = false;
    });
  },
  data () {
    return {
      em: EventEmitter.getInstance(),
      show: false,
      origin: 0,
      destination: false
    }
  },
  computed: {
    cardClass () {
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
        'card-transition': false
      };

      o[`origin-${this.origin}`] = true;
      if (this.destination !== false) {
        o['card-transition'] = true;
        o[`destination-${this.destination}`] = true;
      }

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
.card-transition {
  transition: all ease-out .7s;
  transform: rotate(50deg);
}
.origin-0 {
  top: calc(50% - 98px);
  left: calc(50% - 39px);
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
