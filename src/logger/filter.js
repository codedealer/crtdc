import characters from '../cards/characters.json'
import {brotherhood, order} from '../cards/allegiance'

let names = [];
let allegiance = [order.title, brotherhood.title];
const classes = {
  names: 'chat-name',
  order: order.cssClass,
  brotherhood: brotherhood.cssClass
}

export default class {
  constructor () {
    names = characters.map(character => {
      return character.name;
    });
  }
  filter (message) {
    //names highlight
    let nameRegex = new RegExp('(' + names.join('|') + ')', 'g');
    let allegianceRegex = new RegExp('(' + allegiance.join('|') + ')', 'g');

    let filteredMessage = message.replace(nameRegex, '<span class="' + classes.names + '">$1</span>');
    filteredMessage = filteredMessage.replace(allegianceRegex, (match) => {
      let cssClass;
      if (match === order.title) cssClass = classes.order;
      else cssClass = classes.brotherhood;

      return `<span class="${cssClass}">${match}</span>`;
    });

    return filteredMessage;
  }
}
