/* ***************************************************************************
* CONSTANTS
*/

const MOD_SHIFT = 0x01;
const MOD_CTRL  = 0x02;
const MOD_ALT   = 0x04;
const MOD_META  = 0x08;
const PAN_TAP_THRESHOLD = 5;
const PIXELS_PER_LINE = 20;     /* approximate is ok */
const PIXELS_PER_PAGE = document.body.scrollHeight;
const PINCH_FACTOR = 2.0;


/* ***************************************************************************
* GLOBALS
*/

const EVENT_HANDLERS = {};


/* ***************************************************************************
* CLASSES
*/

class Tap {
    constructor(target, opts={}) {
        this.target = target;
        this.opts = opts;
        this.tap = null;
        this.tap_travel = 0;

        if(!("preventDefault" in opts)) opts.preventDefault = true;
        if(!("zoomFactor" in opts)) opts.zoomFactor = 1.0;

        this.target.addEventListener("touchstart", (e) => this.onTapStart(e));
        this.target.addEventListener("mousedown", (e) => this.onTapStart(e));
        this.target.addEventListener("touchmove", (e) => this.onTapMove(e));
        this.target.addEventListener("mousemove", (e) => this.onTapMove(e));
        this.target.addEventListener("touchend", (e) => this.onTapEnd(e));
        this.target.addEventListener("mouseup", (e) => this.onTapEnd(e));
        this.target.addEventListener("touchcancel", (e) => this.onTapCancel(e));
        this.target.addEventListener("mouseout", (e) => this.onTapCancel(e));
    }

    onTapStart(e) {
        if(!e.touch || e.touches.length==1) {
            this.tap = get_pos(e);
            this.tap_travel = 0;

            if(this.opts.preventDefault) e.preventDefault();
        }
    }

    onTapMove(e) {
        if((!e.touch || e.touches.length==1) && this.tap) {
            const dist = get_dist(get_pos(e), this.tap);

            this.tap_travel = Math.max(dist, this.tap_travel);
        }
    }

    onTapEnd(e) {
        if(this.tap && this.tap_travel<=PAN_TAP_THRESHOLD) {
            this.target.dispatchEvent(new CustomEvent("tap", {
                detail  : {
                    clientX : e.clientX,
                    clientY : e.clientY,
                    screenX : e.screenX,
                    screenY : e.screenY,
                    pageX   : e.pageX,
                    pageY   : e.pageY,
                    shiftKey: e.shiftKey,
                    ctrlKey : e.ctrlKey,
                    altKey  : e.altKey,
                    metaKey : e.metaKey,
                },
            }));
        }

        this.tap = null;
        this.tap_travel = 0;
    }

    onTapCancel(e) {
        this.tap = null;
        this.tap_travel = 0;
    }
}

class Pan {
    constructor(target, opts={}) {
        this.target = target;
        this.opts = opts;
        this.pan = null;
        this.isPan = false;

        if(!("preventDefault" in opts)) opts.preventDefault = true;
        if(!("zoomFactor" in opts)) opts.zoomFactor = 1.0;

        this.target.addEventListener("touchstart", (e) => this.onPanStart(e));
        this.target.addEventListener("mousedown", (e) => this.onPanStart(e));
        this.target.addEventListener("touchmove", (e) => this.onPanMove(e));
        this.target.addEventListener("mousemove", (e) => this.onPanMove(e));
        this.target.addEventListener("touchend", (e) => this.onPanCancel(e));
        this.target.addEventListener("touchcancel", (e) => this.onPanCancel(e));
        this.target.addEventListener("mouseup", (e) => this.onPanCancel(e));
        this.target.addEventListener("mouseout", (e) => this.onPanCancel(e));
    }

    onPanStart(e) {
        if(!e.touch || e.touches.length==1) {
            this.pan = get_pos(e);

            if(this.opts.preventDefault) e.preventDefault();
        }
    }

    onPanMove(e) {
        if((!e.touch || e.touches.length==1) && this.pan) {
            const pos = get_pos(e);

            if(!this.isPan) {
                const dist = get_dist(pos, this.pan);
                if(dist > PAN_TAP_THRESHOLD) this.isPan = true;
            }

            if(this.isPan) {
                this.target.dispatchEvent(new CustomEvent("pan", {
                    detail  : get_pan(pos, this.pan, get_mod(e)),
                }));

                this.pan = pos;
            }
        }
    }

    onPanCancel(e) {
        this.pan = null;
        this.isPan = false;
    }
}

class Pinch {
    constructor(target, opts={}) {
        this.target = target;
        this.opts = opts;
        this.pinch = null;

        if(!("preventDefault" in opts)) opts.preventDefault = true;
        if(!("zoomFactor" in opts)) opts.zoomFactor = 1.0;

        this.target.addEventListener("touchstart", (e) => this.onPinchStart(e));
        this.target.addEventListener("touchmove", (e) => this.onPinchMove(e));
        this.target.addEventListener("wheel", (e) => this.onPinchWheel(e));
        this.target.addEventListener("touchend", (e) => this.onPinchCancel(e));
        this.target.addEventListener("touchcancel", (e) => this.onPinchCancel(e));
    }

    onPinchStart(e) {
        if(!e.touches || e.touches.length==2) {
            this.pinch = get_pos2(e);

            if(this.opts.preventDefault) e.preventDefault();
        }
    }

    onPinchMove(e) {
        if((!e.touches || e.touches.length==2) && this.pinch) {
            const pos = get_pos2(e);

            this.target.dispatchEvent(new CustomEvent("pinch", {
                detail  : get_pinch(pos, this.pinch, get_mod(e)),
            }));

            this.pinch = pos;
            if(this.opts.preventDefault) e.preventDefault();
        }
    }

    onPinchWheel(e) {
        if(get_mod(e) == MOD_CTRL) {
            let zf = 1;

            // deltaMode 0 : deltaY is in pixels
            // deltaMode 1 : deltaY is in lines (needs to be scaled)
            // deltaMode 2 : deltaY is in pages (need to be scaled)
            switch(e.deltaMode) {
                case 0 : zf = 1; break;
                case 1 : zf = PIXELS_PER_LINE; break;
                case 2 : zf = PIXELS_PER_PAGE; break;
            }

            this.target.dispatchEvent(new CustomEvent("pinch", {
                detail  : {
                    clientX : e.clientX,
                    clientY : e.clientY,
                    screenX : e.screenX,
                    screenY : e.screenY,
                    pageX   : e.pageX,
                    pageY   : e.pageY,
                    dr      : -e.deltaY * this.opts.zoomFactor / zf,
                    shiftKey: e.shiftKey,
                    ctrlKey : e.ctrlKey,
                    altKey  : e.altKey,
                    metaKey : e.metaKey,
                },
            }));

            if(this.opts.preventDefault) e.preventDefault();
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
        this.pinch = new Pinch(this.target, opts);

        if(!("preventDefault" in opts)) opts.preventDefault = true;
        if(!("zoomFactor" in opts)) opts.zoomFactor = 1.0;

        this.target.addEventListener("pinch", (e) => this.onPinch(e));
    }

    onPinch(e) {
        const zoom = parseFloat(this.target.style.zoom ? this.target.style.zoom : "1.0");
        const factor = e.detail.dr * this.opts.zoomFactor / 100.0;

        this.target.style.zoom = (zoom + factor).toString();
        // this.target.scrollBy(e.detail.clientX*factor, e.detail.clientY*factor);

        this.target.dispatchEvent(new CustomEvent("zoom", {
            detail  : e.detail,
        }));
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
        screenX : e.touches ? avg(e.touches, 'screenX') : e.screenX,
        screenY : e.touches ? avg(e.touches, 'screenY') : e.screenY,
        pageX   : e.touches ? avg(e.touches, 'pageX') : e.pageX,
        pageY   : e.touches ? avg(e.touches, 'pageY') : e.pageY,
    };
}

/* Return a double-position object that tracks a double touch */
function get_pos2(e) {
    return [
        {
            clientX : e.touches[0].clientX,
            clientY : e.touches[0].clientY,
            screenX : e.touches[0].screenX,
            screenY : e.touches[0].screenY,
            pageX   : e.touches[0].pageX,
            pageY   : e.touches[0].pageY,
        },
        {
            clientX : e.touches[1].clientX,
            clientY : e.touches[1].clientY,
            screenX : e.touches[1].screenX,
            screenY : e.touches[1].screenY,
            pageX   : e.touches[1].pageX,
            pageY   : e.touches[1].pageY,
        },
    ];
}

/* Return a pan object that tracks change in cartesian coordinates */
function get_pan(is, was, mod) {
    return {
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

/* Return a pinch object that tracks the average position and change in radius */
function get_pinch(is, was, mod) {
    const rdiff = get_dist(is[0], is[1]) - get_dist(was[0], was[1]);

    return {
        clientX : (is[0].clientX + is[1].clientX + was[0].clientX + was[1].clientX) / 4,
        clientY : (is[0].clientY + is[1].clientY + was[0].clientY + was[1].clientY) / 4,
        screenX : (is[0].screenX + is[1].screenX + was[0].screenX + was[1].screenX) / 4,
        screenY : (is[0].screenY + is[1].screenY + was[0].screenY + was[1].screenY) / 4,
        pageX   : (is[0].pageX + is[1].pageX + was[0].pageX + was[1].pageX) / 4,
        pageY   : (is[0].pageY + is[1].pageY + was[0].pageY + was[1].pageY) / 4,
        dr      : rdiff * PINCH_FACTOR,
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

export default {
    tappable    : (element, opts) => (element in EVENT_HANDLERS ? EVENT_HANDLERS[element] : EVENT_HANDLERS[element]={}).tap = new Tap(element, opts),
    pannable    : (element, opts) => (element in EVENT_HANDLERS ? EVENT_HANDLERS[element] : EVENT_HANDLERS[element]={}).pan = new Pan(element, opts),
    pinchable   : (element, opts) => (element in EVENT_HANDLERS ? EVENT_HANDLERS[element] : EVENT_HANDLERS[element]={}).pitch = new Pinch(element, opts),
    zoomable    : (element, opts) => (element in EVENT_HANDLERS ? EVENT_HANDLERS[element] : EVENT_HANDLERS[element]={}).zoom = new Zoom(element, opts),
}


/* vim:ft=javascript:
*/
