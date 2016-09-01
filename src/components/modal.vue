<template>
  <div class="modal-wrapper">
    <button v-for="button in options.buttons" class="b-{{$index}}" @click.stop="exec">{{* button.title }}</button>
  </div>
</template>

<script>
export default {
  props: ['options'],
  data () {
    return {}
  },
  methods: {
    exec (event) {
      let arg = event;

      if (this.options.type === this.options._types.OK) arg = true;
      else if (this.options.type === this.options._types.YESNO) {
        arg = event.target.className === 'b-0';
      }

      this.$dispatch('modal', arg);
    }
  }
}
</script>

<style lang="scss">
  @import '../settings.scss';

  .modal-wrapper{
    display: inline-block;
    button{
      min-width: 70px;
      border-radius: 0;
      float: left;
      transition: color 200ms linear, text-shadow 500ms linear;
      @extend %purple-button;
      @extend %flicker;
      &:active{
        @extend %purple-button-active;
      }
      &:first-of-type{
        border-radius: 8px 0 0 8px;
      }
      &:last-of-type{
        border-radius: 0 8px 8px 0;
        &.b-0{
          border-radius: 8px;
        }
      }
    }
  }
</style>
