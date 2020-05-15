class QuadTree {
    FileInput;
    Canvas;
    Image;
    ImageData;
    ctx;
    button;
    root;
    newCanvas;
    newContext;
    RangeSlider;

    constructor() {
        // this.FileInput = document.querySelector("#file");
        // this.Canvas = document.querySelector("#canvas");
        // this.newCanvas = document.querySelector("#quadtree");
        // this.RangeSlider = document.querySelector("#range");
        // this.levelSpan = document.querySelector("#levelSpan");
        // this.button = document.querySelector("#button");
        // console.log(this);
        this.RangeSlider.addEventListener("input", this.handleDrawQuadTreeByRange.bind(this), false);
        this.FileInput.addEventListener("change", this.handleFile.bind(this), false);
        // this.button.addEventListener("click", this.handleDrawQuadTree.bind(this), false);
        this.Canvas.addEventListener("click", this.handleCanvasUpload.bind(this), false);
        this.ctx = this.Canvas.getContext("2d");
        this.newContext = this.newCanvas.getContext("2d");
        this.Image = new Image(600, 600);
        this.Image.addEventListener('load', this.execute.bind(this));
    }

    handleCanvasUpload() {
        this.FileInput.click();
    }

    execute() {
        this.ctx.drawImage(this.Image, 0, 0, this.Image.width, this.Image.height);

        this.root = new QuadTreeImp(this.ctx.getImageData(0, 0, 600, 600),
            this.Image.width,
            this.Image.height,
            1).root;
        console.log(this.root);

        this.handleDrawQuadTree(0, parseInt(this.RangeSlider.value));
    }


    handleFile(e) {
        if (e.target.value.length === 0)
            return;

        this.RangeSlider.disabled = false;
        let url = URL.createObjectURL(e.target.files[0]);
        this.Image.src = url;
        let x = (this.Canvas.width - this.Image.width) * 0.5,
            y = (this.Canvas.height - this.Image.height) * 0.5;

    }

    handleDrawQuadTree(start, level) {
        if (level === 9) {
            this.getNodesInLevel(this.root, 0, level - 1, 10);
            this.getNodesInLevel(this.root, 0, level, 10);
        } else {
            this.getNodesInLevel(this.root, 0, level, 10);
        }
    }

    handleDrawQuadTreeByRange(e) {
        this.levelSpan.innerHTML = (parseInt(e.target.max) - parseInt(e.target.value)).toString();
        let level = parseInt(e.target.value);
        if (level === 10) {
            this.getNodesInLevel(this.root, 0, level - 1, 10);
            this.getNodesInLevel(this.root, 0, level, 10);
        } else {
            this.getNodesInLevel(this.root, 0, level, 10);
        }
    }

    getNodesInLevel(node, start, level) {
        if (node === undefined) return;
        if (start === level) {
            this.newContext.moveTo(node.x, node.y);
            this.newContext.fillStyle = this.RGBAToHexA(node.color.red, node.color.green, node.color.blue, node.color.alpha);
            this.newContext.fillRect(node.x, node.y, node.width, node.height);
        } else if (start < level) {
            this.getNodesInLevel(node.nodes[0], start + 1, level);
            this.getNodesInLevel(node.nodes[1], start + 1, level);
            this.getNodesInLevel(node.nodes[2], start + 1, level);
            this.getNodesInLevel(node.nodes[3], start + 1, level);
        }
    }

    _animate(node) {
        const duration = 2.50;

        const opacitySteps = parseInt(60 * duration);

        const opacityStep = 0;

        let opacity = 100 * (opacityStep / opacitySteps);
        if (opacityStep >= opacitySteps - 1) {
            opacity = 100;
        }

        this.newCanvas.globalAlpha = (100 - opacity) / 100;
        this.newCanvas.newCanvas.fillStyle = this.RGBAToHexA(node.color.red, node.color.green, node.color.blue, node.color.alpha);
        this.newContext.fillRect(node.x, node.y, node.width, node.height);
    }


    RGBAToHexA(r, g, b, a) {
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
}