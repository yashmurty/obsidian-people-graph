import { Plugin, WorkspaceLeaf } from "obsidian";
import { PeopleGraphSettings, DEFAULT_SETTINGS } from "./types";
import { PeopleGraphView, VIEW_TYPE_PEOPLE_GRAPH } from "./graph/GraphView";
import { PeopleGraphSettingTab } from "./settings";

export default class PeopleGraphPlugin extends Plugin {
	settings: PeopleGraphSettings = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();

		this.registerView(
			VIEW_TYPE_PEOPLE_GRAPH,
			(leaf) => new PeopleGraphView(leaf, this)
		);

		this.addRibbonIcon("users", "Open People Graph", () => {
			this.activateView();
		});

		this.addSettingTab(new PeopleGraphSettingTab(this.app, this));

		this.addCommand({
			id: "open-people-graph",
			name: "Open People Graph",
			callback: () => {
				this.activateView();
			},
		});
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_PEOPLE_GRAPH);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_PEOPLE_GRAPH);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getLeaf("tab");
			await leaf.setViewState({
				type: VIEW_TYPE_PEOPLE_GRAPH,
				active: true,
			});
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}
}
