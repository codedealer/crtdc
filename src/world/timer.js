export default class Timer {
  constructor (time, intervalFunc, doneFunc, context = false, interval = 1000) {
    if (typeof intervalFunc === 'function') {
      this.intervalFunc = context ? intervalFunc.bind(context) : intervalFunc;
    } else {
      this.intervalFunc = false;
    }

    if (typeof intervalFunc === 'function') {
      this.doneFunc = context ? doneFunc.bind(context) : doneFunc;
    } else {
      this.doneFunc = false;
    }
    this.interval = interval;
    this.time = time;
    this.ended = false;

    this.intervalId = setInterval(this.onInterval.bind(this), interval);
  }
  onInterval () {
    this.time -= this.interval;

    if (this.time >= this.interval) {
      if (this.intervalFunc !== false) this.intervalFunc(this.time);
    } else {
      this.cancel();

      if (this.doneFunc !== false) this.doneFunc();
    }
  }
  cancel () {
    clearInterval(this.intervalId);
    this.ended = true;
  }
}
