#!/usr/bin/env node
/**
 * Guard IMI public destinations: Forge must be a real same-tab URL,
 * and IMI must not point at the broken Intek /store path.
 */
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var FORGE = 'https://onemissionnetworkandinstitute.org/forge';
var STORE_DEAD = /intekspace\.com\/store/i;
var ABOUT_BLANK = /about:blank/i;
var FORGE_HTML = /onemissionnetworkandinstitute\.org\/forge\.html/i;

var files = [
  'site-registry.json',
  'js/site-chrome.js',
  'index.html',
  'about.html',
  'videos.html',
];

var failures = [];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

files.forEach(function (rel) {
  var src = read(rel);
  if (STORE_DEAD.test(src)) {
    failures.push(rel + ': still links to intekspace.com/store (404)');
  }
  if (ABOUT_BLANK.test(src)) {
    failures.push(rel + ': contains about:blank (dead launch)');
  }
  if (FORGE_HTML.test(src)) {
    failures.push(rel + ': Forge still uses forge.html (301 hop / dead-tab launch)');
  }
});

var registry = JSON.parse(read('site-registry.json'));
var nav = (registry.chrome && registry.chrome.nav) || [];
var forge = nav.filter(function (n) {
  return n && /forge/i.test(n.label);
});
if (forge.length !== 1) {
  failures.push('site-registry.json: expected exactly one Forge nav item, got ' + forge.length);
} else {
  if (forge[0].href !== FORGE) {
    failures.push('site-registry.json: Forge href must be ' + FORGE + ' (got ' + forge[0].href + ')');
  }
  if (forge[0].external) {
    failures.push('site-registry.json: Forge must not be external (target=_blank dies on about:blank)');
  }
}

var vision = nav.filter(function (n) {
  return n && /vision/i.test(n.label);
});
if (vision.length) {
  if (/forge/i.test(vision[0].href || '')) {
    failures.push('site-registry.json: Vision must not point at Forge');
  }
}

var chrome = read('js/site-chrome.js');
if (!chrome.includes(FORGE)) {
  failures.push('js/site-chrome.js: fallback chrome must include canonical Forge URL');
}
if (/item\.external\s*\?\s*' target="_blank"/.test(chrome)) {
  failures.push('js/site-chrome.js: nav still opens target=_blank (blank-tab / dead launch)');
}

var index = read('index.html');
if (!index.includes(FORGE)) {
  failures.push('index.html: missing same-tab Forge destination ' + FORGE);
}

if (failures.length) {
  console.error('public-link check failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('public-link check ok');
