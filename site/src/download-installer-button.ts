import { wrapPathInSvg } from '@holochain-open-dev/elements';
import { mdiDownload } from '@mdi/js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';
import '@shoelace-style/shoelace/dist/components/menu/menu.js';
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

type BrowserType = 'Windows' | 'MacOS Intel' | 'MacOS Silicon' | 'Linux';

const allBrowsersTypes: BrowserType[] = [
	'Windows',
	'MacOS Intel',
	'MacOS Silicon',
	'Linux',
];

function browserType(): BrowserType {
	const ua = navigator.userAgent.toLowerCase();

	if (ua.includes('windows')) return 'Windows';
	if (ua.includes('mac')) {
		if (ua.includes('intel')) return 'MacOS Intel';
		else return 'MacOS Silicon';
	}
	return 'Linux';
}

@customElement('download-installer-button')
export class DownloadInstallerButton extends LitElement {
	@property({ attribute: 'linux-url' })
	linuxUrl: string | undefined;

	@property({ attribute: 'mac-intel-url' })
	macIntelUrl: string | undefined;

	@property({ attribute: 'mac-aarch-url' })
	macAarchUrl: string | undefined;

	@property({ attribute: 'windows-url' })
	windowsUrl: string | undefined;

	getUrlFor(browser: BrowserType) {
		switch (browser) {
			case 'Windows':
				return this.windowsUrl;
			case 'MacOS Intel':
				return this.macIntelUrl;
			case 'MacOS Silicon':
				return this.macAarchUrl;
			case 'Linux':
				return this.linuxUrl;
		}
	}

	render() {
		const browser = browserType();
		return html`<div style="display:flex; flex-direction:row;">
			<sl-button href="${this.getUrlFor(browser)}">
				<sl-icon slot="prefix" .src=${wrapPathInSvg(mdiDownload)}></sl-icon>
				${browser}</sl-button
			>
			<sl-dropdown
				><sl-icon-button slot="trigger"> </sl-icon-button>
				<sl-menu>
					${allBrowsersTypes
						.filter(b => b !== browser)
						.map(
							browser => html`
								<sl-button href="${this.getUrlFor(browser)}"
									>${browser}</sl-button
								>
							`,
						)}
				</sl-menu>
			</sl-dropdown>
		</div>`;
	}
}
