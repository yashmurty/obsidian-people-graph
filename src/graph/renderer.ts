import * as d3 from "d3";
import type { App } from "obsidian";
import type { PersonNode, PeopleGraphSettings } from "../types";

interface SimNode extends d3.SimulationNodeDatum {
	person: PersonNode;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
	source: SimNode;
	target: SimNode;
}

const NODE_RADIUS = 24;
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
		const msg = container.createEl("div", { cls: "people-graph-empty" });
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

	// Build nodes
	const nodeMap = new Map<string, SimNode>();
	const nodes: SimNode[] = people.map((p) => {
		const node: SimNode = { person: p };
		nodeMap.set(p.id, node);
		const noteName = p.id.replace(/\.md$/, "").split("/").pop()!;
		nodeMap.set(noteName, node);
		return node;
	});

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

	// Create SVG
	const svg = d3
		.select(container)
		.append("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("viewBox", [0, 0, width, height]);

	const g = svg.append("g");

	// Defs for clip paths
	const defs = svg.append("defs");

	nodes.forEach((node, i) => {
		defs
			.append("clipPath")
			.attr("id", `clip-${i}`)
			.append("circle")
			.attr("r", NODE_RADIUS);
	});

	// Draw links
	const linkSelection = g
		.append("g")
		.selectAll("line")
		.data(links)
		.join("line")
		.attr("stroke", "var(--text-faint)")
		.attr("stroke-opacity", settings.edgeOpacity)
		.attr("stroke-width", 1.5);

	// Draw nodes
	const nodeSelection = g
		.append("g")
		.selectAll<SVGGElement, SimNode>("g")
		.data(nodes)
		.join("g")
		.attr("cursor", "pointer")
		.call(
			d3
				.drag<SVGGElement, SimNode>()
				.on("start", (event, d) => {
					if (!event.active) simulation.alphaTarget(0.3).restart();
					d.fx = d.x;
					d.fy = d.y;
				})
				.on("drag", (event, d) => {
					d.fx = event.x;
					d.fy = event.y;
				})
				.on("end", (event, d) => {
					if (!event.active) simulation.alphaTarget(0);
					d.fx = null;
					d.fy = null;
				}),
		);

	// Photo or fallback circle
	nodeSelection.each(function (d, i) {
		const el = d3.select(this);

		if (d.person.photo) {
			const resourcePath = app.vault.adapter.getResourcePath(d.person.photo);
			// Background circle (shown if image fails to load)
			el.append("circle")
				.attr("r", NODE_RADIUS)
				.attr("fill", "var(--background-secondary)");

			el.append("image")
				.attr("href", resourcePath)
				.attr("x", -NODE_RADIUS)
				.attr("y", -NODE_RADIUS)
				.attr("width", NODE_RADIUS * 2)
				.attr("height", NODE_RADIUS * 2)
				.attr("clip-path", `url(#clip-${i})`)
				.attr("preserveAspectRatio", "xMidYMid slice");
		} else {
			// Default avatar: colored circle with silhouette
			el.append("circle")
				.attr("r", NODE_RADIUS)
				.attr("fill", "var(--background-secondary)");

			// Head
			el.append("circle")
				.attr("cy", -4)
				.attr("r", 8)
				.attr("fill", "var(--text-muted)");

			// Body
			el.append("ellipse")
				.attr("cy", 16)
				.attr("rx", 12)
				.attr("ry", 9)
				.attr("fill", "var(--text-muted)");
		}

		// Outer ring
		el.append("circle")
			.attr("r", NODE_RADIUS)
			.attr("fill", "none")
			.attr("stroke", "var(--text-muted)")
			.attr("stroke-width", 2);
	});

	// Label
	nodeSelection
		.append("text")
		.text((d) => d.person.name)
		.attr("text-anchor", "middle")
		.attr("dy", NODE_RADIUS + 14)
		.attr("font-size", "11px")
		.attr("fill", "var(--text-normal)");

	// Tooltip
	const tooltip = d3
		.select(container)
		.append("div")
		.attr("class", "people-graph-tooltip")
		.style("position", "absolute")
		.style("display", "none")
		.style("background", "var(--background-primary)")
		.style("border", "1px solid var(--background-modifier-border)")
		.style("border-radius", "6px")
		.style("padding", "8px 12px")
		.style("font-size", "12px")
		.style("pointer-events", "none")
		.style("z-index", "100")
		.style("box-shadow", "0 2px 8px rgba(0,0,0,0.15)");

	nodeSelection
		.on("mouseenter", (event, d) => {
			const lines: string[] = [d.person.name];
			if (d.person.company) lines.push(`Company: ${d.person.company}`);
			if (d.person.role) lines.push(`Role: ${d.person.role}`);
			lines.push(`Closeness: ${d.person.closeness}/10`);

			tooltip.html(lines.join("<br>")).style("display", "block");
		})
		.on("mousemove", (event) => {
			const rect = container.getBoundingClientRect();
			tooltip
				.style("left", `${event.clientX - rect.left + 12}px`)
				.style("top", `${event.clientY - rect.top - 10}px`);
		})
		.on("mouseleave", () => {
			tooltip.style("display", "none");
		});

	// Click to open note
	nodeSelection.on("click", (_event, d) => {
		const file = app.vault.getAbstractFileByPath(d.person.id);
		if (file) {
			app.workspace.getLeaf("tab").openFile(file as any);
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
		.force("collision", d3.forceCollide().radius(NODE_RADIUS + 10))
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
