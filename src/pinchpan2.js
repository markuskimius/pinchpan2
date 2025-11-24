/* ***************************************************************************
* CONSTANTS
*/

const IS_MOUSE  = 0x10;
const IS_TOUCH  = 0x20;
const MOD_SHIFT = 0x01;
const MOD_CTRL  = 0x02;
const MOD_ALT   = 0x04;
const MOD_META  = 0x08;
const PIXELS_PER_LINE = 20;     /* approximate is ok */
const PIXELS_PER_PAGE = document.body.scrollHeight;


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
        this.pan = null;

        this.opts.mod = this.opts.mod ?? get_mod(opts);

        this.target.addEventListener("touchstart", (e) => this.onPanStart(e, IS_TOUCH));
        this.target.addEventListener("mousedown", (e) => this.onPanStart(e, IS_MOUSE));
        this.target.addEventListener("touchmove", (e) => this.onPanMove(e, IS_TOUCH));
        this.target.addEventListener("mousemove", (e) => this.onPanMove(e, IS_MOUSE));
        this.target.addEventListener("touchend", (e) => this.onPanCancel(e, IS_TOUCH));
        this.target.addEventListener("touchcancel", (e) => this.onPanCancel(e, IS_TOUCH));
        this.target.addEventListener("mouseup", (e) => this.onPanCancel(e, IS_MOUSE));
        this.target.addEventListener("mouseout", (e) => this.onPanCancel(e, IS_MOUSE));
    }

    onPanStart(e, sourceType) {
        if((sourceType==IS_TOUCH && e.touches.length==1) || (sourceType==IS_MOUSE && get_mod(e)==this.opts.mod)) {
            this.pan = get_pos(e);

e.preventDefault();
            if(sourceType==IS_MOUSE) {
                e.preventDefault();
            }
        }
    }

    onPanMove(e, sourceType) {
        if(((sourceType==IS_TOUCH && e.touches.length==1) || (sourceType==IS_MOUSE)) && this.pan) {
            const pos = get_pos(e);
            const isok = this.target.dispatchEvent(new CustomEvent("pan", {
                detail  : get_pan(pos, this.pan, get_mod(e)),
            }));

            if(isok) {
                e.preventDefault();
            }

            this.pan = pos;
        }
    }

    onPanCancel(e, sourceType) {
        this.pan = null;
    }
}

class Pinch {
    constructor(target, opts={}) {
        this.target = target;
        this.opts = opts;
        this.pinch = null;

        this.opts.mod = this.opts.mod ?? get_mod(opts);
        this.opts.pinchSpeed = this.opts.pinchSpeed ?? (document.body.scrollWidth/this.target.clientWidth + document.body.scrollHeight/this.target.clientHeight);
        this.opts.pixelsPerPage = this.opts.pixelsPerPage ?? this.target.scrollHeight;

        this.target.addEventListener("touchstart", (e) => this.onPinchStart(e));
        this.target.addEventListener("touchmove", (e) => this.onPinchMove(e));
        this.target.addEventListener("wheel", (e) => this.onPinchWheel(e));
        this.target.addEventListener("touchend", (e) => this.onPinchCancel(e));
        this.target.addEventListener("touchcancel", (e) => this.onPinchCancel(e));
    }

    onPinchStart(e) {
        if(e.touches.length==2) {
            this.pinch = get_pos2(e);
        }
    }

    onPinchMove(e) {
        if(e.touches.length==2 && this.pinch) {
            const pos = get_pos2(e);
            const isok = this.target.dispatchEvent(new CustomEvent("pinch", {
                detail  : get_pinch(pos, this.pinch, get_mod(e), this.opts.pinchSpeed),
            }));

            if(isok) {
                e.preventDefault();
            }

            this.pinch = pos;
        }
    }

    onPinchWheel(e) {
        if(get_mod(e)==MOD_CTRL) {
            let zf = 1;

            // deltaMode 0 : deltaY is in pixels
            // deltaMode 1 : deltaY is in lines (needs to be scaled)
            // deltaMode 2 : deltaY is in pages (need to be scaled)
            switch(e.deltaMode) {
                case 0 : zf = 1; break;
                case 1 : zf = PIXELS_PER_LINE; break;
                case 2 : zf = PIXELS_PER_PAGE; break;
            }

            let isok = this.target.dispatchEvent(new CustomEvent("pinch", {
                detail  : {
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
                e.preventDefault();
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

        this.opts.zoomMin = this.opts.zoomMin ?? 0.01;
        this.opts.zoomPerPixel = this.opts.zoomPerPixel ?? 2.0/(this.target.clientWidth + this.target.clientHeight);

        enablePan(this.target, this.opts);
        enablePinch(this.target, this.opts);

        this.target.addEventListener("pan", (e) => this.onPan(e));
        this.target.addEventListener("pinch", (e) => this.onPinch(e));
    }

    onPan(e) {
        const zoom = parseFloat(this.target.style.zoom ? this.target.style.zoom : "1.0");

        this.target.scrollBy({
            left    : -e.detail.dx/zoom,
            top     : -e.detail.dy/zoom,
        });
    }

    onPinch(e) {
        const container = this.target.getBoundingClientRect();
        const zoom = parseFloat(this.target.style.zoom ? this.target.style.zoom : "1.0");
        const factor = e.detail.dr * this.opts.zoomPerPixel * zoom;
        const newzoom = Math.max(zoom + factor, this.opts.zoomMin);
        const isok = this.target.dispatchEvent(new CustomEvent("zoom", {
            detail  : e.detail,
        }));

        if(isok) {
            this.target.style.zoom = newzoom.toString();
            this.target.scrollBy({
                left    : (e.detail.clientX-container.left)/zoom * (newzoom-zoom)/newzoom,
                top     : (e.detail.clientY-container.top)/zoom * (newzoom-zoom)/newzoom,
            });
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
function get_pan(is, was, mod) {
    return {
        clientX : is.clientX,
        clientY : is.clientY,
        offsetX : is.offsetX,
        offsetY : is.offsetY,
        pageX   : is.pageX,
        pageY   : is.pageY,
        screenX : is.screenX,
        screenY : is.screenY,
        dx      : is.pageX - was.pageX,
        dy      : is.pageY - was.pageY,
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
