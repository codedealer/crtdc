function hash (str) {
  let hash = 0;
  let chr = 0;

  for (let i = 0, len = str.length; i < len; i++) {
    chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

function seed () {
  let str = new Date().getTime().toString();

  return hash(str);
}

export function objectify (arr) {
  let obj = {};
  if (!Array.isArray(arr) || !arr[0].uid) return obj;

  arr.forEach(x => { obj[x.uid] = true });
  return obj;
}

export { hash, seed };
