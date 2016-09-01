<template>
  <section class="control-container c-widget">
    <div class="c-top-shelf-container">
      <top-shelf v-if="started" :player="self"></top-shelf>
    </div>
    <div class="c-hand-container">
      <hand v-if="started" :hand="self.hand"></hand>
    </div>
    <div class="c-button-container">
      <button @click="toggleReady" class="toggler" :class="{ 'pressed': ready }" v-show="!started && status !== notConnected">{{readyText}}</button>
      <modal v-show="showModal" :options="modalOptions"></modal>
    </div>
  </section>
</template>

<script>
import EventEmitter from '../core/eventemitter'
import gameStatus from '../world/status'

import topShelf from './top-shelf'
import hand from './hand'
import modal from './modal'

export default {
  props: ['started', 'players', 'user', 'status'],
  ready () {
    this.em.on('modal.show', (options) => {
      this.modalOptions = options;
      this.showModal = true;
    });
    this.em.on(['modal.dismiss', 'turn.new'], () => {
      this.showModal = false;
      this.em.emit('modal.exec', null);
    });
  },
  data () {
    return {
      ready: false,
      em: EventEmitter.getInstance(),
      showModal: false,
      notConnected: gameStatus.PREJOIN,
      modalOptions: {}
    }
  },
  computed: {
    readyText () {
      return this.ready ? 'Отмена' : 'Готов';
    },
    self () {
      return this.players.find(x => x.uid === this.user.uid);
    }
  },
  methods: {
    toggleReady () {
      this.ready = !this.ready;
      this.em.emit('self.player_ready', this.ready);
    }
  },
  events: {
    modal (arg) {
      this.em.emit('modal.exec', arg);
      this.showModal = false;
    }
  },
  components: {
    topShelf,
    hand,
    modal
  }
}
</script>

<style lang="scss">
@import '../settings.scss';

.control-container{
  flex: 1 1 auto;
  align-self: auto;
  background: #222;
  text-align: center;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-wrap: nowrap;
  justify-content: flex-start;
  align-content: stretch;
  align-items: stretch;
  background: radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%,rgba(0,0,0,0.75) 50%,rgba(0,0,0,0.95) 100%), url(../assets/canvas.jpg) repeat;
}

.c-top-shelf-container,
.c-hand-container,
.c-button-container{
  order: 0;
  flex: 0 1 auto;
  align-self: auto;
}

.c-hand-container{
  flex: 1 1 auto;
}

.c-top-shelf-container{
  height: $top-shelf-height;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: space-between;
  align-content: center;
  align-items: center;
  > div{
    order: 0;
    flex: 0 1 auto;
    align-self: auto;
  }
  background: linear-gradient(135deg, rgba(104,103,104,0) 0%,rgba(2,2,2,1) 100%), url(../assets/panel.jpg);
  box-shadow: 0 0 10px rgba(0,0,0,0.8);
}

.c-hand-container{
  position: relative;
}

.c-button-container{
  height: $bottom-shelf-height;
  background: linear-gradient(135deg, rgba(104,103,104,0) 0%,rgba(2,2,2,1) 100%), url(../assets/panel.jpg);
  box-shadow: 0 0 10px rgba(0,0,0,0.8);
}

.toggler{
  width: 130px;
  @extend %purple-button;
  &.pressed{
    @extend %purple-button-active;
  }
  &:hover{
    transition: color 200ms linear, text-shadow 500ms linear;
  }
}
</style>
