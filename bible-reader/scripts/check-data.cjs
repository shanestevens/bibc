const fs = require('fs');
const booksDir = 'C:/Users/shane/dev/proj/ai/claude/bibc/bible-reader/src/data/books';
const files = fs.readdirSync(booksDir);
const issues = [];

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(booksDir + '/' + file));
  for (const ch of data.chapters) {
    for (const para of ch.paragraphs) {
      for (const verse of para.verses) {
        const segs = verse.kind === 'prose'
          ? verse.segments
          : verse.lines.flatMap(l => l.segments);
        for (const seg of segs) {
          const t = seg.text;
          // Backslash indicates unstripped USFM
          if (t.indexOf('\\') !== -1) {
            issues.push('[BACKSLASH] ' + file + ' ' + ch.number + ':' + verse.num + ' => ' + t.slice(0,100));
          }
          // Pipe+strong indicates unstripped Strong's
          if (t.indexOf('|strong') !== -1) {
            issues.push('[STRONG] ' + file + ' ' + ch.number + ':' + verse.num + ' => ' + t.slice(0,100));
          }
          // Empty text segment
          if (t.trim() === '') {
            issues.push('[EMPTY] ' + file + ' ' + ch.number + ':' + verse.num);
          }
        }
      }
    }
  }
}
console.log(issues.length + ' issues found');
issues.slice(0, 30).forEach(i => console.log(i));
