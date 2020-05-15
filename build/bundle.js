
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.22.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const image = writable(null);

    /* src/Canvas.svelte generated by Svelte v3.22.2 */
    const file = "src/Canvas.svelte";

    function create_fragment(ctx) {
    	let canvas_1;
    	let dispose;

    	const block = {
    		c: function create() {
    			canvas_1 = element("canvas");
    			attr_dev(canvas_1, "id", "canvas");
    			attr_dev(canvas_1, "width", "600");
    			attr_dev(canvas_1, "height", "600");
    			add_location(canvas_1, file, 22, 0, 398);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, canvas_1, anchor);
    			/*canvas_1_binding*/ ctx[2](canvas_1);
    			if (remount) dispose();
    			dispose = listen_dev(canvas_1, "click", /*handleFileUpload*/ ctx[1], false, false, false);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(canvas_1);
    			/*canvas_1_binding*/ ctx[2](null);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let canvas;

    	onMount(() => {
    		let ctx = canvas.getContext("2d");
    		image.set(ctx);
    	});

    	// image.baseCanvas.subscribe(value => {
    	//     ctx = value;
    	// })
    	// image.set(0)
    	const handleFileUpload = () => {
    		document.getElementById("file").click();
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Canvas> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Canvas", $$slots, []);

    	function canvas_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, canvas = $$value);
    		});
    	}

    	$$self.$capture_state = () => ({ onMount, image, canvas, handleFileUpload });

    	$$self.$inject_state = $$props => {
    		if ("canvas" in $$props) $$invalidate(0, canvas = $$props.canvas);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [canvas, handleFileUpload, canvas_1_binding];
    }

    class Canvas extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Canvas",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    class Color {

        // _red = 0;
        // _green = 0;
        // _blue = 0;
        // _alpha = 0;

        constructor(red =0, green =0, blue=0, alpha=0) {
            this._red = red;
            this._green = green;
            this._blue = blue;
            this._alpha = alpha;
        }

        get red() {
            return this._red;
        }

        set red(value) {
            this._red = value;
        }

        get green() {
            return this._green;
        }

        set green(value) {
            this._green = value;
        }

        get blue() {
            return this._blue;
        }

        set blue(value) {
            this._blue = value;
        }

        get alpha() {
            return this._alpha;
        }

        set alpha(value) {
            this._alpha = value;
        }
    }

    class Nodee {
        // _x;
        // _y;
        // _width;
        // _height;
        // _color;
        // _nodes = [];

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

    class QuadTreeImp {
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

    /* src/App.svelte generated by Svelte v3.22.2 */

    const { console: console_1 } = globals;
    const file$1 = "src/App.svelte";

    function create_fragment$1(ctx) {
    	let t0;
    	let div4;
    	let div0;
    	let h30;
    	let t2;
    	let t3;
    	let div2;
    	let span0;
    	let t5;
    	let div1;
    	let span2;
    	let t6;
    	let span1;
    	let t7;
    	let span1_transition;
    	let t8;
    	let input0;
    	let t9;
    	let input1;
    	let t10;
    	let div3;
    	let h31;
    	let t12;
    	let canvas1;
    	let current;
    	let dispose;
    	const canvas0 = new Canvas({ $$inline: true });

    	const block = {
    		c: function create() {
    			t0 = space();
    			div4 = element("div");
    			div0 = element("div");
    			h30 = element("h3");
    			h30.textContent = "Click below to upload image";
    			t2 = space();
    			create_component(canvas0.$$.fragment);
    			t3 = space();
    			div2 = element("div");
    			span0 = element("span");
    			span0.textContent = "QuadTree Image Compression";
    			t5 = space();
    			div1 = element("div");
    			span2 = element("span");
    			t6 = text("Current level = ");
    			span1 = element("span");
    			t7 = text(/*level*/ ctx[1]);
    			t8 = space();
    			input0 = element("input");
    			t9 = space();
    			input1 = element("input");
    			t10 = space();
    			div3 = element("div");
    			h31 = element("h3");
    			h31.textContent = "Output";
    			t12 = space();
    			canvas1 = element("canvas");
    			document.title = "QuadTree Image Compression";
    			add_location(h30, file$1, 115, 2, 3318);
    			attr_dev(div0, "class", "canvas-container svelte-d4des6");
    			add_location(div0, file$1, 114, 1, 3285);
    			add_location(span0, file$1, 119, 2, 3399);
    			attr_dev(span1, "id", "levelSpan");
    			add_location(span1, file$1, 122, 32, 3489);
    			add_location(span2, file$1, 121, 3, 3450);
    			attr_dev(input0, "id", "range");
    			attr_dev(input0, "type", "range");
    			attr_dev(input0, "min", /*min*/ ctx[4]);
    			attr_dev(input0, "max", /*max*/ ctx[3]);
    			input0.disabled = /*disabled*/ ctx[0];
    			attr_dev(input0, "autocomplete", "off");
    			attr_dev(input0, "class", "svelte-d4des6");
    			add_location(input0, file$1, 124, 3, 3589);
    			attr_dev(div1, "class", "svelte-d4des6");
    			add_location(div1, file$1, 120, 2, 3441);
    			attr_dev(div2, "class", "range svelte-d4des6");
    			add_location(div2, file$1, 118, 1, 3377);
    			attr_dev(input1, "id", "file");
    			attr_dev(input1, "type", "file");
    			attr_dev(input1, "class", "svelte-d4des6");
    			add_location(input1, file$1, 127, 1, 3754);
    			add_location(h31, file$1, 129, 2, 3834);
    			attr_dev(canvas1, "id", "quadtree");
    			attr_dev(canvas1, "width", "600");
    			attr_dev(canvas1, "height", "600");
    			add_location(canvas1, file$1, 130, 2, 3852);
    			attr_dev(div3, "class", "canvas-container svelte-d4des6");
    			add_location(div3, file$1, 128, 1, 3801);
    			attr_dev(div4, "class", "container svelte-d4des6");
    			add_location(div4, file$1, 113, 0, 3260);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div0, h30);
    			append_dev(div0, t2);
    			mount_component(canvas0, div0, null);
    			append_dev(div4, t3);
    			append_dev(div4, div2);
    			append_dev(div2, span0);
    			append_dev(div2, t5);
    			append_dev(div2, div1);
    			append_dev(div1, span2);
    			append_dev(span2, t6);
    			append_dev(span2, span1);
    			append_dev(span1, t7);
    			append_dev(div1, t8);
    			append_dev(div1, input0);
    			set_input_value(input0, /*level*/ ctx[1]);
    			append_dev(div4, t9);
    			append_dev(div4, input1);
    			append_dev(div4, t10);
    			append_dev(div4, div3);
    			append_dev(div3, h31);
    			append_dev(div3, t12);
    			append_dev(div3, canvas1);
    			/*canvas1_binding*/ ctx[16](canvas1);
    			current = true;
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input0, "change", /*input0_change_input_handler*/ ctx[15]),
    				listen_dev(input0, "input", /*input0_change_input_handler*/ ctx[15]),
    				listen_dev(input0, "input", /*handleDrawQuadTreeByRange*/ ctx[6], false, false, false),
    				listen_dev(input1, "change", /*run*/ ctx[5], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*level*/ 2) set_data_dev(t7, /*level*/ ctx[1]);

    			if (!current || dirty & /*disabled*/ 1) {
    				prop_dev(input0, "disabled", /*disabled*/ ctx[0]);
    			}

    			if (dirty & /*level*/ 2) {
    				set_input_value(input0, /*level*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(canvas0.$$.fragment, local);

    			add_render_callback(() => {
    				if (!span1_transition) span1_transition = create_bidirectional_transition(span1, fly, { y: 500, duration: 300 }, true);
    				span1_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(canvas0.$$.fragment, local);
    			if (!span1_transition) span1_transition = create_bidirectional_transition(span1, fly, { y: 500, duration: 300 }, false);
    			span1_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div4);
    			destroy_component(canvas0);
    			if (detaching && span1_transition) span1_transition.end();
    			/*canvas1_binding*/ ctx[16](null);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function RGBAToHexA(r, g, b, a) {
    	r = r.toString(16);
    	g = g.toString(16);
    	b = b.toString(16);
    	a = Math.round(a).toString(16);
    	if (r.length === 1) r = "0" + r;
    	if (g.length === 1) g = "0" + g;
    	if (b.length === 1) b = "0" + b;
    	if (a.length === 1) a = "0" + a;
    	return "#" + r + g + b + a;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	console.log(image);
    	let arrow = "/image/pngtree-arrow-sketch-2902205-png-image_1733937.png";
    	let disabled = true;
    	let max = 10;
    	let min = 0;
    	let level = 0;
    	let image$1 = new Image(600, 600);
    	image$1.addEventListener("load", execute);
    	let baseCanvasCTX;

    	image.subscribe(value => {
    		baseCanvasCTX = value;
    	});

    	let compressed;
    	let compressedCanvas;
    	let compressedCanvasCTX;

    	onMount(() => {
    		compressedCanvasCTX = compressedCanvas.getContext("2d");
    	});

    	function execute() {
    		console.log(baseCanvasCTX);
    		baseCanvasCTX.drawImage(image$1, 0, 0, image$1.width, image$1.height);
    		compressed = new QuadTreeImp(baseCanvasCTX.getImageData(0, 0, 600, 600), image$1.width, image$1.height, 1).root;
    		console.log(compressed);
    		handleDrawQuadTree(0, parseInt(level));
    	}

    	function run(e) {
    		console.log(e);
    		if (e.target.files.length === 0) return;
    		$$invalidate(0, disabled = false);
    		image$1.src = URL.createObjectURL(e.target.files[0]);

    		let x = (baseCanvasCTX.width - image$1.width) * 0.5,
    			y = (baseCanvasCTX.height - image$1.height) * 0.5;
    	}

    	function handleDrawQuadTree(start, level) {
    		if (level === 9) {
    			getNodesInLevel(compressed, 0, level - 1);
    			getNodesInLevel(compressed, 0, level);
    		} else {
    			getNodesInLevel(compressed, 0, level);
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

    	function handleDrawQuadTreeByRange(e) {
    		console.log("change");

    		if (level === 10) {
    			getNodesInLevel(compressed, 0, level - 1);
    			getNodesInLevel(compressed, 0, level);
    		} else {
    			getNodesInLevel(compressed, 0, level);
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	function input0_change_input_handler() {
    		level = to_number(this.value);
    		$$invalidate(1, level);
    	}

    	function canvas1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(2, compressedCanvas = $$value);
    		});
    	}

    	$$self.$capture_state = () => ({
    		fly,
    		onMount,
    		Canvas,
    		QuadTreeImp,
    		imageContext: image,
    		arrow,
    		disabled,
    		max,
    		min,
    		level,
    		image: image$1,
    		baseCanvasCTX,
    		compressed,
    		compressedCanvas,
    		compressedCanvasCTX,
    		execute,
    		run,
    		handleDrawQuadTree,
    		getNodesInLevel,
    		RGBAToHexA,
    		handleDrawQuadTreeByRange
    	});

    	$$self.$inject_state = $$props => {
    		if ("arrow" in $$props) arrow = $$props.arrow;
    		if ("disabled" in $$props) $$invalidate(0, disabled = $$props.disabled);
    		if ("max" in $$props) $$invalidate(3, max = $$props.max);
    		if ("min" in $$props) $$invalidate(4, min = $$props.min);
    		if ("level" in $$props) $$invalidate(1, level = $$props.level);
    		if ("image" in $$props) image$1 = $$props.image;
    		if ("baseCanvasCTX" in $$props) baseCanvasCTX = $$props.baseCanvasCTX;
    		if ("compressed" in $$props) compressed = $$props.compressed;
    		if ("compressedCanvas" in $$props) $$invalidate(2, compressedCanvas = $$props.compressedCanvas);
    		if ("compressedCanvasCTX" in $$props) compressedCanvasCTX = $$props.compressedCanvasCTX;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		disabled,
    		level,
    		compressedCanvas,
    		max,
    		min,
    		run,
    		handleDrawQuadTreeByRange,
    		image$1,
    		baseCanvasCTX,
    		compressed,
    		compressedCanvasCTX,
    		arrow,
    		execute,
    		handleDrawQuadTree,
    		getNodesInLevel,
    		input0_change_input_handler,
    		canvas1_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
