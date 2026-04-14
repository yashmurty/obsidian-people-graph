import { App, PluginSettingTab, Setting } from "obsidian";
import type PeopleGraphPlugin from "./main";

export class PeopleGraphSettingTab extends PluginSettingTab {
	plugin: PeopleGraphPlugin;

	constructor(app: App, plugin: PeopleGraphPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// --- Person Detection ---
		new Setting(containerEl).setName("Person detection").setHeading();

		new Setting(containerEl)
			.setName("Frontmatter field")
			.setDesc("Frontmatter field to identify person notes (e.g. \"type\" or \"tags\")")
			.addText((text) =>
				text
					.setPlaceholder("Type")
					.setValue(this.plugin.settings.personField)
					.onChange(async (value) => {
						this.plugin.settings.personField = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Field value")
			.setDesc("Value to match (e.g. \"person\" or \"people\")")
			.addText((text) =>
				text
					.setPlaceholder("Person")
					.setValue(this.plugin.settings.personValue)
					.onChange(async (value) => {
						this.plugin.settings.personValue = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Photo field")
			.setDesc("Frontmatter field that contains the photo path (e.g. \"photo\" or \"avatar\")")
			.addText((text) =>
				text
					.setPlaceholder("Photo")
					.setValue(this.plugin.settings.photoField)
					.onChange(async (value) => {
						this.plugin.settings.photoField = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Exclude paths")
			.setDesc("Comma-separated folder or file paths to exclude (e.g. \"templates, archive\")")
			.addText((text) =>
				text
					.setPlaceholder("Templates")
					.setValue(this.plugin.settings.excludePaths)
					.onChange(async (value) => {
						this.plugin.settings.excludePaths = value;
						await this.plugin.saveSettings();
					}),
			);

		// --- Graph Layout ---
		new Setting(containerEl).setName("Graph layout").setHeading();

		new Setting(containerEl)
			.setName("Enable company clustering")
			.setDesc("Group nodes that share the same company")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableClustering)
					.onChange(async (value) => {
						this.plugin.settings.enableClustering = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Cluster strength")
			.setDesc("How strongly same-company nodes attract each other (0.0–1.0)")
			.addSlider((slider) =>
				slider
					.setLimits(0, 1, 0.1)
					.setValue(this.plugin.settings.clusterStrength)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.clusterStrength = value;
						await this.plugin.saveSettings();
					}),
			);

		// --- Display ---
		new Setting(containerEl).setName("Display").setHeading();

		new Setting(containerEl)
			.setName("Show relationship edges")
			.setDesc("Draw lines between people who know each other")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showEdges)
					.onChange(async (value) => {
						this.plugin.settings.showEdges = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Edge opacity")
			.setDesc("Opacity of relationship lines (0.0–1.0)")
			.addSlider((slider) =>
				slider
					.setLimits(0, 1, 0.1)
					.setValue(this.plugin.settings.edgeOpacity)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.edgeOpacity = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Show closeness ring color")
			.setDesc("Color the node ring based on closeness score (green/orange/gray)")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showClosenessRing)
					.onChange(async (value) => {
						this.plugin.settings.showClosenessRing = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
