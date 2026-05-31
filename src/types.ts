export interface PersonNode {
	id: string;           // file path in vault
	name: string;
	photo?: string;       // vault-relative path to photo
	photoDataUri?: string; // resolved base64 data URI
	company?: string;
	role?: string;
	closeness: number;    // 1–10, defaults to 5 if not specified in frontmatter
	tags: string[];
	knows: string[];      // wikilink targets (note names)
	isSelf?: boolean;     // true if this note represents "you"
}

export interface PeopleGraphSettings {
	personField: string;
	personValue: string;
	excludePaths: string;
	photoField: string;
	enableClustering: boolean;
	clusterStrength: number;
	showEdges: boolean;
	edgeOpacity: number;
	showClosenessRing: boolean;
	centerLabel: string;
}

export const DEFAULT_SETTINGS: PeopleGraphSettings = {
	personField: "type",
	personValue: "person",
	excludePaths: "Templates",
	photoField: "photo",
	enableClustering: true,
	clusterStrength: 0.3,
	showEdges: true,
	edgeOpacity: 0.4,
	showClosenessRing: true,
	centerLabel: "You",
};
