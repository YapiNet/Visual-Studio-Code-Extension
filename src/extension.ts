import * as vscode from 'vscode';
import { direction, languages, resolveLocale, translate, type LanguagePreference } from './localization';

const portalUrl = 'https://yapi.net';
const viewId = 'yapi.portal';

function preference(): LanguagePreference {
  const value = vscode.workspace.getConfiguration('yapi').get<string>('language', 'auto');
  return languages.find(entry => entry.locale === value)?.locale ?? 'auto';
}

function currentLocale() {
  return resolveLocale(preference(), vscode.env.language);
}

function t(message: string): string {
  // VS Code's native bundle supports editor-language localization. The local
  // bundle also lets Yapi offer all product languages independently of editor packs.
  if (preference() === 'auto') {
    const localized = vscode.l10n.t(message);
    if (localized !== message) return localized;
  }
  return translate(currentLocale(), message);
}

interface LanguagePick extends vscode.QuickPickItem {
  value: LanguagePreference;
}

async function changeLanguage(): Promise<void> {
  const choices: LanguagePick[] = [
    { label: t('Use VS Code display language'), value: 'auto' },
    ...languages.map(({ locale, name }) => ({ label: name, value: locale })),
  ];
  const selected = await vscode.window.showQuickPick(choices, { placeHolder: t('Choose your Yapi language') });
  if (!selected) return;
  await vscode.workspace.getConfiguration('yapi').update('language', selected.value, vscode.ConfigurationTarget.Global);
  void vscode.window.showInformationMessage(t('Yapi language updated.'));
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

class PortalView implements vscode.WebviewViewProvider, vscode.Disposable {
  private view?: vscode.WebviewView;

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableCommandUris: ['yapi.openPortal', 'yapi.changeLanguage'], localResourceRoots: [] };
    view.onDidDispose(() => { if (this.view === view) this.view = undefined; });
    this.refresh();
  }

  refresh(): void {
    if (!this.view) return;
    const locale = currentLocale();
    const language = languages.find(entry => entry.locale === locale)!.name;
    const label = preference() === 'auto' ? `${language} · ${t('Use VS Code display language')}` : language;
    this.view.title = t('Property Portal');
    this.view.webview.html = `<!DOCTYPE html>
<html lang="${locale}" dir="${direction(locale)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
<style>
body { margin: 0; padding: 16px 14px; color: var(--vscode-foreground); font: var(--vscode-font-size) var(--vscode-font-family); }
h1 { font-size: 19px; font-weight: 650; margin: 2px 0 8px; }
p { line-height: 1.6; margin: 0 0 18px; color: var(--vscode-descriptionForeground); }
a { display: block; text-decoration: none; text-align: center; border-radius: 4px; padding: 8px 10px; font-weight: 600; color: var(--vscode-button-foreground); background: var(--vscode-button-background); }
a:hover { background: var(--vscode-button-hoverBackground); }
a:focus-visible { outline: 2px solid var(--vscode-focusBorder); outline-offset: 2px; }
section { margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--vscode-panel-border); }
small { display: block; color: var(--vscode-descriptionForeground); overflow-wrap: anywhere; margin: 5px 0 12px; }
.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
</style>
</head>
<body>
<h1>yapi.net</h1>
<p>${escapeHtml(t('Discover properties, publish requests and manage your real estate office with Yapi.net.'))}</p>
<a href="command:yapi.openPortal">${escapeHtml(t('Open Portal'))}</a>
<section aria-label="${escapeHtml(t('Language'))}">
<strong>${escapeHtml(t('Language'))}</strong>
<small>${escapeHtml(label)}</small>
<a class="secondary" href="command:yapi.changeLanguage">${escapeHtml(t('Change Language'))}</a>
</section>
</body></html>`;
  }

  dispose(): void {
    this.view = undefined;
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const portal = new PortalView();
  context.subscriptions.push(
    portal,
    vscode.window.registerWebviewViewProvider(viewId, portal),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('yapi.language')) portal.refresh();
    }),
    vscode.commands.registerCommand('yapi.changeLanguage', changeLanguage),
    vscode.commands.registerCommand('yapi.openPortal', async () => {
      try {
        const opened = await vscode.env.openExternal(vscode.Uri.parse(portalUrl));
        if (!opened) void vscode.window.showErrorMessage(t('Yapi.net could not be opened.'));
      } catch {
        void vscode.window.showErrorMessage(t('Yapi.net could not be opened.'));
      }
    }),
  );
}
