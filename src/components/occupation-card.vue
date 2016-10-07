<template>
  <div :class="status" class="card-wrapper">
    <div class="occupation-card" @click.stop="onClick">
      <header>{{* card.name }}</header>
      <div class="description">{{* card.description }}</div>
    </div>
  </div>
</template>

<script>
export default {
  props: ['card'],
  data () {
    return {
      status: {
        selectable: false,
        selected: false
      }
    }
  },
  methods: {
    onClick () {
      if (this.status.selected) return;
      this.$dispatch('card.selected', this.card);
    }
  },
  events: {
    'card.selected.confirmed' (card) {
      if (card.uid === this.card.uid) this.status.selected = true;
    },
    'card.reset' () { this.status.selected = false; }
  }
}
</script>

<style lang="scss">
@import '../settings.scss';

  .selectable .occupation-card{
    animation: slow-flash .5s infinite alternate;
    cursor: pointer;
  }

  .selected .occupation-card{
    border-color: $selected;
    box-shadow: 2px 2px 8px fade-out($selected, 0.1);
  }

  .occupation-card{
    width: $card-width;
    padding: 4px;
    text-align: center;
    border: 3px solid $black;
    border-radius: 10px;
    height: $item-card-height;
    overflow: hidden;
    background: radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.2) 100%), url(../assets/canvas.jpg);
    position: relative;
    box-shadow: 4px 4px 15px rgba(14,3,32,0.6);
    header{
      color: #000;
      font-size: 20px;
      font-family: Cassandra;
    }
    .description{
      font-size: 10px;
      color: #333;
    }
  }
</style>
