<template>
  <div class="board">
    <div class="board-row">
      <div class="board-player-placeholder">
        <board-player :player="players[seats[0]]" :user="userPlayer" v-if="seats[0] !== false"></board-player>
      </div>
      <div class="board-player-placeholder">
        <board-player :player="players[seats[1]]" :user="userPlayer" v-if="seats[1] !== false"></board-player>
      </div>
      <div class="board-player-placeholder">
        <board-player :player="players[seats[2]]" :user="userPlayer" v-if="seats[2] !== false"></board-player>
      </div>
    </div>
    <div class="board-row">
      <div class="board-player-placeholder">
        <board-player :player="players[seats[3]]" :user="userPlayer" v-if="seats[3] !== false"></board-player>
      </div>

      <context-container></context-container>

      <div class="board-player-placeholder">
        <board-player :player="players[seats[4]]" :user="userPlayer" v-if="seats[4] !== false"></board-player>
      </div>
    </div>
    <div class="board-row">
      <div class="board-player-placeholder">
        <board-player :player="players[seats[5]]" :user="userPlayer" v-if="seats[5] !== false"></board-player>
      </div>
      <div class="board-player-placeholder">
        <board-player :player="players[seats[6]]" :user="userPlayer" v-if="seats[6] !== false"></board-player>
      </div>
      <div class="board-player-placeholder">
        <board-player :player="players[seats[7]]" :user="userPlayer" v-if="seats[7] !== false"></board-player>
      </div>
    </div>

    <!-- card templates -->
    <animation-puppet :index="0"></animation-puppet>
  </div>
</template>

<script>
import boardPlayer from './board-player'
import animationPuppet from './animation-puppet'
import contextContainer from './context-container'

import EventEmitter from '../core/eventemitter'
import {ModalOK} from '../modal'

export default {
  props: ['players', 'user'],
  ready () {
    this.em.on('board.player-selector.init', (options, callback) => {
      this.playersToSelect = options.numPlayers || 1;
      this.selectedPlayers = [];
      this.callback = callback;
      this.selectable = true;

      if (options.dismissable) {
        this.em.once('modal.exec', (arg) => {
          this.selectable = false;
          this.$broadcast('b.selectable.close');
          if (typeof this.callback === 'function') this.callback(arg);
        });
        this.em.emit('modal.show', new ModalOK());
      }

      this.$broadcast('b.selectable.init', options.exclude);
    });
  },
  data () {
    return {
      em: EventEmitter.getInstance(),
      selectable: false,
      selectedPlayers: [],
      playersToSelect: 0,
      callback: null,
      seatsToFill: {
        0: [],
        1: [0],
        2: [1, 6],
        3: [0, 4, 5],
        4: [1, 4, 6, 3],
        5: [0, 2, 7, 5, 3],
        6: [0, 1, 2, 7, 6, 5],
        7: [0, 1, 2, 4, 7, 6, 5],
        8: [0, 1, 2, 4, 7, 6, 5, 3]
      }
    }
  },
  computed: {
    userPlayer () {
      let userIndex = this.players.findIndex(x => x.uid === this.user.uid);

      return this.players[userIndex];
    },
    seats () {
      let conditions = new Array(8).fill(false);
      let len = this.players.length;

      let designatedSeats = this.seatsToFill[len];

      //here seat is the place on board a player will take
      //and index is thier index in turn queue
      designatedSeats.forEach((seat, index) => {
        conditions[seat] = index;
      });

      return conditions;
    }
  },
  events: {
    'b.select-target' (player) {
      if (this.selectable !== true) return;

      this.selectedPlayers.push(player);

      if (this.selectedPlayers.length === this.playersToSelect) {
        this.selectable = false;
        this.$broadcast('b.selectable.close');
        if (typeof this.callback === 'function') this.callback(this.selectedPlayers);
      }
    }
  },
  components: {
    boardPlayer,
    contextContainer,
    animationPuppet
  }
}
</script>

<style lang="scss">
  @import '../settings.scss';

  %default-flex-item{
    order: 0;
    flex: 0 1 auto;
    align-self: auto;
  }
  .board{
    order: 0;
    flex: 1 1 auto;
    align-self: stretch;
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    justify-content: space-between;
    align-content: stretch;
    align-items: stretch;
    position: relative;
  }
  .board-row{
    @extend %default-flex-item;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: space-between;
    align-content: stretch;
    align-items: center;
  }
  .board-row:nth-child(2){
    flex: 1 1 auto;
  }
  .board-player-placeholder{
    @extend %default-flex-item;
    min-width: $board-player-min-width;
  }
  .context-field-container{
    @extend %default-flex-item;
    position: relative;
    min-width: $context-field-container-width;
    min-height: $item-card-height;
  }
</style>
