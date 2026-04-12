import { App } from "obsidian";
import { PersonNode, PeopleGraphSettings } from "./types";

const DEFAULT_CLOSENESS = 5;

export function indexPeople(app: App, settings: PeopleGraphSettings): PersonNode[] {
	const people: PersonNode[] = [];
	const files = app.vault.getMarkdownFiles();

	const excludeList = settings.excludePaths
		.split(",")
		.map((s) => s.trim().toLowerCase())
		.filter((s) => s.length > 0);

	for (const file of files) {
		// Skip excluded paths
		const filePath = file.path.toLowerCase();
		if (excludeList.some((ex) => filePath.startsWith(ex + "/") || filePath === ex)) continue;

		const cache = app.metadataCache.getFileCache(file);
		if (!cache?.frontmatter) continue;

		const fm = cache.frontmatter;
		if (!matchesPersonFilter(fm, settings.personField, settings.personValue)) continue;

		const name = fm.name ?? file.basename;

		const rawCloseness = Number(fm.closeness);
		const closeness = !isNaN(rawCloseness)
			? Math.max(1, Math.min(10, rawCloseness))
			: DEFAULT_CLOSENESS;

		const knows = parseKnows(fm.knows);

		const person: PersonNode = {
			id: file.path,
			name: String(name),
			photo: fm[settings.photoField] ? resolvePhotoPath(app, stripWikilink(String(fm[settings.photoField])), file.path) : undefined,
			company: fm.company ? String(fm.company) : undefined,
			role: fm.role ? String(fm.role) : undefined,
			closeness,
			tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
			knows,
		};

		people.push(person);
	}

	return people;
}

function matchesPersonFilter(fm: Record<string, unknown>, field: string, value: string): boolean {
	const fieldValue = fm[field];
	if (Array.isArray(fieldValue)) {
		return fieldValue.some((v) => String(v) === value);
	}
	return String(fieldValue) === value;
}

function resolvePhotoPath(app: App, photoName: string, sourcePath: string): string {
	// If it's already a full path that exists, use it
	const existing = app.vault.getAbstractFileByPath(photoName);
	if (existing) return photoName;

	// Resolve like a wikilink — searches the whole vault by filename
	const resolved = app.metadataCache.getFirstLinkpathDest(photoName, sourcePath);
	return resolved ? resolved.path : photoName;
}

function stripWikilink(str: string): string {
	const match = str.match(/^\[\[(.+?)(?:\|.+?)?\]\]$/);
	return match ? match[1] : str;
}

function parseKnows(raw: unknown): string[] {
	const entries = Array.isArray(raw)
		? raw.map(String)
		: typeof raw === "string" && raw.length > 0
			? [raw]
			: [];

	return entries
		.map((str) => {
			// Strip wikilink brackets: "[[Jane Doe]]" → "Jane Doe"
			const match = str.match(/^\[\[(.+?)(?:\|.+?)?\]\]$/);
			return match ? match[1] : str;
		})
		.filter((s) => s.length > 0);
}
