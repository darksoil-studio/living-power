import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';
import '@shoelace-style/shoelace/dist/components/menu/menu.js';
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

function browserType(): 'windows' | 'macos-intel' | 'macos-aarch' | 'linux' {
	const ua = navigator.userAgent.toLowerCase();

	if (ua.includes('windows')) return 'windows';
	if (ua.includes('mac')) {
		if (ua.includes('intel')) return 'macos-intel';
		else return 'macos-aarch';
	}
	return 'linux';
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

	render() {
		return html`<div style="display:flex; flex-direction:row;">
			<sl-button href=""></sl-button>
			<sl-dropdown
				><sl-icon-button slot="trigger"> </sl-icon-button>
				<sl-menu>
					<sl-menu-item>Item 1</sl-menu-item>
					<sl-menu-item>Item 2</sl-menu-item>
					<sl-menu-item>Item 3</sl-menu-item>
				</sl-menu>
			</sl-dropdown>
		</div>`;
	}
}
