import Color from "./Color"

export default class QuadTreeNode {
    get x() {
        return this._x;
    }

    set x(value) {
        this._x = value;
    }

    get y() {
        return this._y;
    }

    set y(value) {
        this._y = value;
    }

    get width() {
        return this._width;
    }

    set width(value) {
        this._width = value;
    }

    get height() {
        return this._height;
    }

    set height(value) {
        this._height = value;
    }

    get color() {
        return this._color;
    }

    set color(value) {
        this._color = value;
    }

    get nodes() {
        return this._nodes;
    }

    set nodes(value) {
        this._nodes = value;
    }

    constructor(x, y, width, height) {
        this._x = x;
        this._y = y;
        this._width = width;
        this._height = height;
        this._color = new Color();
        this.nodes = [];
    }

    averageChildren() {
        let r = 0;
        let g = 0;
        let b = 0;
        let a = 0;

        let div = 0;
        for (let i = 0; i < this.nodes.length; ++i) {

            if (this.nodes[i] !== undefined) {
                r += (this.nodes[i].color.red);
                g += (this.nodes[i].color.green);
                b += (this.nodes[i].color.blue);
                a += (this.nodes[i].color.alpha);
                ++div;
            }
        }

        r = parseInt(r / div);
        g = parseInt(g / div);
        b = parseInt(b / div);
        a = parseInt(a / div);

        return new Color(r, g, b, a);

    }
    _averageChildren() {
        let r = 0;
        let g = 0;
        let b = 0;
        let a = 0;

        let div = 0;
        for (let i = 0; i < this.nodes.length; ++i) {

            if (this.nodes[i] !== undefined) {

                r = r + (this.nodes[i].color.red / 255);
                g = g + (this.nodes[i].color.green / 255);
                b = b + (this.nodes[i].color.blue / 255);
                a = a + (this.nodes[i].color.alpha / 255);
                ++div;
            }
        }

        r = r / div;
        g = g / div;
        b = b / div;
        a = a / div;

        return new Color(r, g, b, a);

    }

    isLeaf() {
        // this.nodes[0] == null && this.nodes[1] == null && this.nodes[2] == null && this.nodes[3] == null
        return this.nodes.length === 0;
    }


}