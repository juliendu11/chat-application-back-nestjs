function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function replaceAll(str, match, replacement): string {
  return str.replace(new RegExp(escapeRegExp(match), 'g'), () => replacement);
}

export { replaceAll };
