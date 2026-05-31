import { ItemView, Notice, WorkspaceLeaf } from "obsidian";
import type PeopleGraphPlugin from "../main";
import { indexPeople } from "../indexer";
import { renderGraph } from "./renderer";
import { exportGraphAsPng } from "./export";

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
		return "People graph";
	}

	getIcon(): string {
		return "users";
	}

	async onOpen(): Promise<void> {
		await this.render();

		// Export button in view header
		this.addAction("download", "Export as PNG", async () => {
			const container = this.containerEl.children[1] as HTMLElement;
			const blob = await exportGraphAsPng(container);
			if (!blob) {
				new Notice("Export failed — no graph to export.");
				return;
			}
			const url = URL.createObjectURL(blob);
			const a = createEl("a", { href: url });
			a.download = "people-graph.png";
			a.click();
			URL.revokeObjectURL(url);
			new Notice("Graph exported as PNG.");
		});

		// Re-render when a note's frontmatter changes
		this.registerEvent(
			this.app.metadataCache.on("changed", () => {
				void this.render();
			}),
		);
	}

	async render(): Promise<void> {
		const container = this.containerEl.children[1] as HTMLElement;
		const people = await indexPeople(this.app, this.plugin.settings);
		renderGraph(container, people, this.plugin.settings, this.app);
	}

	// eslint-disable-next-line @typescript-eslint/require-await -- Obsidian API requires async signature
	async onClose(): Promise<void> {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
	}
}
