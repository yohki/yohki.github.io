//
// Platform (node.js) dependent implementation
//

/* Image Analysis */

Basel.namespace("Basel.Image");
Basel.REMOTE_HOST = "http://43.16.64.90:3000/";

Basel.Image.analyzeAsync = function(url, userOps, useCache) {
    var ops = new Basel.Image.Parameters();
    var query = Basel.REMOTE_HOST + "Basel/?method=analyze&url=" + encodeURIComponent(url);
    if (userOps !== undefined) {
        ops.useFaceDetection = (userOps.useFaceDetection === undefined) ? ops.useFaceDetection : userOps.useFaceDetection;
        ops.usePersonDetection = (userOps.usePersonDetection === undefined) ? ops.usePersonDetection : userOps.usePersonDetection;
        ops.useFeaturePointDetection = (userOps.useFeaturePointDetection === undefined) ? ops.useFeaturePointDetection : userOps.useFeaturePointDetection;
        ops.useColorExtraction = (userOps.useColorExtraction === undefined) ? ops.useColorExtraction : userOps.useColorExtraction;
        ops.scaleUnit = (userOps.scaleUnit === undefined) ? ops.scaleUnit : userOps.scaleUnit;
        ops.facePrecision = (userOps.facePrecision === undefined) ? ops.facePrecision : userOps.facePrecision;
        ops.faceThreshold = (userOps.faceThreshold === undefined) ? ops.faceThreshold : userOps.faceThreshold;
    }

    query = query + "&faceDetection=" + (ops.useFaceDetection ? "true" : "false");
    query = query + "&personDetection=" + (ops.usePersonDetection ? "true" : "false");
    query = query + "&pointDetection=" + (ops.useFeaturePointDetection ? "true" : "false");
    query = query + "&colorExtraction=" + (ops.useColorExtraction ? "true" : "false");
    query = query + "&scaleUnit=" + ops.scaleUnit + "&facePrecision=" + ops.facePrecision + "&faceThreshold=" + ops.faceThreshold;
    query = query + "&useCache=" + (useCache === undefined ? "true" : useCache);

    var def = $.Deferred();
    jQuery.support.cors = true;
    $.getJSON(query, function(result) {
        result.path = url;

        if (result.colors && 0 < result.colors.length) {
            var color = Basel.Image.convertHSVtoRGB(result.colors[0]);

            var maxDHue = 0;
            var maxWHue = 0;
            var maxDVal = 0;
            var maxDHueIndex = 1;
            
            for (var i = 1; i < result.colors.length; i++) {
                var dHue = Math.abs(result.colors[0].hue - result.colors[i].hue);
                if (180 < dHue) {
                    dHue = Math.abs(dHue - 360);
                }
                var wHue = Math.round((dHue / 180 * 100) * (result.colors.length - i));
                var dVal = Math.abs(result.colors[0].value - result.colors[i].value);
                    
                if (maxWHue < wHue || (maxWHue == wHue && maxDVal < dVal)) {
                    maxWHue = wHue;
                    maxDHueIndex = i;
                }
            }
            
            if (1 < maxDHueIndex) {
                var c = result.colors.splice(maxDHueIndex, 1)[0];
                result.colors.splice(1, 0, c);
            }
        }

        def.resolve(result);
    });

    return def.promise();
};

Basel.Image.calcLocalHistogram = function(url, rects) {
    var rects = encodeURIComponent(JSON.stringify(rects));
    var query = Basel.REMOTE_HOST + "Basel/?method=calcHist&url=" + encodeURIComponent(url) + "&rects=" + rects;

    var def = $.Deferred();
    jQuery.support.cors = true;
    $.getJSON(query, function(data) {
        def.resolve(data);
    });

    return def.promise();
};

Basel.Image.findLines = function(url, threshold) {
    var query = Basel.REMOTE_HOST + "Basel/?method=findLines&url=" + encodeURIComponent(url) + "&threshold=" + threshold;

    var def = $.Deferred();
    jQuery.support.cors = true;
    $.getJSON(query, function(data) {
        def.resolve(data);
    });

    return def.promise();
};

Basel.Image.findCircles = function(url, th1, th2) {
    var query = Basel.REMOTE_HOST + "Basel/?method=findCircles&url=" + encodeURIComponent(url) + "&edgeThreshold=" + th1 + "&centerThreshold=" + th2;

    var def = $.Deferred();
    jQuery.support.cors = true;
    $.getJSON(query, function(data) {
        def.resolve(data);
    });

    return def.promise();
};

Basel.Image.findSignificantLines = function(url, minLines, maxLines) {
    var query = Basel.REMOTE_HOST + "Basel/?method=findSignificantLines&url=" + encodeURIComponent(url);
    if (minLines !== undefined) {
        query = query + "&minLines=" + minLines;
    }
    if (maxLines !== undefined) {
        query = query + "&maxLines=" + maxLines;
    }

    var def = $.Deferred();
    jQuery.support.cors = true;
    $.getJSON(query, function(data) {
        def.resolve(data);
    });

    return def.promise();
};

Basel.Image.convertRGBtoHSV = function(r, g, b) {
    var hsv = {};
    var max = Math.max(r, Math.max(g, b));
    var min = Math.min(r, Math.min(g, b));

    // h
    if (max == min) {
        hsv.hue = 0;
    } else if (max == r) {
        hsv.hue = Math.floor((60 * (g - b) / (max - min) + 360) % 360);
    } else if (max == g) {
        hsv.hue = Math.floor((60 * (b - r) / (max - min)) + 120);
    } else if (max == b) {
        hsv.hue = Math.floor((60 * (r - g) / (max - min)) + 240);   
    }

    // s
    if (max == 0){
        hsv.saturation = 0;
    } else {
        hsv.saturation = Math.floor(100 * ((max - min) / max));
    }

    // v
    hsv.value = Math.floor(max / 255 * 100);

    return hsv;
};

Basel.Image.convertHSVtoRGB = function(hsv) {
    var rgb = [];
    rgb[0] = rgb[1] = rgb[2] = 0;
    
    if (hsv.saturation == 0) {
        rgb[0] = rgb[1] = rgb[2] = Math.floor(255 * (hsv.value / 100.0));
        return rgb;
    }

    var s = hsv.saturation / 100.0;
    var v = hsv.value / 100.0;
    var hi = Math.floor(hsv.hue / 60.0) % 6;
    var f = hsv.hue / 60.0 - hi;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);
    
    var r = 0;
    var g = 0;
    var b = 0;
    
    if (hi == 0) {
        r = v;
        g = t;
        b = p;
    } else if (hi == 1) {
        r = q;
        g = v;
        b = p;
    } else if (hi == 2) {
        r = p;
        g = v;
        b = t;
    } else if (hi == 3) {
        r = p;
        g = q;
        b = v;
    } else if (hi == 4) {
        r = t;
        g = p;
        b = v;
    } else if (hi == 5) {
        r = v;
        g = p;
        b = q;
    }
    rgb[0] = Math.floor(r * 255);
    rgb[1] = Math.floor(g * 255);
    rgb[2] = Math.floor(b * 255);

    return rgb;
};

Basel.Image.getCroppedRegion = function(result, regionWidth, regionHeight) {
    var roi = result.regionOfInterest;
    var cropWidth, cropHeight;

    if (regionWidth < regionHeight) {
        // A. Portrait Cropping
        // resize region to fit the image height
        cropHeight = result.height;
        cropWidth = cropHeight / regionHeight * regionWidth;
        if (result.width < cropWidth) {
            cropWidth = result.width;
            cropHeight = cropWidth / regionWidth * regionHeight;
        }
    } else {
        // B. Landscape Cropping
        cropWidth = result.width;
        cropHeight = cropWidth / regionWidth * regionHeight;
        if (result.height < cropHeight) {
            cropHeight = result.height;
            cropWidth = cropHeight / regionHeight * regionWidth;
        }
    }

    // place the center of the region to the center of roi
    var cx = roi.x + roi.width / 2;
    var cy = roi.y + roi.height / 2;
    var left = cx - cropWidth / 2;
    var top = cy - cropHeight / 2;
    var right = left + cropWidth;
    var bottom = top + cropHeight;

    if (left < 0) {
        left = 0;
        right = cropWidth;
    } else if (result.width < right) {
        right = result.width;
        left = right - cropWidth;
    }

    if (top < 0) {
        top = 0;
        bottom = cropHeight;
    } else if (result.height < bottom) {
        bottom = result.height;
        top = bottom - cropHeight;
    }

    var ret = { 
        x: Math.floor(left),
        y: Math.floor(top),
        width: Math.ceil(right - left),
        height: Math.ceil(bottom - top)
    };
    return ret;
};

Basel.namespace("Basel.Image.Parameters");
Basel.Image.Parameters = function () {
    if (!(this instanceof Basel.Image.Parameters)) {
        return new Basel.Image.Parameters();
    }
    this.useFaceDetection = true;
    this.usePersonDetection = false;
    this.useFeaturePointDetection = true;
    this.useColorExtraction = true;
    this.scaleUnit = 400;
    this.facePrecision = Basel.Image.FacePrecision.PRECISE;
    this.faceThreshold = 0.3;
};

Basel.Image.FacePrecision = (function() {
    return {
        NORMAL: 0,
        PRECISE: 1,
        FAST: 2
    };
})();


