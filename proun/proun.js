var Proun = Proun || {};

Proun.namespace = function(ns) {
    var parts = ns.split('.');
    var parent = Proun;

    if (parts[0] === "Proun") {
        parts = parts.slice(1);
    }

    for (var i = 0; i < parts.length; i++) {
        if (typeof parent[parts[i]] === "undefined") {
            parent[parts[i]] = {};
        }
        parent = parent[parts[i]];
    }
    return parent;
};

// Util //

Proun.namespace("Proun.Util");
Proun.Util.getIntersections = function(r, theta, xOffset, yOffset, parentWidth, parentHeight) {
    // find intersections.
    // NOTE: r and theta are parameters with bottom-left origin
    var EDGE = { TOP: 0, RIGHT: 1, BOTTOM: 2, LEFT: 3 };
    var p = [];
    var intersects = [];

    // y = ax + b
    if (theta == 0) {
        intersects[EDGE.RIGHT] = false;
        intersects[EDGE.LEFT] = false;
        if (0 <= r + xOffset && r + xOffset <= parentWidth) {
            intersects[EDGE.TOP] = true;
            intersects[EDGE.BOTTOM] = true;
            p[EDGE.TOP] = { x: xOffset + r, y: 0 };
            p[EDGE.BOTTOM] = { x: xOffset + r, y: parentHeight };
        } else {
            intersects[EDGE.TOP] = false;
            intersects[EDGE.BOTTOM] = false;
        }
    } else {
        var a, b;
        a = - Math.cos(theta) / Math.sin(theta);
        b = -a * xOffset + r / Math.sin(theta) + yOffset;
    
        // 1) top edge (y = 0)
        p[EDGE.TOP] = { x: - b / a, y: 0 };
        intersects[EDGE.TOP] = (0 <= p[EDGE.TOP].x) && (p[EDGE.TOP].x <= parentWidth);
        // 2) right edge (x = parentWidth)
        p[EDGE.RIGHT] = { x: parentWidth, y: a * parentWidth + b };
        intersects[EDGE.RIGHT] = (0 <= p[EDGE.RIGHT].y && p[EDGE.RIGHT].y <= parentHeight);
        // 3) bottom edge (y = parentHeight)
        p[EDGE.BOTTOM] = { x: (parentHeight - b) / a , y: parentHeight };
        intersects[EDGE.BOTTOM] = (0 <= p[EDGE.BOTTOM].x) && (p[EDGE.BOTTOM].x <= parentWidth);
        // 4) left edge (x = 0)
        p[EDGE.LEFT] = { x: 0, y: b };
        intersects[EDGE.LEFT] = (0 <= p[EDGE.LEFT].y && p[EDGE.LEFT].y <= parentHeight);
    }

    var ret = [];

    if (intersects[EDGE.TOP]) {
        ret.push(p[EDGE.TOP]);
    }
    if (intersects[EDGE.BOTTOM]) {
        ret.push(p[EDGE.BOTTOM]);
    }
    if (intersects[EDGE.LEFT]) {
        ret.push(p[EDGE.LEFT]);
    }
    if (intersects[EDGE.RIGHT]) {
        ret.push(p[EDGE.RIGHT]);
    }
    
    return ret;
};

Proun.Util.getPolygon = function(r, theta, xOffset, yOffset, parentWidth, parentHeight) {
    // find intersections.
    // NOTE: r and theta are parameters with bottom-left origin
    var EDGE = { TOP: 0, RIGHT: 1, BOTTOM: 2, LEFT: 3 };
    var p = [];
    var intersects = [];

    // y = ax + b
    if (theta == 0) {
        intersects[EDGE.RIGHT] = false;
        intersects[EDGE.LEFT] = false;
        if (0 <= r + xOffset && r + xOffset <= parentWidth) {
            intersects[EDGE.TOP] = true;
            intersects[EDGE.BOTTOM] = true;
            p[EDGE.TOP] = { x: xOffset + r, y: 0 };
            p[EDGE.BOTTOM] = { x: xOffset + r, y: parentHeight };
        } else {
            intersects[EDGE.TOP] = false;
            intersects[EDGE.BOTTOM] = false;
        }
    } else {
        var a, b;
        a = - Math.cos(theta) / Math.sin(theta);
        b = -a * xOffset + r / Math.sin(theta) + yOffset;
    
        // 1) top edge (y = 0)
        p[EDGE.TOP] = { x: - b / a, y: 0 };
        intersects[EDGE.TOP] = (0 <= p[EDGE.TOP].x) && (p[EDGE.TOP].x <= parentWidth);
        // 2) right edge (x = parentWidth)
        p[EDGE.RIGHT] = { x: parentWidth, y: a * parentWidth + b };
        intersects[EDGE.RIGHT] = (0 <= p[EDGE.RIGHT].y && p[EDGE.RIGHT].y <= parentHeight);
        // 3) bottom edge (y = parentHeight)
        p[EDGE.BOTTOM] = { x: (parentHeight - b) / a , y: parentHeight };
        intersects[EDGE.BOTTOM] = (0 <= p[EDGE.BOTTOM].x) && (p[EDGE.BOTTOM].x <= parentWidth);
        // 4) left edge (x = 0)
        p[EDGE.LEFT] = { x: 0, y: b };
        intersects[EDGE.LEFT] = (0 <= p[EDGE.LEFT].y && p[EDGE.LEFT].y <= parentHeight);
    }

    var ret = [];

    if (intersects[EDGE.TOP]) {
        ret.push(p[EDGE.TOP]);
        if (intersects[EDGE.RIGHT]) {
            // A1: TOP & RIGHT
            var tr = { x: parentWidth, y: 0 };
            ret.push(tr, p[EDGE.RIGHT]);
            dx = parentWidth - p[EDGE.TOP].x;
        } else if (intersects[EDGE.BOTTOM]) {
            // A2: TOP & BOTTOM
            var mx = (p[EDGE.TOP].x + p[EDGE.BOTTOM].x) / 2;
            if (mx < parentWidth / 2) {
                // A2a: TOP & LEFT & BOTTOM
                var tl = { x: 0, y: 0 };
                var bl = { x: 0, y: parentHeight };
                to.push(tl, bl, p[EDGE.BOTTOM]);
                dx = -Math.max(p[EDGE.TOP].x, p[EDGE.BOTTOM].x);
            } else {
                // A2b: TOP & RIGHT & BOTTOM
                var tr = { x: parentWidth, y: 0 };
                var br = { x: parentWidth, y: parentHeight };
                ret.push(tr, br, p[EDGE.BOTTOM]);
                dx = parentWidth - Math.min(p[EDGE.TOP].x, p[EDGE.BOTTOM].x);
            }
        } else if (intersects[EDGE.LEFT]) {
            // A3: TOP & LEFT
            var tl = { x: 0, y: 0 };
            ret.push(tl, p[EDGE.LEFT]);
            dx = -p[EDGE.TOP].x;
        }
    } else if (intersects[EDGE.RIGHT]) {
        ret.push(p[EDGE.RIGHT]);
        if (intersects[EDGE.BOTTOM]) {
            // B1: RIGHT & BOTTOM
            var br = { x: parentWidth, y: parentHeight };
            ret.push(br, p[EDGE.BOTTOM]);
            dx = parentWidth - p[EDGE.BOTTOM].x;
        } else if (intersects[EDGE.LEFT]) {
            // B2: RIGHT & LEFT
            var my = (p[EDGE.RIGHT].y + p[EDGE.LEFT].y) / 2;
            if (my < parentHeight / 2) {
                // B2a: RIGHT & BOTTOM & LEFT
                var br = { x: parentWidth, y: parentHeight };
                var bl = { x: 0, y: parentHeight };
                ret.push(br, bl, p[EDGE.LEFT]);
                dy = parentHeight - Math.min(p[EDGE.RIGHT].y, p[EDGE.LEFT].y);
            } else {
                // B2b: RIGHT & TOP & LEFT
                var tr = { x: parentWidth, y: 0 };
                var tl = { x: 0, y: 0 };
                ret.push(tr, tl, p[EDGE.LEFT]);
                dy = -Math.max(p[EDGE.RIGHT].y, p[EDGE.RIGHT].y);
            }
        }
    } else if (intersects[EDGE.BOTTOM]) {
        ret.push(p[EDGE.BOTTOM]);
        if (intersects[EDGE.LEFT]) {
            // C: BOTTOM & LEFT
            var bl = { x: 0, y: parentHeight };
            ret.push(bl, p[EDGE.LEFT]);
            dx = -p[EDGE.BOTTOM].x;
        }
    }
    return ret;
};

// Canvas //

Proun.namespace("Proun.Canvas");
Proun.Canvas = function(canvas) {
    if (!(this instanceof Proun.Canvas)) {
        return new Proun.Canvas(canvas);
    }

    this.width = canvas.width;
    this.height = canvas.height;
    this.context = canvas.getContext("2d");
    this.bgColor = null;
    this.elements = [];
    
    this.update();
};

Proun.Canvas.prototype.update = function(ts) {
    for (var i = 0; i < this.elements.length; i++) {
        if (this.elements[i].update) {
            this.elements[i].update(ts);
        }
    }

    this.draw();

    var that = this;
    window.requestAnimationFrame(function(ts) {
        that.update(ts);
    });
};

Proun.Canvas.prototype.draw = function() {
    if (this.bgColor) {
        this.context.fillStyle = "rgb(" + this.bgColor.join() + ")";
        this.context.fillRect(0, 0, this.width, this.height);
    } else {
        this.context.clearRect(0, 0, this.width, this.height);        
    }

    for (var i = 0; i < this.elements.length; i++) {
        this.elements[i].draw(this.context, this.width, this.height);
    }
};

Proun.Canvas.prototype.addElement = function(el) {
    this.elements.push(el);
    this.update();
};

Proun.Canvas.prototype.addElementAt = function(el, index) {
    this.elements.splice(index, 0, el);
    this.update();
};

// Image //

Proun.namespace("Proun.Image");
Proun.Image = function(url, x, y, w, h) {
    if (!(this instanceof Proun.Image)) {
        return new Proun.Image(url, x, y, w, h);
    }

    this.image = new Image();
    this.image.src = url;
    var that = this;
    this.image.onload = function() {
        that.width = that.width || this.width;
        that.height = that.height || this.height;

    };
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
};

Proun.Image.prototype.draw = function(ctx, w, h) {
    ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
};

// Split Plane

Proun.namespace("Proun.SplitPlane");
Proun.SplitPlane = function(r, theta, originX, originY, parentWidth, parentHeight) {
    if (!(this instanceof Proun.SplitPlane)) {
        return new Proun.SplitPlane(r, theta, originX, originY, parentWidth, parentHeight);
    }

    var l = Math.max(parentWidth, parentHeight);

    this.initX = this.x = r - 2 * l;
    this.initY = this.y = - 2 * l;
    this.width = 2 * l;
    this.height = 4 * l;

    this.theta = theta;
    this.origin = { x: originX, y: originY };
    this.animation = [];
    this.color = [0, 0, 0, 0.5];
    this.gradientWidth = 300;
    this.fill = null;

    this.rotate = null;
    this.translate = null;
};

Proun.SplitPlane.prototype.update = function(ts) {
    for (var i = 0; i < this.animation.length; i++) {
        this.animation[i].update(this, ts);
    }
    if (this.rotate) {
        this.rotate.update(ts);
    }
    if (this.translate) {
        this.translate.update(ts);
    }
};

Proun.SplitPlane.prototype.draw = function(ctx, w, h) {
    if (this.fill == null) {
        var grad = ctx.createLinearGradient(this.initX + this.width, this.initY, this.initX + this.width - this.gradientWidth, this.initY);
        grad.addColorStop(0, "rgba(" + this.color.join() + ",0.9)");
        grad.addColorStop(1, "rgba(" + this.color.join() + ",0.2)");
        this.fill = grad;        
    }
    
    ctx.save();

    if (this.translate) {
        ctx.translate(this.translate.x, this.translate.y);
    }

    if (this.rotate) {
        ctx.translate(this.rotate.cx, this.rotate.cy);
        ctx.rotate(this.rotate.value);
        ctx.translate(-this.rotate.cx, -this.rotate.cy);
    }

    ctx.fillStyle = this.fill;
    ctx.translate(this.origin.x, this.origin.y);
    ctx.rotate(this.theta);

    ctx.fillRect(this.x, this.y, this.width, this.height);

    ctx.restore();
};

Proun.SplitPlane.prototype.appear = function(params) {
    var anim = new Proun.Animation("x");
    anim.duration = (params && params.duration) || 2000;
    anim.delay = (params && params.delay) || 0;
    anim.from = this.initX - this.width;
    anim.to = this.initX;
    this.animation.push(anim);
    anim.start();

    // var anim = new Proun.Animation("x");
    // anim.duration = (params && params.duration) || 2000;
    // anim.delay = (params && params.delay) || 0;
    // anim.from = this.initX + this.width;
    // anim.to = this.initX;
    // anim.easing = Proun.Animation.Easing.LINEAR;
    // this.animation.push(anim);
    // anim.start();

    // var anim2 = new Proun.Animation("width");
    // anim2.duration = (params && params.duration) || 2000;
    // anim2.delay = (params && params.delay) || 0;
    // anim2.from = 0;
    // anim2.to = this.width;
    // anim2.easing = Proun.Animation.Easing.LINEAR;
    // this.animation.push(anim2);
    // anim2.start();
};

Proun.SplitPlane.prototype.rotateTo = function(cx, cy, from, to) {
    this.rotate = new Proun.Rotate(cx, cy, from, to);
    this.rotate.start();
};

// Animation
Proun.namespace("Proun.Animation");
Proun.Animation = function(propertyName) {
    if (!(this instanceof Proun.Animation)) {
        return new Proun.Animation(propertyName);
    }

    this.propertyName = propertyName;

    this.duration = 1000;
    this.from = 0;
    this.to = 1;
    this.value = 0;
    this.easing = Proun.Animation.Easing.EASE_OUT_EXPO;
    this.isStarted = false;
    this.delay = 0;
};

Proun.Animation.Easing = {
    LINEAR: function(t, dur) {
        return t / dur;
    },
    EASE_OUT_EXPO: function(t, dur) {
        return 1.001 * (-Math.pow(2, -10 * t / dur) + 1);
    },
    EASE_OUT_SINE: function(t, dur) {
        return Math.sin(t / dur * (Math.PI / 2));
    },
    EASE_IN_OUT_SINE: function(t, dur) {
        return -1 / 2 * (Math.cos(Math.PI * t / dur) - 1);
    }
};

Proun.Animation.Event = {
    ANIMATION_END: "ProunAnimationEnd"
};

Proun.Animation.prototype.update = function(target, ts) {
    if (this.isStarted) {
        var dt = Math.max(0, ts - this.startTimestamp - this.delay);
        var progress = Math.min(1, this.easing(dt, this.duration));
        this.value = this.from + (this.to - this.from) * progress;
        target[this.propertyName] = this.value;
        if (progress == 1) {
            var index = target.animation.indexOf(this);
            target.animation.splice(index, 1);
            var event = new CustomEvent(Proun.Animation.Event.ANIMATION_END, {
                detail: { property: this.propertyName }
            });
            if (target instanceof EventTarget) {
                target.dispatchEvent(event);
            } else if (target.eventTarget instanceof EventTarget) {
                target.eventTarget.dispatchEvent(event);
            }
        }
    }
};

Proun.Animation.prototype.start = function() {
    this.isStarted = true;
    this.startTimestamp = performance.now();
};

// Rotate
Proun.namespace("Proun.Rotate");
Proun.Rotate =  function(cx, cy, from, to) {
    if (!(this instanceof Proun.Rotate)) {
        return new Proun.Rotate(cx, cy, delta);
    }

    this.cx = cx;
    this.cy = cy;
    this.duration = 60000;
    this.from = from;
    this.to = to;
    this.value = 0;
    this.easing = Proun.Animation.Easing.EASE_IN_OUT_SINE;
    this.isStarted = false;
    this.isEnded = false;
    this.delay = 0;
};

Proun.EPS = 0.01;

Proun.Rotate.prototype.update = function(ts) {
    if (this.isStarted && !this.isEnded) {
        var dt = Math.max(0, ts - this.startTimestamp - this.delay);
        var progress = Math.min(1, this.easing(dt, this.duration));
        if (Math.abs(progress - 1) < Proun.EPS) {
            this.isEnded = true;
        }
        this.value = this.from + (this.to - this.from) * progress;
    }
};

Proun.Rotate.prototype.start = function() {
    this.isStarted = true;
    this.val = this.from;
    this.startTimestamp = performance.now();
};

// Translate
Proun.namespace("Proun.Translate");
Proun.Translate = function(fromX, fromY, toX, toY) {
    this.fromX = fromX;
    this.fromY = fromY;
    this.toX = toX;
    this.toY = toY;
    this.duration = 500;
    this.x = fromX;
    this.y = fromY;
    this.easing = Proun.Animation.Easing.EASE_OUT_SINE;
    this.isStarted = false;
    this.isEnded = false;
    this.delay = 0;
};

Proun.Translate.prototype.update = function(ts) {
    if (this.isStarted && !this.isEnded) {
        var dt = Math.max(0, ts - this.startTimestamp - this.delay);
        var progress = Math.min(1, this.easing(dt, this.duration));
        if (Math.abs(progress - 1) < Proun.EPS) {
            this.isEnded = true;
        }
        this.x = this.fromX + (this.toX - this.fromX) * progress;
        this.y = this.fromY + (this.toY - this.fromY) * progress;
    }
};

Proun.Translate.prototype.start = function() {
    this.isEnded = false;
    this.isStarted = true;
    this.x = this.fromX;
    this.y = this.fromY;
    this.startTimestamp = performance.now();
};