export async function exportGraphAsPng(container: HTMLElement): Promise<Blob | null> {
	const svgEl = container.querySelector("svg");
	if (!svgEl) return null;

	const clone = svgEl.cloneNode(true) as SVGSVGElement;

	// Get computed dimensions
	const bbox = svgEl.getBoundingClientRect();
	const width = bbox.width * 2;  // 2x for retina quality
	const height = bbox.height * 2;

	clone.setAttribute("width", String(width));
	clone.setAttribute("height", String(height));
	clone.setAttribute("viewBox", svgEl.getAttribute("viewBox") ?? `0 0 ${bbox.width} ${bbox.height}`);

	// Set font-family directly on text elements instead of using a style element
	clone.querySelectorAll("text").forEach((textEl) => {
		textEl.setAttribute("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif");
	});

	const serializer = new XMLSerializer();
	const svgString = serializer.serializeToString(clone);
	const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
	const url = URL.createObjectURL(svgBlob);

	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => {
			const canvas = createEl("canvas");
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext("2d")!;

			// White background
			ctx.fillStyle = "#ffffff";
			ctx.fillRect(0, 0, width, height);

			ctx.drawImage(img, 0, 0, width, height);
			URL.revokeObjectURL(url);

			canvas.toBlob((blob) => {
				resolve(blob);
			}, "image/png");
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			resolve(null);
		};
		img.src = url;
	});
}
