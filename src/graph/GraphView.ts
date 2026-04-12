import { ItemView, WorkspaceLeaf } from "obsidian";
import type PeopleGraphPlugin from "../main";

export const VIEW_TYPE_PEOPLE_GRAPH = "people-graph-view";

export class PeopleGraphView extends ItemView {
	plugin: PeopleGraphPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: PeopleGraphPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_PEOPLE_GRAPH;
	}

	getDisplayText(): string {
		return "People Graph";
	}

	getIcon(): string {
		return "users";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.createEl("h4", { text: "People Graph" });
		container.createEl("p", {
			text: "Graph view will render here. Indexing person notes from vault...",
		});
	}

	async onClose() {
		// cleanup will go here
	}
}
