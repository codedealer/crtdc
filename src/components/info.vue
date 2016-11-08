<template>
  <section class="info-container c-widget">
    <component :options="options" :is="currentWidget"></component>
  </section>
</template>

<script>
import lobby from './lobby'
import assistant from './assistant'
import PlayerStatus from '../player/status'
import EventEmitter from '../core/eventemitter'

export default {
  props: ['players', 'canStart', 'user', 'started'],
  ready () {
    this.em.on('turn.new', info => {
      this.$broadcast('as-turn-new', info);
    });
    this.em.on('turn.action', () => {
      this.$broadcast('as-turn-action');
    });
    this.em.on('gm.occupation.disclosed', player => {
      this.$broadcast('as-occupation-disclosed', player);
    });
    this.em.on('gm.win', () => {
      this.$broadcast('as-win');
    });
    this.em.on('gm.start', () => {
      this.$broadcast('as-start');
    });
    this.em.on('gm.restrict.turns', () => {
      this.$broadcast('as-restrict');
    });
    this.em.on('gm.allow.turns', () => {
      this.$broadcast('as-allow');
    });
  },
  data () {
    return {
      em: EventEmitter.getInstance()
    }
  },
  computed: {
    currentWidget () {
      let widget = 'lobby';

      if (this.started &&
          this.players[this.selfIndex].status === PlayerStatus.INGAME) {
        widget = 'assistant';
      }
      return widget;
    },
    selfIndex () { return this.players.findIndex(player => player.uid === this.user.uid) },
    options () {
      if (this.currentWidget === 'lobby') {
        return { players: this.players, canStart: this.canStart }
      } else {
        return { selfIndex: this.selfIndex, players: this.players, user: this.user }
      }
    }
  },
  components: {
    lobby,
    assistant
  }
}
</script>

<style lang="scss">
@import '../settings.scss';

.info-container{
  width: $info-width;
  min-width: $info-width;
  background: $black;
  overflow: hidden;
  header{
    text-align: center;
  }
  h1{
    font-size: 28px;
    margin: 10px 0;
    font-weight: normal;
    color: $yellow;
  }
  span{
    font-size: 14px;
    font-family: 'Open Sans';
    color: #fefebe;
  }
}
</style>
