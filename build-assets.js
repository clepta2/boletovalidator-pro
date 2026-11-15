import fs from 'fs';

const stylesCss = fs.readFileSync('styles.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const clientJs = fs.readFileSync('boletovalidator-pro.js', 'utf8');
const markSvg = fs.readFileSync('brand/ozpro-mark.svg', 'utf8');

const content = `// site-assets.js
export const STYLES_CSS = ${JSON.stringify(stylesCss)};
export const HTML_INDEX = ${JSON.stringify(html)};
export const CLIENT_JS = ${JSON.stringify(clientJs)};
export const OZPRO_MARK_SVG = ${JSON.stringify(markSvg)};
`;

fs.writeFileSync('site-assets.js', content, 'utf8');
console.log('boletovalidator-pro site-assets.js generated successfully!');
