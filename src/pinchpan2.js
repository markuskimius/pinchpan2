/* ***************************************************************************
* CONSTANTS
*/

const IS_MOUSE  = 0x10;
const IS_TOUCH  = 0x20;
const MOD_SHIFT = 0x01;
const MOD_CTRL  = 0x02;
const MOD_ALT   = 0x04;
const MOD_META  = 0x08;
const INERTIA_UPDATE_RATE = 10.0;  /* in milliseconds */

const DEFAULT_PAN_INERTIA = 0.98;
const DEFAULT_PAN_SPEED = 3.0;
const DEFAULT_PINCH_SPEED = 10.0;
const DEFAULT_ZOOM_MIN = 0.01;
const DEFAULT_ZOOM_MAX = Infinity;
const DEFAULT_ZOOM_PER_PIXEL = 0.001;


/* ***************************************************************************
* GLOBALS
*/

const EVENT_HANDLERS = new Map();


/* ***************************************************************************
* CLASSES
*/

class Pan {
    constructor(target, opts={}) {
        this.target = target;
        this.opts = opts;
        this.last_pos = null;
        this.last_pan = null;
        this.timerLast = null;
        this.timerId = null;

        this.opts.panInertia = this.opts.panInertia ?? DEFAULT_PAN_INERTIA;
        this.opts.panSpeed = this.opts.panSpeed ?? DEFAULT_PAN_SPEED;

        this.target.addEventListener("touchstart", (e) => this.onPanStart(e, IS_TOUCH), { passive:false });
        this.target.addEventListener("mousedown", (e) => this.onPanStart(e, IS_MOUSE), { passive:false });
        window.addEventListener("touchmove", (e) => this.onPanMove(e, IS_TOUCH), { passive:false });
        window.addEventListener("mousemove", (e) => this.onPanMove(e, IS_MOUSE), { passive:false });
        window.addEventListener("touchend", (e) => this.onPanCancel(e, IS_TOUCH), { passive:false });
        window.addEventListener("touchcancel", (e) => this.onPanCancel(e, IS_TOUCH), { passive:false });
        window.addEventListener("mouseup", (e) => this.onPanCancel(e, IS_MOUSE), { passive:false });
        // window.addEventListener("mouseout", (e) => this.onPanCancel(e, IS_MOUSE), { passive:false });
    }

    onPanStart(e, sourceType) {
        if((sourceType==IS_TOUCH && e.touches.length==1) || (sourceType==IS_MOUSE && (get_mod(e)==MOD_CTRL || get_mod(e)==MOD_META))) {
            if(this.timerId) {
                clearTimeout(this.timerId);
                this.timerLast = null;
                this.timerId = null;
            }

            /* Prevent text selection */
            if(sourceType==IS_MOUSE && e.cancelable) {
                e.preventDefault();
            }

            this.last_pos = get_pos(e);
            this.last_pan = null;
        }
    }

    onPanMove(e, sourceType) {
        if(((sourceType==IS_TOUCH && e.touches.length==1) || (sourceType==IS_MOUSE)) && this.last_pos) {
            if(this.timerId) {
                clearTimeout(this.timerId);
                this.timerLast = null;
                this.timerId = null;
            }

            const pos = get_pos(e);
            const pan = get_pan(pos, this.last_pos, get_mod(e), sourceType==IS_TOUCH ? this.opts.panSpeed : 1.0);
            const isok = this.target.dispatchEvent(new CustomEvent("pan", {
                cancelable  : true,
                detail      : pan,
            }));

            if(isok) {
                if(e.cancelable) e.preventDefault();
                e.stopPropagation();
            }

            this.last_pos = pos;
            this.last_pan = pan;
        }
    }

    onPanCancel(e, sourceType) {
        const pan = this.last_pan;

        if(this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }

        if(pan) {
            /* Adjust the deltas so they're in INERTIA_UPDATE_RATE */
            pan.dx *= INERTIA_UPDATE_RATE / pan.dt;
            pan.dy *= INERTIA_UPDATE_RATE / pan.dt;
            pan.dt = INERTIA_UPDATE_RATE;

            this.timerLast = Date.now();
            this.timerId = setTimeout(
                () => this.onTimer(pan),
                INERTIA_UPDATE_RATE,
            );
        }

        this.last_pos = null;
        this.last_pan = null;
    }

    onTimer(last_pan) {
        if(last_pan) {
            last_pan.dx *= this.opts.panInertia;
            last_pan.dy *= this.opts.panInertia;

            this.target.dispatchEvent(new CustomEvent("pan", {
                detail  : last_pan,
            }));

            if(Math.abs(last_pan.dx) >= 1 || Math.abs(last_pan.dy) >= 1) {
                const now = Date.now();
                const diff = now - this.timerLast;

                this.timerLast = now;
                this.timerId = setTimeout(
                    () => this.onTimer(last_pan),
                    Math.max(INERTIA_UPDATE_RATE-diff, 0),
                );
            }
            else {
                this.timerId = null;
                this.last_pos = null;
                this.last_pan = null;
            }
        }
    }
}

class Pinch {
    constructor(target, opts={}) {
        this.target = target;
        this.opts = opts;
        this.pinch = null;

        this.opts.pinchSpeed = this.opts.pinchSpeed ?? DEFAULT_PINCH_SPEED;

        this.target.addEventListener("touchstart", (e) => this.onPinchStart(e), { passive:false });
        this.target.addEventListener("wheel", (e) => this.onPinchWheel(e), { passive:false });
        window.addEventListener("touchmove", (e) => this.onPinchMove(e), { passive:false });
        window.addEventListener("touchend", (e) => this.onPinchCancel(e), { passive:false });
        window.addEventListener("touchcancel", (e) => this.onPinchCancel(e), { passive:false });
    }

    onPinchStart(e) {
        if(e.touches.length==2) {
            this.pinch = get_pos2(e);

            if(e.cancelable) e.preventDefault();
        }
    }

    onPinchMove(e) {
        if(e.touches.length==2 && this.pinch) {
            const pos = get_pos2(e);
            const isok = this.target.dispatchEvent(new CustomEvent("pinch", {
                cancelable  : true,
                detail      : get_pinch(pos, this.pinch, get_mod(e), this.opts.pinchSpeed),
            }));

            if(isok) {
                if(e.cancelable) e.preventDefault();
                e.stopPropagation();
            }

            this.pinch = pos;
        }
    }

    onPinchWheel(e) {
        const mod = get_mod(e);

        if(mod==MOD_CTRL || mod==MOD_META) {
            let zf = 1;

            // deltaMode 0 : deltaY is in pixels
            // deltaMode 1 : deltaY is in lines (needs to be scaled)
            // deltaMode 2 : deltaY is in pages (need to be scaled)
            switch(e.deltaMode) {
                case 0 : zf = 1; break;
                case 1 : zf = window.getComputedStyle(this.target).lineHeight; break;
                case 2 : zf = this.target.scrollHeight; break;
            }

            const isok = this.target.dispatchEvent(new CustomEvent("pinch", {
                cancelable  : true,
                detail      : {
                    clientX : e.clientX,
                    clientY : e.clientY,
                    offsetX : e.offsetX,
                    offsetY : e.offsetY,
                    pageX   : e.pageX,
                    pageY   : e.pageY,
                    screenX : e.screenX,
                    screenY : e.screenY,
                    dr      : -e.deltaY * zf,
                    shiftKey: e.shiftKey,
                    ctrlKey : e.ctrlKey,
                    altKey  : e.altKey,
                    metaKey : e.metaKey,
                },
            }));

            if(isok) {
                if(e.cancelable) e.preventDefault();
                e.stopPropagation();
            }
        }
    }

    onPinchCancel(e) {
        this.pinch = null;
    }
}

class Zoom {
    constructor(target, opts={}) {
        this.target = target;
        this.opts = opts;

        this.opts.zoomMin = this.opts.zoomMin ?? DEFAULT_ZOOM_MIN;
        this.opts.zoomMax = this.opts.zoomMax ?? DEFAULT_ZOOM_MAX;
        this.opts.zoomPerPixel = this.opts.zoomPerPixel ?? DEFAULT_ZOOM_PER_PIXEL;

        enablePan(this.target, this.opts);
        enablePinch(this.target, this.opts);

        this.target.style.touchAction = "none";
        this.target.addEventListener("pan", (e) => this.onPan(e), { passive:false });
        this.target.addEventListener("pinch", (e) => this.onPinch(e), { passive:false });
    }

    onPan(e) {
        let isok = (e.detail.dx || e.detail.dy);

        if(isok) {
            const zoom = parseFloat(this.target.style.zoom ? this.target.style.zoom : "1.0");

            const next = {
                left    : this.target.scrollLeft - e.detail.dx/zoom,
                top     : this.target.scrollTop  - e.detail.dy/zoom,
            }

            this.target.scrollTo({
                left    : next.left,
                top     : next.top,
            });

            /* We didn't scroll! */
            if(this.target.scrollLeft != next.left && this.target.scrollTop != next.top) {
                isok = false;
            }
        }

        if(!isok && e.cancelable) {
            e.preventDefault();
        }
    }

    onPinch(e) {
        const container = this.target.getBoundingClientRect();
        const zoom = parseFloat(this.target.style.zoom ? this.target.style.zoom : "1.0");
        const factor = e.detail.dr * this.opts.zoomPerPixel * zoom;
        const newzoom = Math.min(Math.max(zoom + factor, this.opts.zoomMin), this.opts.zoomMax);
        const isok = (newzoom != zoom) && this.target.dispatchEvent(new CustomEvent("zoom", {
            cancelable  : true,
            detail      : e.detail,
        }));

        if(isok) {
            this.target.style.zoom = newzoom.toString();
            this.target.scrollBy({
                left    : (e.detail.pageX-container.left)/zoom * (newzoom-zoom)/newzoom,
                top     : (e.detail.pageY-container.top)/zoom * (newzoom-zoom)/newzoom,
            });
        }

        if(!isok && e.cancelable) {
            e.preventDefault();
        }
    }
}


/* ***************************************************************************
* FUNCTIONS
*/

/* Return the average clientX/screenX/pageX or clientY/screenY/pageY */
function avg(touches, what) {
    let sum = 0;

    for(let i = 0; i < touches.length; i++) {
        sum += touches[i][what];
    }

    return sum / touches.length;
}

/* Return a single-position object that tracks a single touch */
function get_pos(e) {
    return {
        datetime: Date.now(),
        clientX : e.touches ? avg(e.touches, 'clientX') : e.clientX,
        clientY : e.touches ? avg(e.touches, 'clientY') : e.clientY,
        offsetX : e.touches ? avg(e.touches, 'offsetX') : e.offsetX,
        offsetY : e.touches ? avg(e.touches, 'offsetY') : e.offsetY,
        pageX   : e.touches ? avg(e.touches, 'pageX') : e.pageX,
        pageY   : e.touches ? avg(e.touches, 'pageY') : e.pageY,
        screenX : e.touches ? avg(e.touches, 'screenX') : e.screenX,
        screenY : e.touches ? avg(e.touches, 'screenY') : e.screenY,
        shiftKey: e.shiftKey,
        ctrlKey : e.ctrlKey,
        altKey  : e.altKey,
        metaKey : e.metaKey,
    };
}

/* Return a double-position object that tracks a double touch */
function get_pos2(e) {
    return [
        {
            clientX : e.touches[0].clientX,
            clientY : e.touches[0].clientY,
            offsetX : e.touches[0].offsetX,
            offsetY : e.touches[0].offsetY,
            pageX   : e.touches[0].pageX,
            pageY   : e.touches[0].pageY,
            screenX : e.touches[0].screenX,
            screenY : e.touches[0].screenY,
        },
        {
            clientX : e.touches[1].clientX,
            clientY : e.touches[1].clientY,
            offsetX : e.touches[1].offsetX,
            offsetY : e.touches[1].offsetY,
            pageX   : e.touches[1].pageX,
            pageY   : e.touches[1].pageY,
            screenX : e.touches[1].screenX,
            screenY : e.touches[1].screenY,
        },
    ];
}

/* Return a pan object that tracks change in cartesian coordinates */
function get_pan(is, was, mod, speed=1.0) {
    return {
        clientX : is.clientX,
        clientY : is.clientY,
        offsetX : is.offsetX,
        offsetY : is.offsetY,
        pageX   : is.pageX,
        pageY   : is.pageY,
        screenX : is.screenX,
        screenY : is.screenY,
        dx      : (is.screenX - was.screenX) * speed,
        dy      : (is.screenY - was.screenY) * speed,
        dt      : is.datetime - was.datetime,
        shiftKey: mod & MOD_SHIFT ? true : false,
        ctrlKey : mod & MOD_CTRL ? true : false,
        altKey  : mod & MOD_ALT ? true : false,
        metaKey : mod & MOD_META ? true : false,
    };
}

/* Return the distance between two single-position objects */
function get_dist(a, b) {
    const c = get_pan(a, b);

    return Math.sqrt(c.dx*c.dx + c.dy*c.dy);
}

///* Return the manhattan distance between two single-position objects */
//function get_mdist(a, b) {
//    const c = get_pan(a, b);
//
//    return Math.abs(c.dx) + Math.abs(c.dy);
//}

/* Return a pinch object that tracks the average position and change in radius */
function get_pinch(is, was, mod, speed) {
    const rdiff = get_dist(is[0], is[1]) - get_dist(was[0], was[1]);

    return {
        clientX : (is[0].clientX + is[1].clientX + was[0].clientX + was[1].clientX) / 4,
        clientY : (is[0].clientY + is[1].clientY + was[0].clientY + was[1].clientY) / 4,
        offsetX : (is[0].offsetX + is[1].offsetX + was[0].offsetX + was[1].offsetX) / 4,
        offsetY : (is[0].offsetY + is[1].offsetY + was[0].offsetY + was[1].offsetY) / 4,
        pageX   : (is[0].pageX + is[1].pageX + was[0].pageX + was[1].pageX) / 4,
        pageY   : (is[0].pageY + is[1].pageY + was[0].pageY + was[1].pageY) / 4,
        screenX : (is[0].screenX + is[1].screenX + was[0].screenX + was[1].screenX) / 4,
        screenY : (is[0].screenY + is[1].screenY + was[0].screenY + was[1].screenY) / 4,
        dr      : rdiff * speed,
        shiftKey: mod & MOD_SHIFT ? true : false,
        ctrlKey : mod & MOD_CTRL ? true : false,
        altKey  : mod & MOD_ALT ? true : false,
        metaKey : mod & MOD_META ? true : false,
    };
}

/* Return the modifiers in bits */
function get_mod(e) {
    let bits = 0;

    if(e.shiftKey)  bits |= MOD_SHIFT;
    if(e.ctrlKey)   bits |= MOD_CTRL;
    if(e.altKey)    bits |= MOD_ALT;
    if(e.metaKey)   bits |= MOD_META;

    return bits;
}


/* ***************************************************************************
* EXPORTS
*/

function enablePan(element, opts={}) {
    EVENT_HANDLERS.has(element) || EVENT_HANDLERS.set(element, Object.create(null));
    EVENT_HANDLERS.get(element).pan = EVENT_HANDLERS.get(element).pan ?? new Pan(element, opts);

    return EVENT_HANDLERS.get(element).pan;
}

function enablePinch(element, opts={}) {
    EVENT_HANDLERS.has(element) || EVENT_HANDLERS.set(element, Object.create(null));
    EVENT_HANDLERS.get(element).pinch = EVENT_HANDLERS.get(element).pinch ?? new Pinch(element, opts);

    return EVENT_HANDLERS.get(element).pinch;
}

function enableZoom(element, opts={}) {
    EVENT_HANDLERS.has(element) || EVENT_HANDLERS.set(element, Object.create(null));
    EVENT_HANDLERS.get(element).zoom = EVENT_HANDLERS.get(element).zoom ?? new Zoom(element, opts);

    return EVENT_HANDLERS.get(element).zoom;
}

export default {
    pannable    : enablePan,
    pinchable   : enablePinch,
    zoomable    : enableZoom,
}


/* vim:ft=javascript:
*/
