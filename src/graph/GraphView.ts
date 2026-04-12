import { ItemView, WorkspaceLeaf } from "obsidian";
import type PeopleGraphPlugin from "../main";
import { indexPeople } from "../indexer";
import { renderGraph } from "./renderer";

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
		this.render();

		// Re-render when vault changes
		this.registerEvent(
			this.app.metadataCache.on("resolved", () => {
				this.render();
			}),
		);
	}

	render() {
		const container = this.containerEl.children[1] as HTMLElement;
		const people = indexPeople(this.app, this.plugin.settings);
		renderGraph(container, people, this.plugin.settings);
	}

	async onClose() {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
	}
}
