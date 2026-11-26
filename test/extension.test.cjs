const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const manifest = require('../package.json');
const localization = require('../dist/localization.js');

const root = join(__dirname, '..');
function fixture(openExternal, { editor = 'en', selected = 'auto', pick, native = message => message } = {}) {
  const commands = new Map();
  const errors = [], notices = [], subscriptions = [], changes = [];
  let choiceList, pickOptions, provider;
  const disposable = { dispose() {} };
  const configuration = {
    get(key, fallback) { assert.equal(key, 'language'); return selected ?? fallback; },
    async update(key, value, target) {
      assert.equal(key, 'language'); assert.equal(target, 1);
      selected = value;
      for (const listener of changes) listener({ affectsConfiguration: setting => setting === 'yapi.language' });
    },
  };
  const vscode = {
    commands: {
      registerCommand(id, action) { commands.set(id, action); return disposable; },
    },
    env: { openExternal, language: editor },
    Uri: { parse: value => value },
    l10n: { t: native },
    ConfigurationTarget: { Global: 1 },
    workspace: {
      getConfiguration(section) { assert.equal(section, 'yapi'); return configuration; },
      onDidChangeConfiguration(listener) { changes.push(listener); return disposable; },
    },
    window: {
      showErrorMessage: message => errors.push(message),
      showInformationMessage: message => notices.push(message),
      async showQuickPick(choices, options) { choiceList = choices; pickOptions = options; return choices.find(choice => choice.value === pick); },
      registerWebviewViewProvider(id, instance) { assert.equal(id, 'yapi.portal'); provider = instance; return disposable; },
    },
  };
  const exports = {};
  const source = readFileSync(join(root, manifest.main), 'utf8');
  vm.runInNewContext(source, {
    exports,
    require(id) {
      if (id === 'vscode') return vscode;
      if (id === './localization') return localization;
      throw new Error('Unexpected module ' + id);
    },
  });
  exports.activate({ subscriptions });
  assert.equal(subscriptions.length, 5);
  assert.deepEqual([...commands.keys()].sort(), manifest.contributes.commands.map(command => command.command).sort());
  assert.ok(provider);
  const view = { webview: {}, onDidDispose() { return disposable; } };
  provider.resolveWebviewView(view);
  return { commands, errors, notices, view, get selected() { return selected; }, get choices() { return choiceList; }, get pickOptions() { return pickOptions; } };
}

test('registers the commands and opens the official portal', async () => {
  let url;
  const { commands, errors, view } = fixture(async value => { url = value; return true; });
  await commands.get('yapi.openPortal')();
  assert.equal(url, 'https://yapi.net');
  assert.deepEqual(errors, []);
  assert.match(view.webview.html, /command:yapi.openPortal/);
  assert.equal(view.webview.options.enableCommandUris.length, 2);
});

test('reports browser errors in the selected language', async () => {
  for (const openExternal of [async () => false, async () => { throw new Error('unavailable'); }]) {
    const { commands, errors } = fixture(openExternal, { selected: 'tr' });
    await commands.get('yapi.openPortal')();
    assert.deepEqual(errors, ['Yapi.net açılamadı.']);
  }
});

test('language picker includes all Yapi locales and updates the sidebar and global setting immediately', async () => {
  const f = fixture(async () => true, { editor: 'tr', pick: 'ar' });
  assert.match(f.view.webview.html, /<html lang="tr" dir="ltr">/);
  assert.match(f.view.webview.html, /Portalı Aç/);
  await f.commands.get('yapi.changeLanguage')();
  assert.deepEqual(Array.from(f.choices, item => item.value), ['auto', ...localization.languages.map(entry => entry.locale)]);
  assert.equal(f.pickOptions.placeHolder, 'Yapi dilinizi seçin');
  assert.equal(f.selected, 'ar');
  assert.match(f.view.webview.html, /<html lang="ar" dir="rtl">/);
  assert.match(f.view.webview.html, /فتح البوابة/);
  assert.deepEqual(f.notices, ['تم تحديث لغة Yapi.']);
});

test('automatic locale matches VS Code regions and unsupported languages fall back to English', () => {
  assert.equal(localization.resolveLocale('auto', 'zh-CN'), 'zh');
  assert.equal(localization.resolveLocale('auto', 'tr-TR'), 'tr');
  assert.equal(localization.resolveLocale('auto', 'fr-FR'), 'en');
  assert.match(fixture(async () => true, { editor: 'zh-cn' }).view.webview.html, /打开门户/);
  assert.match(fixture(async () => true, { editor: 'fr' }).view.webview.html, /Open Portal/);
});

test('all 15 product languages contain every manifest and runtime string, and render correctly', () => {
  const expected = require('./expected-locales.json');
  assert.deepEqual(localization.languages.map(entry => entry.locale), expected);
  assert.equal(expected.length, 15);
  assert.deepEqual(manifest.contributes.configuration.properties['yapi.language'].enum, ['auto', ...expected]);
  const englishManifest = require('../package.nls.json');
  const englishRuntime = require('../l10n/bundle.l10n.json');
  for (const locale of expected) {
    const suffix = locale === 'en' ? '' : '.' + locale;
    const localizedManifest = require('../package.nls' + suffix + '.json');
    const localizedRuntime = require('../l10n/bundle.l10n' + suffix + '.json');
    assert.deepEqual(Object.keys(localizedManifest).sort(), Object.keys(englishManifest).sort(), locale);
    assert.deepEqual(Object.keys(localizedRuntime).sort(), Object.keys(englishRuntime).sort(), locale);
    for (const value of [...Object.values(localizedManifest), ...Object.values(localizedRuntime)]) assert.ok(value.trim(), locale);
    const f = fixture(async () => true, { selected: locale });
    assert.ok(f.view.webview.html.includes('lang="' + locale + '" dir="' + localization.direction(locale) + '"'));
    assert.ok(f.view.webview.html.includes(localizedRuntime['Open Portal']), locale);
    assert.equal(f.view.title, localizedRuntime['Property Portal']);
  }
  assert.deepEqual(require('../package.nls.zh-cn.json'), require('../package.nls.zh.json'));
  assert.deepEqual(require('../l10n/bundle.l10n.zh-cn.json'), require('../l10n/bundle.l10n.zh.json'));
});

test('package has a visible Yapi secondary sidebar container and valid brand icons', () => {
  const container = manifest.contributes.viewsContainers.secondarySidebar[0];
  assert.equal(container.id, 'yapi');
  assert.equal(manifest.contributes.views[container.id][0].id, 'yapi.portal');
  assert.equal(manifest.contributes.views[container.id][0].visibility, 'visible');
  assert.ok(existsSync(join(root, container.icon)));
  const icon = readFileSync(join(root, manifest.icon));
  assert.equal(icon.subarray(1, 4).toString(), 'PNG');
  assert.ok(icon.readUInt32BE(16) >= 128);
  assert.ok(icon.readUInt32BE(20) >= 128);
});
