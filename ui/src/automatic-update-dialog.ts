import { SignalWatcher } from '@holochain-open-dev/signals';
import { msg } from '@lit/localize';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import '@shoelace-style/shoelace/dist/components/progress-bar/progress-bar.js';
import { relaunch } from '@tauri-apps/plugin-process';
import { Update, check } from '@tauri-apps/plugin-updater';
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { appStyles } from './app-styles.js';

@customElement('automatic-update-dialog')
export class AutomaticUpdateDialog extends SignalWatcher(LitElement) {
	@state()
	appUpdate: Update | null = null;

	@state()
	downloaded: number = 0;

	@state()
	contentLength: number | undefined;

	async firstUpdated() {
		this.appUpdate = await check();
		if (this.appUpdate) {
			console.log(
				`found update ${this.appUpdate.version} from ${this.appUpdate.date} with notes ${this.appUpdate.body}`,
			);
			// alternatively we could also call update.download() and update.install() separately
			await this.appUpdate.downloadAndInstall(event => {
				switch (event.event) {
					case 'Started':
						this.contentLength = event.data.contentLength;
						console.log(
							`started downloading ${event.data.contentLength} bytes`,
						);
						break;
					case 'Progress':
						this.downloaded += event.data.chunkLength;
						console.log(
							`downloaded ${this.downloaded} from ${this.contentLength}`,
						);
						break;
					case 'Finished':
						console.log('download finished');
						break;
				}
			});

			console.log('update installed');
			await relaunch();
		}
	}

	render() {
		if (!this.appUpdate) return html``;

		return html`
			<sl-dialog
				open
				no-header
				@sl-request-close=${(e: CustomEvent) => {
					e.preventDefault();
				}}
			>
				<div class="column" style="gap: 12px">
					<span class="title">${msg('New update found')} </span>
					<span>${msg('Installing update...')} </span>
					<sl-progress-bar
						.value=${this.contentLength
							? (100 * this.downloaded) / this.contentLength
							: 0}
					></sl-progress-bar>
				</div>
			</sl-dialog>
		`;
	}

	static styles = appStyles;
}
