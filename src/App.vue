<template>
  <div id="game-container" @click="resetTarget">
    <section class="board-wrapper">
      <board v-if="world.started" :players="world.players" :user="world.user"></board>
    </section>
    <section class="control-bar-wrapper">
      <div class="control-bar">
        <info :players="world.players" :user="world.user" :started="world.started" :can-start="canStart" v-if="gmStatuses.PREJOIN !== world.status"></info>
        <control :started="world.started" :status="world.status" :players="world.players" :user="world.user"></control>
        <chat :players="world.players" :user="world.user"></chat>
      </div>
    </section>
  </div>
</template>

<script>
import chat from './components/chat'
import info from './components/info'
import control from './components/control'
import board from './components/board'

import User from './core/user'
import World from './world'
import GameStatus from './world/status'

import tc from './turn/turncoordinator'
import rc from './world/rulecoordinator'

export default {
  data () {
    return {
      world: new World(new User()),
      gmStatuses: GameStatus,
      tc,
      rc
    }
  },
  computed: {
    canStart () {
      return this.world.players.length >= this.world.settings.PLAYERS_MIN;
    }
  },
  methods: {
    resetTarget () {
      this.$broadcast('as.change-target', null);
    }
  },
  events: {
    'b.change-target' (player) {
      //receive from one child and pass to another
      this.$broadcast('as.change-target', player);
    }
  },
  components: {
    chat,
    info,
    control,
    board
  }
}
</script>

<style lang="scss">
@import './settings.scss';

@font-face {
  font-family: Cassandra;
  src: url(./assets/Cassandra.ttf);
}

@import url(https://fonts.googleapis.com/css?family=Open+Sans&subset=latin,cyrillic);

@font-face {
  font-family: 'fontello';
  src: url('./assets/icons/fontello.eot?7503979');
  src: url('./assets/icons/fontello.eot?7503979#iefix') format('embedded-opentype'),
       url('./assets/icons/fontello.woff2?7503979') format('woff2'),
       url('./assets/icons/fontello.woff?7503979') format('woff'),
       url('./assets/icons/fontello.ttf?7503979') format('truetype'),
       url('./assets/icons/fontello.svg?7503979#fontello') format('svg');
  font-weight: normal;
  font-style: normal;
}

html {
  height: 100%;
}
*{
  box-sizing: border-box;
}
body {
  height: 100%;
  background: $dark-gray;
  font-family: 'Open Sans', sans-serif;
}
header, h1, h2, h3, h4 {
  font-family: Cassandra, Helvetica;
  font-size: 20px;
  font-weight: 600;
}
[class^="icon-"]:before, [class*=" icon-"]:before {
  font-family: "fontello";
  font-style: normal;
  font-weight: normal;
  speak: none;

  display: inline-block;
  text-decoration: inherit;
  width: 1em;
  margin-right: .2em;
  text-align: center;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.icon-search:before { content: '\e800'; }
.icon-arrows-ccw:before { content: '\e801'; }
.icon-flag-checkered:before { content: '\f11e'; }
.icon-shield:before { content: '\f132'; }
#game-container{
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  justify-content: flex-end;
  align-content: stretch;
  align-items: stretch;
  max-width: 100%;
  height: 100%;
  width: 100%;
}
.board-wrapper{
  background: url(./assets/leather-bg.jpg) repeat;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: flex-start;
  align-content: stretch;
  align-items: stretch;
}
.control-bar-wrapper{
  order: 0;
  flex: 0 1 auto;
  align-self: auto;
}
.board-wrapper{
  @extend .control-bar-wrapper;
  flex: 1 1 auto;
}
.control-bar{
  height: $control-bar-height;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: flex-start;
  align-content: stretch;
  align-items: stretch;
}
.c-widget{
  flex: 0 1 auto;
  align-self: auto;
}
</style>
