import { App, TFile } from "obsidian";
import { PersonNode, PeopleGraphSettings } from "./types";

const DEFAULT_CLOSENESS = 5;

export async function indexPeople(app: App, settings: PeopleGraphSettings): Promise<PersonNode[]> {
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

		const fm = cache.frontmatter as Record<string, unknown>;
		if (!matchesPersonFilter(fm, settings.personField, settings.personValue)) continue;

		const name = fm.name ?? file.basename;

		const rawCloseness = Number(fm.closeness);
		const closeness = !isNaN(rawCloseness)
			? Math.max(1, Math.min(10, rawCloseness))
			: DEFAULT_CLOSENESS;

		const knows = parseKnows(fm.knows);

		const photoPath = fm[settings.photoField]
			? resolvePhotoPath(app, stripWikilink(String(fm[settings.photoField])), file.path)
			: undefined;

		const photoDataUri = photoPath
			? await readPhotoAsDataUri(app, photoPath)
			: undefined;

		const person: PersonNode = {
			id: file.path,
			name: String(name),
			photo: photoPath,
			photoDataUri,
			company: fm.company ? stripWikilink(String(fm.company)) : undefined,
			role: fm.role ? stripWikilink(String(fm.role)) : undefined,
			closeness,
			tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
			knows,
			isSelf: fm.is_self === true || fm.is_self === "true",
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
	const existing = app.vault.getAbstractFileByPath(photoName);
	if (existing) return photoName;

	const resolved = app.metadataCache.getFirstLinkpathDest(photoName, sourcePath);
	return resolved ? resolved.path : photoName;
}

async function readPhotoAsDataUri(app: App, photoPath: string): Promise<string | undefined> {
	const file = app.vault.getAbstractFileByPath(photoPath);
	if (!(file instanceof TFile)) return undefined;

	try {
		const binary = await app.vault.readBinary(file);
		const ext = file.extension.toLowerCase();
		const mime = ext === "png" ? "image/png"
			: ext === "jpg" || ext === "jpeg" ? "image/jpeg"
			: ext === "gif" ? "image/gif"
			: ext === "webp" ? "image/webp"
			: "image/png";
		const base64 = arrayBufferToBase64(binary);
		return `data:${mime};base64,${base64}`;
	} catch {
		return undefined;
	}
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
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
			const match = str.match(/^\[\[(.+?)(?:\|.+?)?\]\]$/);
			return match ? match[1] : str;
		})
		.filter((s) => s.length > 0);
}
