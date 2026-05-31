import * as d3 from "d3";
import { TFile } from "obsidian";
import type { App } from "obsidian";
import type { PersonNode, PeopleGraphSettings } from "../types";

interface SimNode extends d3.SimulationNodeDatum {
	person: PersonNode;
	isCenter?: boolean;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
	source: SimNode;
	target: SimNode;
}

const NODE_RADIUS = 24;

function appendAvatarSilhouette(parent: SVGGElement) {
	const el = d3.select(parent);
	// Head
	el.append("circle")
		.attr("cy", -4)
		.attr("r", 8)
		.attr("fill", "#a0a0a0");
	// Body
	el.append("ellipse")
		.attr("cy", 16)
		.attr("rx", 12)
		.attr("ry", 9)
		.attr("fill", "#a0a0a0");
}

function closenessColor(closeness: number): string {
	if (closeness >= 8) return "#4caf50";  // green
	if (closeness >= 4) return "#ff9800";  // orange
	return "#9e9e9e";                       // gray
}
const MIN_CLOSENESS_RADIUS = 50;
const MAX_CLOSENESS_RADIUS = 400;

export function renderGraph(
	container: HTMLElement,
	people: PersonNode[],
	settings: PeopleGraphSettings,
	app: App,
) {
	container.empty();

	if (people.length === 0) {
		const msg = container.createDiv({ cls: "people-graph-empty" });
		msg.createEl("h4", { text: "No people found" });
		msg.createEl("p", {
			text: `Looking for notes where frontmatter field "${settings.personField}" = "${settings.personValue}".`,
		});
		msg.createEl("p", { text: "Make sure your notes have matching frontmatter, e.g.:" });
		const code = msg.createEl("pre");
		code.createEl("code", {
			text: `---\n${settings.personField}: ${settings.personValue}\nname: Jane Doe\n---`,
		});
		return;
	}

	const width = container.clientWidth || 800;
	const height = container.clientHeight || 600;
	const centerX = width / 2;
	const centerY = height / 2;

	// Find the "self" person note, or create a generic center node
	const selfPerson = people.find((p) => p.isSelf);
	const otherPeople = selfPerson ? people.filter((p) => p !== selfPerson) : people;

	const centerNode: SimNode = {
		person: selfPerson
			? { ...selfPerson, name: `${selfPerson.name} (You)` }
			: {
			id: "__center__",
			name: settings.centerLabel,
			closeness: 10,
			tags: [],
			knows: [],
		},
		isCenter: true,
		x: centerX,
		y: centerY,
		fx: centerX,
		fy: centerY,
	};

	// Build nodes
	const nodeMap = new Map<string, SimNode>();
	const nodes: SimNode[] = [centerNode, ...otherPeople.map((p) => {
		const node: SimNode = { person: p };
		nodeMap.set(p.id, node);
		const noteName = p.id.replace(/\.md$/, "").split("/").pop()!;
		nodeMap.set(noteName, node);
		return node;
	})];

	// Build links from knows
	const links: SimLink[] = [];
	for (const node of nodes) {
		for (const target of node.person.knows) {
			const targetNode = nodeMap.get(target) ?? nodeMap.get(target + ".md");
			if (targetNode && targetNode !== node) {
				const exists = links.some(
					(l) =>
						(l.source === node && l.target === targetNode) ||
						(l.source === targetNode && l.target === node),
				);
				if (!exists) {
					links.push({ source: node, target: targetNode });
				}
			}
		}
	}

	// Group nodes by company for cluster force
	const companyGroups = new Map<string, SimNode[]>();
	for (const node of nodes) {
		const company = node.person.company ?? "";
		if (company) {
			const group = companyGroups.get(company) ?? [];
			group.push(node);
			companyGroups.set(company, group);
		}
	}

	// Create SVG — fills container and resizes with it
	container.addClass("people-graph-container");

	const svg = d3
		.select(container)
		.append("svg")
		.attr("width", "100%")
		.attr("height", "100%")
		.attr("viewBox", [0, 0, width, height]);

	const g = svg.append("g");

	// Zoom and pan
	const zoom = d3
		.zoom<SVGSVGElement, unknown>()
		.scaleExtent([0.2, 5])
		.on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
			g.attr("transform", event.transform.toString());
		});

	svg.call(zoom);

	// Double-click to reset zoom
	svg.on("dblclick.zoom", () => {
		void zoom.transform(svg.transition().duration(500), d3.zoomIdentity);
	});

	// Defs for clip paths
	const defs = svg.append("defs");

	nodes.forEach((_node, i) => {
		defs
			.append("clipPath")
			.attr("id", `clip-${i}`)
			.append("circle")
			.attr("r", NODE_RADIUS);
	});

	// Draw links
	const linkSelection = g
		.append("g")
		.attr("display", settings.showEdges ? null : "none")
		.selectAll("line")
		.data(links)
		.join("line")
		.attr("stroke", "#cccccc")
		.attr("stroke-opacity", settings.edgeOpacity)
		.attr("stroke-width", 1.5);

	// Draw nodes
	const nodeSelection = g
		.append("g")
		.selectAll<SVGGElement, SimNode>("g")
		.data(nodes)
		.join("g")
		.attr("cursor", (d) => d.isCenter ? "default" : "pointer")
		.call(
			d3
				.drag<SVGGElement, SimNode>()
				.on("start", (event: d3.D3DragEvent<SVGGElement, SimNode, SimNode>, d) => {
					if (d.isCenter) return;
					if (!event.active) simulation.alphaTarget(0.3).restart();
					d.fx = d.x;
					d.fy = d.y;
				})
				.on("drag", (event: d3.D3DragEvent<SVGGElement, SimNode, SimNode>, d) => {
					if (d.isCenter) return;
					d.fx = event.x;
					d.fy = event.y;
				})
				.on("end", (event: d3.D3DragEvent<SVGGElement, SimNode, SimNode>, d) => {
					if (d.isCenter) return;
					if (!event.active) simulation.alphaTarget(0);
					d.fx = null;
					d.fy = null;
				}),
		);

	const nodeElements = nodeSelection.nodes();

	// Render node visuals
	nodeSelection.each((d, i) => {
		const el = d3.select(nodeElements[i]);

		if (d.isCenter) {
			const centerR = NODE_RADIUS + 4;
			if (d.person.photoDataUri) {
				// Center node with photo
				defs.append("clipPath")
					.attr("id", "clip-center")
					.append("circle")
					.attr("r", centerR);
				el.append("circle")
					.attr("r", centerR)
					.attr("fill", "#e0e0e0");
				el.append("image")
					.attr("href", d.person.photoDataUri)
					.attr("x", -centerR)
					.attr("y", -centerR)
					.attr("width", centerR * 2)
					.attr("height", centerR * 2)
					.attr("clip-path", "url(#clip-center)")
					.attr("preserveAspectRatio", "xMidYMid slice");
				el.append("circle")
					.attr("r", centerR)
					.attr("fill", "none")
					.attr("stroke", "#7b6cd9")
					.attr("stroke-width", 3);
			} else {
				// Generic center node with silhouette
				el.append("circle")
					.attr("r", centerR)
					.attr("fill", "#e0e0e0");
				if (nodeElements[i]) appendAvatarSilhouette(nodeElements[i]);
				el.append("circle")
					.attr("r", centerR)
					.attr("fill", "none")
					.attr("stroke", "#7b6cd9")
					.attr("stroke-width", 3);
			}
			// Name label below
			el.append("text")
				.text(d.person.name)
				.attr("text-anchor", "middle")
				.attr("dy", centerR + 14)
				.attr("font-size", "12px")
				.attr("font-weight", "bold")
				.attr("fill", "#333333");
			return;
		}

		// Hit area — ensures the entire circle is clickable/hoverable
		el.append("circle")
			.attr("r", NODE_RADIUS)
			.attr("fill", "#e0e0e0");

		if (d.person.photoDataUri) {
			const img = el.append("image")
				.attr("href", d.person.photoDataUri)
				.attr("x", -NODE_RADIUS)
				.attr("y", -NODE_RADIUS)
				.attr("width", NODE_RADIUS * 2)
				.attr("height", NODE_RADIUS * 2)
				.attr("clip-path", `url(#clip-${i})`)
				.attr("preserveAspectRatio", "xMidYMid slice");

			// On image load failure, replace with avatar silhouette
			(img.node() as SVGImageElement).addEventListener("error", () => {
				img.remove();
				if (nodeElements[i]) appendAvatarSilhouette(nodeElements[i]);
			});
		} else {
			if (nodeElements[i]) appendAvatarSilhouette(nodeElements[i]);
		}

		// Outer ring — color by closeness
		el.append("circle")
			.attr("r", NODE_RADIUS)
			.attr("fill", "none")
			.attr("stroke", settings.showClosenessRing ? closenessColor(d.person.closeness) : "#999999")
			.attr("stroke-width", 2.5);
	});

	// Labels (skip center — it has its own)
	const nonCenterNodes = nodeSelection.filter((d) => !d.isCenter);

	// Name
	nonCenterNodes
		.append("text")
		.text((d) => d.person.name)
		.attr("text-anchor", "middle")
		.attr("dy", NODE_RADIUS + 14)
		.attr("font-size", "11px")
		.attr("fill", "#333333");

	// Company
	nonCenterNodes
		.filter((d) => !!(d.person.company))
		.append("text")
		.text((d) => d.person.company!)
		.attr("text-anchor", "middle")
		.attr("dy", NODE_RADIUS + 27)
		.attr("font-size", "9px")
		.attr("fill", "#888888");

	// Tooltip
	const tooltip = d3
		.select(container)
		.append("div")
		.attr("class", "people-graph-tooltip");

	nodeSelection
		.on("mouseenter", (_event, d) => {
			if (d.isCenter) return;
			const lines = [d.person.name];
			if (d.person.company) lines.push(`Company: ${d.person.company}`);
			if (d.person.role) lines.push(`Role: ${d.person.role}`);
			lines.push(`Closeness: ${d.person.closeness}/10`);

			tooltip.html(lines.join("<br>")).style("display", "block");
		})
		.on("mousemove", (event: MouseEvent) => {
			const rect = container.getBoundingClientRect();
			tooltip
				.style("left", `${event.clientX - rect.left + 12}px`)
				.style("top", `${event.clientY - rect.top - 10}px`);
		})
		.on("mouseleave", () => {
			tooltip.style("display", "none");
		});

	// Click to open the person's note
	nodeSelection.on("click", (_event, d) => {
		if (d.isCenter) return;
		const file = app.vault.getAbstractFileByPath(d.person.id);
		if (file instanceof TFile) {
			void app.workspace.getLeaf("tab").openFile(file);
		}
	});

	// Closeness force: pulls nodes toward center based on closeness score
	function closenessForce(alpha: number) {
		for (const node of nodes) {
			const targetRadius =
				MAX_CLOSENESS_RADIUS -
				((node.person.closeness - 1) / 9) *
					(MAX_CLOSENESS_RADIUS - MIN_CLOSENESS_RADIUS);
			const dx = (node.x ?? centerX) - centerX;
			const dy = (node.y ?? centerY) - centerY;
			const dist = Math.sqrt(dx * dx + dy * dy) || 1;
			const diff = dist - targetRadius;
			const strength = alpha * 0.1;
			node.vx! -= (dx / dist) * diff * strength;
			node.vy! -= (dy / dist) * diff * strength;
		}
	}

	// Cluster force: pulls same-company nodes together
	function clusterForce(alpha: number) {
		if (!settings.enableClustering) return;
		for (const [, group] of companyGroups) {
			if (group.length < 2) continue;
			// Compute centroid
			let cx = 0,
				cy = 0;
			for (const node of group) {
				cx += node.x ?? 0;
				cy += node.y ?? 0;
			}
			cx /= group.length;
			cy /= group.length;
			// Pull toward centroid
			const strength = alpha * settings.clusterStrength;
			for (const node of group) {
				node.vx! += (cx - (node.x ?? 0)) * strength;
				node.vy! += (cy - (node.y ?? 0)) * strength;
			}
		}
	}

	// Force simulation
	const simulation = d3
		.forceSimulation(nodes)
		.force(
			"link",
			d3
				.forceLink<SimNode, SimLink>(links)
				.id((d) => d.person.id)
				.distance(120),
		)
		.force("charge", d3.forceManyBody().strength(-300))
		.force("center", d3.forceCenter(centerX, centerY))
		.force("collision", d3.forceCollide().radius(NODE_RADIUS + 30))
		.on("tick", () => {
			closenessForce(simulation.alpha());
			clusterForce(simulation.alpha());

			linkSelection
				.attr("x1", (d) => d.source.x!)
				.attr("y1", (d) => d.source.y!)
				.attr("x2", (d) => d.target.x!)
				.attr("y2", (d) => d.target.y!);

			nodeSelection.attr("transform", (d) => `translate(${d.x},${d.y})`);
		});
}
