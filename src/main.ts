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

		this.addRibbonIcon("users", "Open people graph", () => {
			void this.activateView();
		});

		this.addSettingTab(new PeopleGraphSettingTab(this.app, this));

		this.addCommand({
			id: "open",
			name: "Open graph",
			callback: () => {
				void this.activateView();
			},
		});
	}

	onunload() {
		// no-op: don't detach leaves so user layout is preserved
	}

	async loadSettings() {
		const data = (await this.loadData()) as Partial<PeopleGraphSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
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
			void workspace.revealLeaf(leaf);
		}
	}
}
