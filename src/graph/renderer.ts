import * as d3 from "d3";
import type { PersonNode, PeopleGraphSettings } from "../types";

interface SimNode extends d3.SimulationNodeDatum {
	person: PersonNode;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
	source: SimNode;
	target: SimNode;
}

export function renderGraph(
	container: HTMLElement,
	people: PersonNode[],
	settings: PeopleGraphSettings,
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

	// Build nodes
	const nodeMap = new Map<string, SimNode>();
	const nodes: SimNode[] = people.map((p) => {
		const node: SimNode = { person: p };
		nodeMap.set(p.id, node);
		// Also map by note name (filename without extension) for knows lookups
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
				// Avoid duplicate links
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

	// Create SVG
	const svg = d3
		.select(container)
		.append("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("viewBox", [0, 0, width, height]);

	const g = svg.append("g");

	// Draw links
	const linkSelection = g
		.append("g")
		.selectAll("line")
		.data(links)
		.join("line")
		.attr("stroke", "#999")
		.attr("stroke-opacity", 0.4)
		.attr("stroke-width", 1.5);

	// Draw nodes
	const nodeRadius = 20;

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

	// Circle for each node
	nodeSelection
		.append("circle")
		.attr("r", nodeRadius)
		.attr("fill", "#4a90d9")
		.attr("stroke", "#fff")
		.attr("stroke-width", 2);

	// Label
	nodeSelection
		.append("text")
		.text((d) => d.person.name)
		.attr("text-anchor", "middle")
		.attr("dy", nodeRadius + 14)
		.attr("font-size", "11px")
		.attr("fill", "var(--text-normal)");

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
		.force("center", d3.forceCenter(width / 2, height / 2))
		.force("collision", d3.forceCollide().radius(nodeRadius + 10))
		.on("tick", () => {
			linkSelection
				.attr("x1", (d) => d.source.x!)
				.attr("y1", (d) => d.source.y!)
				.attr("x2", (d) => d.target.x!)
				.attr("y2", (d) => d.target.y!);

			nodeSelection.attr("transform", (d) => `translate(${d.x},${d.y})`);
		});
}
