const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const template = fs.readFileSync(path.join(root, 'src', 'template.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8');
const calcJs = fs.readFileSync(path.join(root, 'src', 'calc.js'), 'utf8');
const uiJs = fs.readFileSync(path.join(root, 'src', 'ui.js'), 'utf8');

const output = template
  .replace('/*STYLES*/', styles)
  .replace('/*CALC_JS*/', calcJs)
  .replace('/*UI_JS*/', uiJs);

fs.writeFileSync(path.join(root, 'index.html'), output);
console.log('Built index.html');
