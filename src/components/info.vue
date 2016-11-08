<template>
  <section class="info-container c-widget">
    <component :options="options" :is="currentWidget"></component>
  </section>
</template>

<script>
import lobby from './lobby'
import assistant from './assistant'
import PlayerStatus from '../player/status'

export default {
  props: ['players', 'canStart', 'user', 'started'],
  data () {
    return { }
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
