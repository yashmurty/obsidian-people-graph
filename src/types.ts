export interface PersonNode {
	id: string;           // file path in vault
	name: string;
	photo?: string;       // vault-relative path to photo
	company?: string;
	role?: string;
	closeness: number;    // 1–10, defaults to 5 if not specified in frontmatter
	tags: string[];
	knows: string[];      // wikilink targets (note names)
}

export interface PeopleGraphSettings {
	enableClustering: boolean;
	clusterStrength: number;
	showEdges: boolean;
	edgeOpacity: number;
	showClosenessRing: boolean;
	centerLabel: string;
	maxFreeNodes: number;
}

export const DEFAULT_SETTINGS: PeopleGraphSettings = {
	enableClustering: true,
	clusterStrength: 0.3,
	showEdges: true,
	edgeOpacity: 0.4,
	showClosenessRing: true,
	centerLabel: "You",
	maxFreeNodes: 20,
};
