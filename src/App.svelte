<script>
    import { fly } from "svelte/transition";
    import { onMount } from "svelte";
    import Canvas from "./Canvas.svelte";
    import QuadTreeImp from "./QuadTreeImp";
    import {image as imageContext} from "./imageStore";

    console.log(imageContext);

    let arrow = "/image/pngtree-arrow-sketch-2902205-png-image_1733937.png";

    let disabled = true;
    let max = 10;
    let min = 0;
    let level = 0;

    let image = new Image(600, 600);
    image.addEventListener('load', execute);
    let baseCanvasCTX;
    imageContext.subscribe( value => {
        baseCanvasCTX = value;
    });

    let compressed;

    let compressedCanvas;

    let compressedCanvasCTX;
    onMount(() => {
        compressedCanvasCTX = compressedCanvas.getContext("2d");
    })

    function execute() {
        console.log(baseCanvasCTX);
        baseCanvasCTX.drawImage(image, 0, 0, image.width, image.height);

        compressed = new QuadTreeImp(baseCanvasCTX.getImageData(0, 0, 600, 600),
            image.width,
            image.height,
            1).root;
        console.log(compressed);

        handleDrawQuadTree(0, parseInt(level));        
    }

    function run(e) {
        console.log(e);
        if (e.target.files.length === 0)
            return;

        disabled = false;
        image.src = URL.createObjectURL(e.target.files[0]);
        let x = (baseCanvasCTX.width - image.width) * 0.5,
            y = (baseCanvasCTX.height - image.height) * 0.5;
    }

    function handleDrawQuadTree(start, level) {
        if (level === 9) {
            getNodesInLevel(compressed, 0, level - 1, 10);
            getNodesInLevel(compressed, 0, level, 10);
        } else {
            getNodesInLevel(compressed, 0, level, 10);
        }
    }

    function getNodesInLevel(node, start, level) {
        if (node === undefined) return;
        if (start === level) {
            compressedCanvasCTX.moveTo(node.x, node.y);
            compressedCanvasCTX.fillStyle = RGBAToHexA(node.color.red, node.color.green, node.color.blue, node.color.alpha);
            compressedCanvasCTX.fillRect(node.x, node.y, node.width, node.height);
        } else if (start < level) {
            getNodesInLevel(node.nodes[0], start + 1, level);
            getNodesInLevel(node.nodes[1], start + 1, level);
            getNodesInLevel(node.nodes[2], start + 1, level);
            getNodesInLevel(node.nodes[3], start + 1, level);
        }
    }

    function RGBAToHexA(r, g, b, a) {
        r = r.toString(16);
        g = g.toString(16);
        b = b.toString(16);
        a = Math.round(a).toString(16);

        if (r.length === 1)
            r = "0" + r;
        if (g.length === 1)
            g = "0" + g;
        if (b.length === 1)
            b = "0" + b;
        if (a.length === 1)
            a = "0" + a;

        return "#" + r + g + b + a;
    }

    function handleDrawQuadTreeByRange(e) {
        console.log("change")
        if (level === 10) {
            getNodesInLevel(compressed, 0, level - 1, 10);
            getNodesInLevel(compressed, 0, level, 10);
        } else {
            getNodesInLevel(compressed, 0, level, 10);
        }
    }

 </script>

<svelte:head>
	<title>QuadTree Image Compression</title>
</svelte:head>

<div class="container">
	<div class="canvas-container">
		<h3>Click below to upload image</h3>
		<Canvas />
	</div>
	<div class="range">
		<span>QuadTree Image Compression</span>
		<div>
			<span>
                Current level = <span id="levelSpan" transition:fly={{y: 500, duration: 300}}>{level}</span>
            </span>
			<input id="range" type="range" min={min} max={max} bind:value={level} disabled={disabled} autocomplete="off" on:input ={handleDrawQuadTreeByRange}>
		</div>
	</div>
	<input id="file" type="file" on:change={run}>
	<div class="canvas-container">
		<h3>Output</h3>
		<canvas bind:this={compressedCanvas} id="quadtree" width="600" height="600"></canvas>
	</div>
</div>

<style>
    :global(*) {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    :global(html, body) {
        height: 100%;
    }

	:global(body) {
		font-family: "Andale Mono",serif, Arial, Helvetica, sans-serif;
		color: white;
		font-size: 14px;
		/*margin: 40px;*/
		background-color: rgb(18, 18, 18);
	}

    :global(canvas) {
        background: rgb(29, 29, 29);
        box-shadow: 0 0 30px rgba(0, 0, 0, .15);
        margin-top: 20px;
        border-radius: 10px;
    }

    #file {
        display: none;
    }

    .container {
        display: flex;
        padding: 100px;
        width: 100%;
        height: 100%;
        justify-content: space-between;
        align-items: center;
        background-image: url("/image/pngtree-arrow-sketch-2902205-png-image_1733937.png");
        background-repeat: no-repeat;
        background-position: center;
        background-size: 200px;
    }

    .range {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        height: 450px;
    }

    .range > div {
        display: flex;
        flex-direction: column;
    }

    .canvas-container {
        height: 650px;
        width: 600px;
        display: flex;
        align-items: center;
        flex-direction: column;
    }

    #range {
        margin-top: 20px;
    }
</style>