import Timer from './timer'

export default class PromiseTimer {
  constructor (time) {
    if (time < 100) time = 100;

    return new Promise((resolve, reject) => {
      return new Timer(time, false,
            () => { resolve() },
            false, time);
    });
  }
}
