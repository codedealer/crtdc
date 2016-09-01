let types = {
  GENERIC: 0,
  OK: 1,
  YESNO: 2
}

export default class Modal {
  constructor (buttons) {
    this.buttons = buttons;
    this._types = types;
    this.type = types.GENERIC;
  }
}

export class ModalOK extends Modal {
  constructor (title = 'OK') {
    super([{ title }]);
    this.type = types.OK;
  }
}

export class ModalYesNo extends Modal {
  constructor (title1 = 'OK', title2 = 'Отмена') {
    super([{ title: title1 }, { title: title2 }]);
    this.type = types.YESNO;
  }
}
