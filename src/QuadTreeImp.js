import Nodee from "./Node";
import Color from "./Color";

export default class QuadTreeImp {
    // _height;
    // _width;
    // _root;
    // _accuracy;
    // _imageData;

    get height() {
        return this._height;
    }
    set height(value) {
        this._height = value;
    }
    get width() {
        return this._width;
    }
    set width(value) {
        this._width = value;
    }
    get root() {
        return this._root;
    }
    set root(value) {
        this._root = value;
    }
    get accuracy() {
        return this._accuracy;
    }
    set accuracy(value) {
        this._accuracy = value;
    }

    constructor(image, width, height, accuracy) {
        this._height = height;
        this._width = width;
        this._accuracy = accuracy;
        this._imageData = image;
        // console.group("Node Colors");
        this.root = this.compress(0, 0, width, height);
        // console.groupEnd();
        // console.log(this.calcHeight(this.root));
    }

    getImageColor(x, y) {
        let w = this._imageData.width;
        let formula = x * (w * 4) + (y * 4);

        return new Color(
            this._imageData.data[formula],
            this._imageData.data[formula + 1],
            this._imageData.data[formula + 2],
            this._imageData.data[formula + 3],
        );
    }

    compress(i, j, h, w) {

        // console.log(Nodee)
        let node = new Nodee(j, i, w, h);
        let c;

        if (h === 1 && w === 1) {
            node.color = this.getImageColor(i, j);
        } else if (h === 1 || w === 1) {

            if (h === 1) {

                if (w <= 4) {

                    for (let k = 0; k < w; ++k) {
                        node.nodes[k] = this.compress(i, j + k, h, 1);
                    }

                } else {

                    let w_ = w / 2;

                    node.nodes[0] = this.compress(i, j, 1, w_);
                    node.nodes[1] = this.compress(i, j + w_, 1, w - w_);

                }

            } else {

                if (h <= 4) {

                    for (let k = 0; k < h; ++k) {
                        node.nodes[k] = this.compress(i + k, j, 1, w);
                    }

                } else {

                    let h_ = h / 2;

                    node.nodes[0] = this.compress(i, j, h_, 1);
                    node.nodes[1] = this.compress(i + h_, j, h - h_, 1);

                }

            }

            node.color = node.averageChildren();


        } else if ((c = this.getNodeColor(i, j, h, w)) !== null) {
            node.color = c;
        } else {

            let h_ = parseInt(h / 2);
            let w_ = parseInt(w / 2);

            node.nodes[0] = this.compress(i, j + w_, h_, w - w_);
            node.nodes[1] = this.compress(i, j, h_, w_);
            node.nodes[2] = this.compress(i + h_, j, h - h_, w_);
            node.nodes[3] = this.compress(i + h_, j + w_, h - h_, w - w_);

            node.color = node.averageChildren();
        }

        return node;

    }

    getNodeColor(i, j, h, w) {
        let colors = new Map();

        let r = 0;
        let g = 0;
        let b = 0;
        let a = 0;

        for (let k = 0; k < h; ++k) {

            for (let l = 0; l < w; ++l) {

                let c = this.getImageColor(k + i, l + j);

                r = r + (c.red / 255);
                g = g + (c.green / 255);
                b = b + (c.blue / 255);
                a = a + (c.alpha / 255);

                if (!colors.has(c)) {
                    colors.set(c, 1);
                } else {
                    let count = colors.get(c) + 1;
                    colors.set(c, count);
                }

            }

        }

        let size = h * w;

        r = r / size;
        g = g / size;
        b = b / size;
        a = a / size;

        let max = 0;
        for (let c in colors.keys()) {

            let count = colors.get(c);
            max = Math.max(max, count);

        }

        let currentAccuracy = max / size;

        return (currentAccuracy >= this._accuracy) ? new Color(r, g, b, a) : null;

    }

    calcHeight(node) {

        if (node == null) return 0;
        if (node.nodes.length === 0) return 0;

        let h1 = this.calcHeight(node.nodes[0]);
        let h2 = this.calcHeight(node.nodes[1]);
        let h3 = this.calcHeight(node.nodes[2]);
        let h4 = this.calcHeight(node.nodes[3]);

        let max = (h1 > h2) ? h1 : (h2 > h3) ? h2 : (h3 > h4) ? h3 : h4;

        return max + 1;

    }
}
