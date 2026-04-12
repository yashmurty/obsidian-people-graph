import { App } from "obsidian";
import { PersonNode, PeopleGraphSettings } from "./types";

const DEFAULT_CLOSENESS = 5;

export function indexPeople(app: App, settings: PeopleGraphSettings): PersonNode[] {
	const people: PersonNode[] = [];
	const files = app.vault.getMarkdownFiles();

	for (const file of files) {
		const cache = app.metadataCache.getFileCache(file);
		if (!cache?.frontmatter) continue;

		const fm = cache.frontmatter;
		if (!matchesPersonFilter(fm, settings.personField, settings.personValue)) continue;

		const name = fm.name ?? file.basename;

		const closeness = typeof fm.closeness === "number"
			? Math.max(1, Math.min(10, fm.closeness))
			: DEFAULT_CLOSENESS;

		const knows = parseKnows(fm.knows);

		const person: PersonNode = {
			id: file.path,
			name: String(name),
			photo: fm.photo ? String(fm.photo) : undefined,
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

function parseKnows(raw: unknown): string[] {
	if (!Array.isArray(raw)) return [];

	return raw
		.map((entry) => {
			const str = String(entry);
			// Strip wikilink brackets: "[[Jane Doe]]" → "Jane Doe"
			const match = str.match(/^\[\[(.+?)(?:\|.+?)?\]\]$/);
			return match ? match[1] : str;
		})
		.filter((s) => s.length > 0);
}
