var Basel = Basel || {};

Basel.version = function() {
    return [0, 3, 1, 0];
};

Basel.namespace = function(ns) {
    var parts = ns.split('.');
    var parent = Basel;

    if (parts[0] === "Basel") {
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

/* Utility */

/**
Utility class.
@class Util
@namespace Basel
**/
Basel.namespace("Basel.Util");

/**
Randomly generates a number between <code>min</code> and <code>max</code>.
@method getRandomInt
@static
@namespace Basel.Util
@param {Number} min The minimum number (inclusive).
@param {Number} max The maximum number (exclusive).
@return {Number} A generated number.
**/
Basel.Util.getRandomInt = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
Randomly pick an index number with probablistic weights.
@method getWeightedRandomInt
@static
@param {Array} weights An array of weights.<br> For example, if the input is <code>[1, 1, 2]</code>, the index number 0 will be picked with probability 0.25, the index number 1 will be picked with probability 0.25, and the index number 2 will be picked with probability 0.5.
@return {Number} A generated index number.
@namespace Basel.Util
**/
Basel.Util.getWeightedRandomInt = function(weights) {
    var total = 0;
    for (var i = 0; i < weights.length; i++) {
        total += weights[i];
    }
    var normalizedWeights = [];
    for (i = 0; i < weights.length; i++) {
        normalizedWeights.push(weights[i] / total);
    }

    var value = Math.random();
    var threshold = 0;
    for (i = 0; i < weights.length; i++) {
        threshold += normalizedWeights[i];
        if (value < threshold) {
            break;
        }
    }
    return i;
};

/* Basic Data Types */

Basel.namespace("Basel.Rect");
/**
Represents a rectangle.
@class Rect
@namespace Basel
@constructor
**/
Basel.Rect = function(x, y, width, height) {
    if (!(this instanceof Basel.Rect)) {
        return new Basel.Rect(x, y, width, height);
    }

	/**
	The x value of the top-left corner of the rectangle.
	@property x
	@type Number
	**/
    this.x = x;

	/**
	The y value of the top-left corner of the rectangle.
	@property y
	@type Number
	**/
    this.y = y;

	/**
	The width of the rectangle.
	@property width
	@type Number
	**/
    this.width = width;

	/**
	The height of the rectangle.
	@property height
	@type Number
	**/
    this.height = height;

	/**
	Returns whether the rectangle intersects with another one.
	@method intersects
	@param {Basel.Rect} rect The other rectangle to be tested.
	@return {Boolean} True when the 2 rectangles intersect.
	**/
    this.intersects = function(rect) {
        return (
            (rect.x < this.x + this.width && this.x < rect.x + rect.width) &&
            (rect.y < this.y + this.height && this.y < rect.y + rect.height)
        );
    };

	/**
	Returns the intersection of two rectangles.
	@method getIntersection
	@param {Basel.Rect} rect The other rectangle.
	@return {Basel.Rect} The intersection region of the 2 rectangles.
	**/
    this.getIntersection = function(rect) {
        if (!this.intersects(rect)) {
            return new Basel.Rect(0, 0, 0, 0);
        }

        var left = Math.max(this.x, rect.x);
        var right = Math.min(this.x + this.width, rect.x + rect.width);
        var top = Math.max(this.y, rect.y);
        var bottom = Math.min(this.y + this.height, rect.y + rect.height);
        return new Basel.Rect(left, top, right - left, bottom - top);
    };
};

/* Abstract Data Grid */

Basel.namespace("Basel.Grid");
/**
Represents a grid layout for placing contents.
@class Grid
@constructor
@param {Number} cols The number of columns in a single page.
@param {Number} rows The number of rows in a single page.
@namespace Basel
*/
Basel.Grid = function(cols, rows) {
    if (!(this instanceof Basel.Grid)) {
        return new Basel.Grid(cols, rows);
    }

    //
    // Private Members
    //
    var _cols = 0;
    var _rows = 0;
    var _boxDefs = {};
    var _pages = [];
    var _scores = null;
    var _history = [];
    var _minBoxHeight = 0;
    var _expandOption = Basel.Grid.ExpandOption.ANY;

    var Page = function() {
        if (!(this instanceof Page)) {
            return new Page();
        }
        this.cells = new Array(_cols);
        for (var i = 0; i < _cols; i++) {
            this.cells[i] = new Array(_rows);
            for (var j = 0; j < _rows; j++) {
                this.cells[i][j] = -1;
            }
        }
        // CAUTION: original box order must be kept to track boxes
        this.boxes = [];
        this.remainingCells = _cols * _rows;
        this.getBottomFilledRow = function() {
            var index = -1;
            loop: for (var j = _rows - 1; 0 <= j; j--) {
                for (var i = 0; i < _cols; i++) {
                    if (!this.isAvailable(i, j)) {
                        index = j;
                        break loop;
                    }
                }
            }
            return index;
        };
        this.isAvailable = function(colIndex, rowIndex) {
            return this.cells[colIndex][rowIndex] == -1;
        };
    };

    //
    // Private Methods
    //
    var addPage = function() {
        var page = new Page();
        _pages.push(page);


        if (1 < _pages.length) {
            if (_expandOption == Basel.Grid.ExpandOption.ANY) {
                expandBoxes(_pages[_pages.length - 2], true, false);
            } else if (_expandOption == Basel.Grid.ExpandOption.DEFINED) {
                expandBoxes(_pages[_pages.length - 2], false, false);
            }
        }
        /*
        var page = new Array(_cols);
        for (var i = 0; i < _cols; i++) {
            page[i] = new Array(_rows);
            for (var j = 0; j < _rows; j++) {
                page[i][j] = false;
            }
        }
        _pages.push(page);
        _remainingCells = _rows * _cols;
        */
    };

    var place = function(id, boxSet, rank) {
        var ret = new Basel.Grid.Box(id, _pages.length - 1, -1, -1, 0, 0);
        ret.originalRank = rank;
        ret.key = boxSet.key;
        var level = rank;
        while (0 <= level) {
            // Pick all boxes at the specified level and try to place them one by one
            var similarBoxes = copyBoxArray(boxSet, level);
            while (0 < similarBoxes.length) {
                var weights = [];
                for (var i = 0; i < similarBoxes.length; i++) {
                    weights[i] = similarBoxes[i].weight;
                }
                var index = Basel.Util.getWeightedRandomInt(weights);
                var box = similarBoxes.splice(index, 1)[0];
                var pos = tryPlace(box.cols, box.rows);

                if (0 <= pos.rowIndex && 0 <= pos.colIndex) {
                    ret.colIndex = pos.colIndex;
                    ret.rowIndex = pos.rowIndex;
                    ret.cols = box.cols;
                    ret.rows = box.rows;
                    ret.rank = level;
                    fillSpace(ret);
                    if (level != rank) {
                        //console.log("INFO: Size has been changed");
                    }
                    return ret;
                }
                // try another similar one
            }

            level--;
        }

        // Failed to place within the current page
        if (_pages[_pages.length - 1].remainingCells < _cols * _rows) {
            addPage();
            ret = place(id, boxSet, rank);
        }
        return ret;
    };

    var tryPlace = function(cols, rows) {
        var ret = { colIndex: -1, rowIndex: -1 };
        var page = _pages[_pages.length - 1];

        for (var j = 0; j < _rows; j++) {
            for (var i = 0; i < _cols; i++) {
                if (hasSpace(page, i, j, cols, rows)) {
                    ret.colIndex = i;
                    ret.rowIndex = j;
                    return ret;
                }
            }
        }
        return ret;
    };

    var hasSpace = function(page, colIndex, rowIndex, cols, rows) {
        if (colIndex < 0 || rowIndex < 0 || cols < 1 || rows < 1 || _cols < colIndex + cols || _rows < rowIndex + rows) {
            return false;
        }
        for (var j = rowIndex; j < rowIndex + rows; j++) {
            for (var i = colIndex; i < colIndex + cols; i++) {
                if (!page.isAvailable(i, j)) {
                    return false;
                }
            }
        }
        return true;
    };

    var fillSpace = function(box) {

        if (_pages.length == box.pageIndex) {
            addPage();
        }
        var page = _pages[box.pageIndex];
        page.boxes.push(box);

        for (var j = box.rowIndex; j < box.rowIndex + box.rows; j++) {
            for (var i = box.colIndex; i < box.colIndex + box.cols; i++) {
                page.cells[i][j] = page.boxes.length - 1;
            }
        }
        page.remainingCells -= box.cols * box.rows;

        _history.push(box);

        if (page.remainingCells == 0) {
            addPage();
            //console.log("PAGE ADDED");
        }
    };

    var expandBoxes = function(page, allowUndefinedBoxSize, keepBottomLine) {
        keepBottomLine = keepBottomLine ? keepBottomLine : false;

        // Force set to true if there is no enough rows for adding new boxes
        if ((_rows - 1) - page.getBottomFilledRow() < _minBoxHeight) {
            keepBottomLine = false;
        }

        // Sort by score desc. Array must be copied before sorting.
        var boxes = page.boxes.concat().sort(function(a, b) {
            return b.score - a.score;
        });

        if (allowUndefinedBoxSize) {
            // Increment the box size repeatedly
            for (var i = 0; i < boxes.length; i++) {
                var box = boxes[i];
                var direction = hasExpandableSpace(box, keepBottomLine);
                while (direction != DIRECTION.NONE) {
                    incrementBoxSize(box, direction);
                    direction = hasExpandableSpace(box, keepBottomLine);
                }
            }
        } else {
            // Try to fit all defined boxes
            for (var i = 0; i < boxes.length; i++) {
                var box = boxes[i];
                expandBoxWithDefinedSet(box, keepBottomLine);
            }
        }
    };

    var DIRECTION = { NONE: -1, TOP: 0, LEFT: 1, BOTTOM: 2, RIGHT: 3 };

    var incrementBoxSize = function(box, direction) {
        var page = _pages[box.pageIndex];
        var boxIndex = page.boxes.indexOf(box);
        var i;

        if (direction == DIRECTION.TOP) {
            if (box.sizeBeforeExpand == null) {
                box.sizeBeforeExpand = { cols: box.cols, rows: box.rows };
            }
            box.rowIndex--;
            box.rows++;
            for (i = box.colIndex; i < box.colIndex + box.cols; i++) {
                page.cells[i][box.rowIndex] = boxIndex;
            }
            page.remainingCells -= box.cols;
        } else if (direction == DIRECTION.BOTTOM) {
            if (box.sizeBeforeExpand == null) {
                box.sizeBeforeExpand = { cols: box.cols, rows: box.rows };
            }
            for (i = box.colIndex; i < box.colIndex + box.cols; i++) {
                page.cells[i][box.rowIndex + box.rows] = boxIndex;
            }
            box.rows++;
            page.remainingCells -= box.cols;
        } else if (direction == DIRECTION.LEFT) {
            if (box.sizeBeforeExpand == null) {
                box.sizeBeforeExpand = { cols: box.cols, rows: box.rows };
            }
            box.colIndex--;
            box.cols++;
            for (i = box.rowIndex; i < box.rowIndex + box.rows; i++) {
                page.cells[box.colIndex][i] = boxIndex;
            }
            page.remainingCells -= box.rows;
        } else if (direction == DIRECTION.RIGHT) {
            if (box.sizeBeforeExpand == null) {
                box.sizeBeforeExpand = { cols: box.cols, rows: box.rows };
            }
            for (i = box.rowIndex; i < box.rowIndex + box.rows; i++) {
                page.cells[box.colIndex + box.cols][i] = boxIndex;
            }
            box.cols++;
            page.remainingCells -= box.rows;
        }
    };

    //
    // Return whether the box size can be expanded by adding another single column or row
    //
    var hasExpandableSpace = function(box, keepBottomLine) {
        var page = _pages[box.pageIndex];
        var i;

        if (hasSpace(page, box.colIndex, box.rowIndex + box.rows, box.cols, 1)) {
            // Bottom
            if (keepBottomLine) {
                var maxRowIndex = page.getBottomFilledRow();
                if (box.rowIndex + box.rows <= maxRowIndex) {
                    return DIRECTION.BOTTOM;
                }
            } else {
                return DIRECTION.BOTTOM;
            }
        }

        if (hasSpace(page, box.colIndex + box.cols, box.rowIndex, 1, box.rows)) {
            // Right
            return DIRECTION.RIGHT;
        }

        if (hasSpace(page, box.colIndex, box.rowIndex - 1, box.cols, 1)) {
            // Top
            return DIRECTION.TOP;
        }

        if (hasSpace(page, box.colIndex - 1, box.rowIndex, 1, box.rows)) {
            // Left
            return DIRECTION.LEFT;
        }

        return DIRECTION.NONE;
    };

    //
    // Try to expand the box size using predefined box definitions
    //
    var expandBoxWithDefinedSet = function(box, keepBottomLine) {
        var maxRowSize = _rows;
        if (keepBottomLine) {
            var page = _pages[box.pageIndex];
            var bottom = page.getBottomFilledRow() + 1;
            maxRowSize = bottom - box.rowIndex;
        }

        var boxes = findLargerBoxes(box, maxRowSize);
        for (var i = 0 ; i < boxes.length; i++) {
            if (isExpandable(box, boxes[i])) {
                expandBox(box, boxes[i]);
                return true;
            }
        }
        return false;
    };

    //
    // Return whether current box is replaceable with the specified one
    // rows and cols of the new box must be equal or larger than those of the current box
    //
    var isExpandable = function(currentBox, newBox) {
        var rd = newBox.rows - currentBox.rows;
        var cd = newBox.cols - currentBox.cols;
        var page = _pages[currentBox.pageIndex];

        if ((0 <= rd && 0 < cd) || (0 < rd && 0 <= cd)) {
            // Additional rows
            if (0 < rd && !hasSpace(page, currentBox.colIndex, currentBox.rowIndex + currentBox.rows, currentBox.cols, rd)) {
                return false;
            }
            // Additional columns
            if (0 < cd && !hasSpace(page, currentBox.colIndex + currentBox.cols, currentBox.rowIndex, cd, currentBox.rows)) {
                return false;
            }
            // Additional corner
            if (0 < rd && 0 < cd && !hasSpace(page, currentBox.colIndex + currentBox.cols, currentBox.rowIndex + currentBox.rows, cd, rd)) {
                return false;
            }
            return true;
        } else {
            return false;
        }
    };

    //
    // Expand the size of the current box with that of the new one
    //
    var expandBox = function(currentBox, newBox) {
        var page = _pages[currentBox.pageIndex];
        var boxIndex = page.boxes.indexOf(currentBox);

        for (var j = currentBox.rowIndex; j < currentBox.rowIndex + newBox.rows; j++) {
            for (var i = currentBox.colIndex; i < currentBox.colIndex + newBox.cols; i++) {
                page.cells[i][j] = boxIndex;
            }
        }
        if (currentBox.sizeBeforeExpand == null) {
            currentBox.sizeBeforeExpand = { cols: currentBox.cols, rows: currentBox.rows };
        }
        page.remainingCells -= (newBox.cols * newBox.rows - currentBox.cols * currentBox.rows);
        currentBox.cols = newBox.cols;
        currentBox.rows = newBox.rows;
    };

    //
    //
    // Find and return boxes whose sizes are larger than the specified one
    //
    var findLargerBoxes = function(box, maxRowSize) {
        var boxDefs = _boxDefs[box.key];
        var boxes = [];
        for (var i = 0; i < boxDefs.length; i++) {
            for (var j = 0; j < boxDefs[i].length; j++) {
                var candidate = boxDefs[i][j];
                if (((box.cols < candidate.cols && box.rows < candidate.rows) ||
                    (box.cols == candidate.cols && box.rows < candidate.rows) ||
                    (box.cols < candidate.cols && box.rows == candidate.rows)) &&
                    candidate.rows <= maxRowSize) {
                    boxes.push(candidate);
                }
            }
        }
        boxes.sort(function(a, b) {
            var area = b.cols * b.rows - a.cols * a.rows;
            if (area == 0) {
                return b.cols - a.cols;
            } else {
                return area;
            }
        });
        return boxes;
    };

    //
    // Get the box with the minimum height for each box set,
    // and find the max height among them
    //
    var calcMinHeight = function() {
        var mins = [];
        for (key in _boxDefs) {
            var min = 100000;
            for (var i = 0; i < _boxDefs[key].length; i++) {
                for (var j = 0; j < _boxDefs[key][i].length; j++) {
                    var box = _boxDefs[key][i][j];
                    min = Math.min(min, box.rows);
                }
            }
            mins.push(min);
        }
        min = Math.max.apply(null, mins);
        _minBoxHeight = min;
    };

    var undo = function(steps) {
        if (steps === undefined) {
            steps = 1;
        }

        var boxes = [];
        var n = Math.min(_history.length, steps);

        for (var k = 0; k < n; k++) {
            var page = _pages[_pages.length - 1];
            if (page.remainingCells == _cols * _rows) {
                if (_pages.length == 1) {
                    return;
                } else {
                    page = _pages[_pages.length - 2];
                    // remove last page
                    _pages.pop();
                }
            }

            var box = page.boxes.pop();
            for (var j = box.rowIndex; j < box.rowIndex + box.rows; j++) {
                for (var i = box.colIndex; i < box.colIndex + box.cols; i++) {
                    page.cells[i][j] = -1;
                }
            }
            page.remainingCells += box.cols * box.rows;
            // Check whether new page was added without filling the last page
            if (page.remainingCells == _cols * _rows) {
                var index = _pages.indexOf(page);
                if (0 < index && 0 < _pages[index - 1].remainingCells) {
                    // remove last page (since page before the last page has some space)
                    _pages.pop();
                }
            }

            _history.pop();
            boxes.unshift(box);
        }
        return boxes;
    };

    // Place contents again using the same layout boxes
    var redo = function(boxes) {
        for (var i = 0; i < boxes.length; i++) {
            fillSpace(boxes[i]);
        }
    };

    // Try to place contents with different boxes but same ranks
    var retry = function(boxes) {
        var newBoxes = [];
        for (var i = 0; i < boxes.length; i++) {
            var id = boxes[i].id;
            var rank = boxes[i].originalRank;
            var boxSetKey = boxes[i].key;
            var box = place(id, _boxDefs[boxSetKey], rank);
            box.score = boxes[i].score;
            newBoxes.push(box);
        }
        return newBoxes;
    };

    var calcFillRate = function() {
        if (_pages.length == 0 || (_pages.length == 1 && _pages[0].remainingCells == _cols * _rows)) {
            return 0;
        }
        var page = _pages[_pages.length - 1];
        if (page.remainingCells == _cols * _rows) {
            return 1;
        }

        var bottomIndex = page.getBottomFilledRow();
        var expectedRemainingCells = ((_rows - 1) - bottomIndex) * _cols;
        var fillRate = 1 - (page.remainingCells - expectedRemainingCells) / ((bottomIndex + 1) * _cols);

        return fillRate;
    };

    var optimize = function(steps, trials) {
        var fillRate = calcFillRate();
        //console.log("[OPT][START] = " + fillRate);
        if (fillRate == 1) {
            //console.log("[OPT][DONE] No need to optimize");
            return [];
        }

        var boxes = undo(steps);
        var n = 0;

        for (var i = 0; i < trials; i++) {
            var newBoxes = retry(boxes);
            var newRate = calcFillRate();
            //console.log("[OPT][TRIAL #" + (i + 1) + "] = " + newRate);
            if (newRate == 1) {
                fillRate = newRate;
                boxes = newBoxes;
                n = i + 1;
                break;
            } else if (fillRate < newRate) {
                fillRate = newRate;
                boxes = newBoxes;
                n = i + 1;
            }
            undo(steps);
        }

        // place again using the best boxes
        if (newBoxes != boxes) {
            redo(boxes);
        }
        //console.log("[OPT][DONE] Trial #" + n + " is the best solution (" + fillRate + ")");
        return boxes;
    };

    var copyBoxArray = function(boxSet, sizeIndex) {
        var array = boxSet[sizeIndex].concat();
        return array;
    };

    var clearPages = function() {
        _pages = [];
        _scores = new Basel.Score.Result();
        addPage();
    };

    var debugPrint = function() {
        for (var k = 0; k < _pages.length; k++) {
            var page = _pages[k];
            for (var j = 0; j < _rows; j++) {
                var row = "|";
                for (var i = 0; i < _cols; i++) {
                    row += (page.cells[i][j] != -1) ? "=|" : " |";
                }
                console.log(row);
            }
            console.log("");
        }
        console.log("-----------------------------------------");
    };

    //
    // Initialize
    //
    _cols = cols;
    _rows = rows;
    clearPages();

    //
    // Public Members
    //
    this.OPTIMIZE_STEPS = 10;
    this.OPTIMIZE_TRIALS = 20;

    //
    // Public Methods
    //
	/**
	Returns the number of columns in each page.
	@method cols
	@return {Number} The number of columns.
	**/
    this.cols = function() { return _cols };

	/**
	Returns the number of rows in each page.
	@method rows
	@return {Number} The number of rows.
	**/
    this.rows = function() { return _rows };
    this.getTotalRows = function() {
        var total = 0;
        for (var i = 0; i < _pages.length; i++) {
            total += _pages[i].getBottomFilledRow() + 1;
        }
        return total;
    };

	/**
	Determines the policy for expanding box sizes to fill empty spaces.
	@method setBoxExpansion
	@param {Basel.Grid.ExpandOption} value
	<code>NEVER</code>: No Boxes will be expanded.<br>
	<code>DEFINED</code>: Every box might be expanded to the size of any predefined box.<br>
	<code>ANY</code>: Every box might be expaneded to any size for minimizing the blank.
	**/
    this.setBoxExpansion = function(value) {
        _expandOption = value;
    };

	/**
	Adds a set of box definition to the current grid layout.
	@method defineBoxes
	@param {Array} boxSet An array of rank definitons.<br>
	A rank definition is an array of <code>Basel.Grid.BoxSizeDef</code>.
	@param {String} [key] A key for using multiple box definition sets.
	**/
    this.defineBoxes = function(boxSet, key) {
        if (key === undefined) {
            key = Basel.Grid.KEY_DEFAULT_BOXSET;
        }
        for (var i = 0; i < boxSet.length; i++) {
            for (var j = 0; j < boxSet[i].length; j++) {
                boxSet[i][j].key = key;
            }
        }
        boxSet.key = key;
        _boxDefs[key] = boxSet;
        calcMinHeight();
        return _boxDefs[key].length;
    };

	/**
	Creates and allocates new boxes which correspond to the input scores.<br>
	Previously allocated boxes are removed.
	@method allocate
	@param {Array} scoreData An array of <code>Basel.Score</code> which represents the corresponding scores of data.
	@return {Array} An array of <code>Basel.Grid.Box</code> which represents the layout information of newly allocated boxes.
	**/
    this.allocate = function(scoreData) {
        clearPages();
        var result = this.append(scoreData);
        return result;
    };

	/**
	Creates and allocates new boxes which correspond to the input scores.<br>
	New boxes are appended to previously allocated boxes.
	@method append
	@param {Array} scoreData An array of <code>Basel.Score</code> which represents the corresponding scores of data.
	@return {Array} An array of <code>Basel.Grid.Box</code> which represents the layout information of newly allocated boxes.
	**/
    this.append = function(scoreData) {
        var result = [];

        //console.log("No\tTotalScore\tBoxRank");
        for (var i = 0; i < scoreData.scores.length; i++) {
            // Get the score and map to the box size
            var score = scoreData.scores[i].value;
            var id = scoreData.scores[i].id;
            var boxSet = _boxDefs[scoreData.scores[i].boxSetKey];
            var boxSizeIndex = Math.round((score - scoreData.min.value) * ((boxSet.length - 1) / (scoreData.max.value - scoreData.min.value)));
            _scores.scores.push({ id: id, value: score });
            //console.log(i + "\t" + score + "\t" + boxSizeIndex);

            // Try to place the box
            var box = place(id, boxSet, boxSizeIndex);
            box.score = score;
            result.push(box);
        }
        if (_scores.max.value < scoreData.max.value) {
            _scores.max = { index: scoreData.max.index, value: scoreData.max.value };
        }
        if (scoreData.min.value < _scores.min.value) {
            _scores.min = { index: scoreData.min.index, value: scoreData.min.value };
        }

        var n = Math.min(scoreData.scores.length, this.OPTIMIZE_STEPS);
        var boxes = optimize(n, this.OPTIMIZE_TRIALS);
        result.splice(result.length - boxes.length, boxes.length);
        result = result.concat(boxes);

        if (_expandOption == Basel.Grid.ExpandOption.ANY) {
            expandBoxes(_pages[_pages.length - 1], true, true);
        } else if (_expandOption == Basel.Grid.ExpandOption.DEFINED) {
            expandBoxes(_pages[_pages.length - 1], false, true);
        }

        debugPrint();

        return result;
    };

	/**
	Creates and allocates new boxes which correspond to the input scores.<br>
	New boxes are prepended to previously allocated boxes.
	@method prepend
	@param {Array} scoreData An array of <code>Basel.Score</code> which represents the corresponding scores of data.
	@param {Boolean} [allowReallocate] A flag to allow previously allocated boxes to be reallocated (causing change in size and position).
	<br>The default value is <code>true</code>.
	@return {Array} An array of <code>Basel.Grid.Box</code> which represents the layout information of newly allocated boxes.
	<strong>
	CAUTION: If <code>allowReallocate</code> is set to <code>true</code>, the return value is an Object which consists of two arrays whose keys are <code>prependedItems</code> and <code>existingItems</code>. You must update the layout of the previously allocated boxes by using information in <code>existingItems</code>.
	</strong>
	**/
    this.prepend = function(scoreData, allowReallocate) {
        if (allowReallocate || allowReallocate === undefined) {
            // all existing items are affected
            var prevScores = _scores;
            var prepended = this.allocate(scoreData);
            var existing = this.append(prevScores);
            return { prependedItems: prepended, existingItems: existing };
        } else {
            // prepended items are managed separately from existing items
            var grid = new Basel.Grid(_cols, _rows);
            grid.setBoxExpansion(_expandOption);
            for (var key in _boxDefs) {
                grid.defineBoxes(_boxDefs[key], key);
            }
            var allocs = grid.allocate(scoreData);
            return allocs;
        }
    };
    this.retry = function(steps) {
        return retry(undo(steps));
    };
    this.print = function() {
        debugPrint();
    };
	/**
	Returns the number of boxes allocated in the specified page.
	@method getBoxesInPage
	@param {Number} index The index number of the page.
	@return {Number} The number of boxes allocated.
	**/
    this.getBoxesInPage = function(index) {
        return _pages[index].boxes.concat();
    };
    return this;
};

/**
The key for the default box definition set.
@property KEY_DEFAULT_BOXSET
@namespace Basel.Grid
@type String
@static
@final
**/
Basel.Grid.KEY_DEFAULT_BOXSET = "default";
/**
Options for expanding box sizes.
@class ExpandOption
@namespace Basel.Grid
**/
Basel.Grid.ExpandOption = (function() {
    return {
		/**
		Every box might be expaneded to any size for minimizing the blank.
		@property NEVER
		@type Number
		@static
		@final
		**/
		NEVER: 0,
		/**
		No Boxes will be expanded.
		@property DEFINED
		@type Number
		@static
		@final
		**/
		DEFINED: 1,
		/**
		Every box might be expanded to the size of any predefined box.
		@property ANY
		@type Number
		@static
		@final
		**/
		ANY: 2
	};
})();

/* Box Size Definition */

Basel.namespace("Basel.Grid.BoxSizeDef");
/**
Represents a box size definition for layout.
@class BoxSizeDef
@namespace Basel.Grid
@constructor
@param {Number} cols The number of spanning columns of this box size.
@param {Number} rows The number of spanning rows of this box size.
@param {Number} weight The value of weight used to control the occurence of this box.
**/
Basel.Grid.BoxSizeDef = function(cols, rows, weight) {
    if (!(this instanceof Basel.Grid.BoxSizeDef)) {
        return new Basel.Grid.BoxSizeDef(cols, rows, weight);
    }
	/**
	The number of spanning columns of this box size.
	@property cols
	@type Number
	**/
    this.cols = cols;

	/**
	The number of spanning rows of this box size.
	@property rows
	@type Number
	**/
    this.rows = rows;

	/**
	The value of weight used to control the occurence of this box.
	@property weight
	@type Number
	**/
    this.weight = weight;
    this.key = Basel.Grid.KEY_DEFAULT_BOXSET;
};

/* Box */

Basel.namespace("Basel.Grid.Box");
/**
Represents a region in the grid layout for placing a content.
@class Box
@namespace Basel.Grid
@constructor
@param {Object} id The unique identifier for this box.
@param {Number} pageIndex The index number of the page where this box is placed.
@param {Number} colIndex The column index of this box.
@param {Number} rowIndex The row index (within the page) of this box.
@param {Number} cols The number of spanning columns of this box.
@param {Number} rows The number of spanning rows of this box.
**/
Basel.Grid.Box = function(id, pageIndex, colIndex, rowIndex, cols, rows) {
    if (!(this instanceof Basel.Grid.Box)) {
        return new Basel.Grid.Box(id, pageIndex, colIndex, rowIndex, cols, rows);
    }
	/**
	The unique identifier for this box.
	@property id
	@type Object
	**/
    this.id = id;

	/**
	The index number of the page where this box is placed.
	@property pageIndex
	@type Number
	**/
    this.pageIndex = pageIndex;

	/**
	The column index of this box.
	@property colIndex
	@type Number
	**/
    this.colIndex = colIndex;

	/**
	The row index of this box.
	@property rowIndex
	@type Number
	**/
    this.rowIndex = rowIndex;

	/**
	The number of spanning columns of this box.
	@property rows
	@type Number
	**/
    this.cols = cols;

	/**
	The number of spanning rows of this box.
	@property rows
	@type Number
	**/
    this.rows = rows;

    this.rank = -1;
    this.originalRank = -1;
    this.score = 0;
    this.sizeBeforeExpand = null;
    this.key = Basel.Grid.KEY_DEFAULT_BOXSET;
};

/* Score */

Basel.namespace("Basel.Score");
/**
Represents a score which corresponds to a single content.
@class Score
@namespace Basel
@constructor
@param {Object} id The unique identifier for the content.
@param {Number} value The corresponding score value of the content.
**/
Basel.Score = function (id, value) {
    if (!(this instanceof Basel.Score)) {
        return new Basel.Score(id, value);
    }

	/**
	The unique identifier for the content.
	@property id
	@type Object
	**/
    this.id = id;

	/**
	The corresponding score value of the content.
	@property value
	@type Number
	**/
    this.value = value;

	/**
	The key to determine which box definition set will be used.
	@property boxSetKey
	@type String
	**/
    this.boxSetKey = Basel.Grid.KEY_DEFAULT_BOXSET;
};

Basel.namespace("Basel.Score.Result");
/**
Represents a set of scores for allocating multiple contents. Generally, you should implement a scoring function which returns an instance of this.
@class Result
@namespace Basel.Score
@constructor
**/
Basel.Score.Result = function() {
    if (!(this instanceof Basel.Score.Result)) {
        return new Basel.Score.Result();
    }

	/**
	An object contains information of the maximum score.<br>
	The key <code>index</code> should be used to set/get the index number of the maximum score, and the key <code>value</code> should be used to set/get the actual score value.
	@property max
	@type Object
	**/
    this.max = { index: -1, value: 0 };

	/**
	An object contains information of the minimum score.<br>
	The key <code>index</code> should be used to set/get the index number of the minimum score, and the key <code>value</code> should be used to set/get the actual score value.
	@property min
	@type Object
	**/
    this.min = { index: -1, value: 10000 };

	/**
	An array of <code>Basel.Score</code>. Each element is supposed to contain a valid score value.
	@property scores
	@type Array
	**/
    this.scores = [];

	/**
	Filters the result using a filter function.
	@method filter
	@param {Function} filterFunction The function for filtering the result. This function must take a <code>Basel.Score</code> object for the argument, and must return <code>true</code> if the object should be filtered.
	@return {Basel.Score.Result} The filtered result.
	**/
    this.filter = function(filterFunction) {
        var result = new Basel.Score.Result();
        for (var i = 0; i < this.scores.length; i++) {
            if (filterFunction(this.scores[i])) {
                var score = new Basel.Score(this.scores[i].id, this.scores[i].value);
                // Copy properties
                for (var prop in this.scores[i]) {
                    if (this.scores[i].hasOwnProperty(prop)) {
                        score[prop] = this.scores[i][prop];
                    }
                }
                result.scores.push(score);

                if (this.scores[i].value < result.min.value) {
                    result.min.value = this.scores[i].value;
                    result.min.index = result.scores.length - 1;
                }

                if (result.max.value < this.scores[i].value) {
                    result.max.value = this.scores[i].value;
                    result.max.index = result.scores.length - 1;
                }
            }
        }
        return result;
    };
};

/* Text */

Basel.namespace("Basel.Text");
Basel.Text = (function() {
    var parameters = {
        TEXT_SHRINK_RATIO: 0.5,
        FACE_PENALTY: 100,
        HIST_PENALTY: 100,
        BODY_PENALTY: 1,
        POINT_PENALTY: 1,
        COMPOSITION_PADDING: 5
    };

    return {
        Positions: {
            TOP_LEFT: "topLeft",
            TOP_RIGHT: "topRight",
            BOTTOM_LEFT: "bottomLeft",
            BOTTOM_RIGHT: "bottomRight"
        },
        Parameters: parameters,
        adjustTextSize: function (textBox, minSize, maxSize) {
            // <div>     <-- textBox: height and width should be specified
            //     text  <-- text: whose size you want to adjust 
            // </div>
            //
            // [CAUTION] This method must be called before other text stylize methods,
            //           since all styles will be initialized 

            var span = $(textBox).find(".basel-inner-span");
            if (0 < span.length) {
                span.contents().unwrap().wrap("<span class='basel-inner-span'></span>");
            } else {        
                $(textBox).wrapInner("<div class='basel-inner-text'><span class='basel-inner-span'></span></div>");
            }
            span = $(textBox).find(".basel-inner-span");
            var div = $(textBox).find(".basel-inner-text");
            var currentSize = parseInt(span.css("font-size"));

            var outer = $(textBox);
            var outerWidth = outer.width();
            var outerHeight = outer.height();

            // get the maximum scale
            div.css("width", "0px");
            var innerWidth = span.width();
            var minRatio = outerWidth / innerWidth;
            var innerHeight = span.height();

            var ratio = Math.sqrt((outerWidth * outerHeight) / (innerWidth * innerHeight)) * Basel.Text.Parameters.TEXT_SHRINK_RATIO;
            if (minRatio < ratio) {
                ratio = minRatio;
            }
            var fontSize = Math.max(minSize, Math.min(maxSize, Math.round(currentSize * ratio)));
            span.css("font-size", fontSize + "px");
            div.css("width", "100%");
        },
        getOptimalCompositionInfoAsync: function (textBox, analysisResult, cropRegion, destWidth, destHeight, useHistogram) {
            // <div>                            <-- textBox
            //   <div class='basel-inner-text'> <-- if you called adjustTextSize, this tag must have been added
            //     text
            //   </div>
            // </div>
            var innerDiv = $(textBox).find("div.basel-inner-text");
            if (0 == innerDiv.length) {
                $(textBox).wrapInner("<div class='basel-inner-text'><span class='basel-inner-span'></span></div>");
                innerDiv = $(textBox).find("div.basel-inner-text");
            }
            var span = innerDiv.find(".basel-inner-span");

            var score = {};
            score[Basel.Text.Positions.TOP_LEFT] = 0;
            score[Basel.Text.Positions.TOP_RIGHT] = 0;
            score[Basel.Text.Positions.BOTTOM_LEFT] = 0;
            score[Basel.Text.Positions.BOTTOM_RIGHT] = 0;

            var scaleX = cropRegion.width / destWidth;
            var scaleY = cropRegion.height / destHeight;
            var textWidth = span.width() + Basel.Text.Parameters.COMPOSITION_PADDING * 2;
            var textHeight = span.height() + Basel.Text.Parameters.COMPOSITION_PADDING * 2;

            var minScore = { key: null, value: -1 };
            //console.log(analysisResult.path);

            var rects = [];
            var ret = { position: null, histInfo: null };

            for (var key in score) {
                var rect = new Basel.Rect(0, 0, textWidth, textHeight);

                if (key == Basel.Text.Positions.TOP_RIGHT || key == Basel.Text.Positions.BOTTOM_RIGHT) {
                    rect.x = destWidth - textWidth;
                }
                if (key == Basel.Text.Positions.BOTTOM_LEFT || key == Basel.Text.Positions.BOTTOM_RIGHT) {
                    rect.y = destHeight - textHeight;
                }

                // Convert to original image coordinates
                rect.x = rect.x * scaleX + cropRegion.x;
                rect.y = rect.y * scaleY + cropRegion.y;
                rect.width *= scaleX;
                rect.height *= scaleY;

                var facePenalty = 0;
                var bodyPenalty = 0;
                var pointPenalty = 0;

                if (analysisResult.faces) {
                    for (var i = 0; i < analysisResult.faces.length; i++) {
                        var intersection = rect.getIntersection(analysisResult.faces[i]);
                        facePenalty += Basel.Text.Parameters.FACE_PENALTY * intersection.width * intersection.height;
                    }
                }

                if (analysisResult.people) {
                    for (i = 0; i < analysisResult.people.length; i++) {
                        var intersection = rect.getIntersection(analysisResult.people[i]);
                        bodyPenalty += Basel.Text.Parameters.BODY_PENALTY * intersection.width * intersection.height;
                    }
                }
                
                if (analysisResult.points) {
                    for (i = 0; i < analysisResult.points.length; i++) {
                        var intersection = rect.getIntersection(analysisResult.points[i]);
                        pointPenalty += Basel.Text.Parameters.POINT_PENALTY * intersection.width * intersection.height;
                    }
                }

                score[key] = facePenalty + bodyPenalty + pointPenalty;
                if (minScore.value == -1 || score[key] < minScore.value) {
                    minScore.key = key;
                    minScore.value = score[key];
                    ret.position = minScore.key;
                }
                rects.push(rect);

                console.log(key + ": " + score[key] + " (FACE=" + facePenalty + ", POINT= " + pointPenalty + ")");
            }

            var def = $.Deferred();

            if (useHistogram) {
                var keys = [Basel.Text.Positions.TOP_LEFT, Basel.Text.Positions.TOP_RIGHT, Basel.Text.Positions.BOTTOM_LEFT, Basel.Text.Positions.BOTTOM_RIGHT];
                Basel.Image.calcLocalHistogram(analysisResult.path, rects).pipe(function(histInfo) {
                    minScore.value = -1;
                    for (var i = 0; i < histInfo.length; i++) {
                        var histPenalty = histInfo[i].stdDev * Basel.Text.Parameters.HIST_PENALTY;
                        score[keys[i]] += histPenalty;
                        if (minScore.value == -1 || score[keys[i]] < minScore.value) {
                            minScore.key = keys[i];
                            minScore.value = score[keys[i]];
                            ret.histInfo = histInfo[i];
                            ret.position = minScore.key;
                        }
                    }
                    def.resolve(ret);
                });
            } else {
                def.resolve(ret);
            }
            return def.promise();
        }
    };
})();

Basel.namespace("Basel.UI");
Basel.UI = (function() {
    var parameters = {
        cellStdWidth: 200,
        cellStdHeight: 200,
        cellMinWidth: 90,
        cellMinHeight: 90,
        cellSpacing: 5,
        titlePadding: 5,
        darkFontColor: "#000",
        lightFontColor: "#fff",
        textColorThreshold: 192
    };

    var elementKeyMap = {};
    var boxKeyMap = {};
    var maximizedElement = null;

    return {
        Events: {
            MAXIMIZED: "maximized",
            MINIMIZED: "minimized",
            REVERTED: "reverted"
        },
        Parameters: parameters,
        applySizeAndPosition: function(grid, box, el) {
            var x = box.colIndex * (Basel.UI.Parameters.cellStdWidth + Basel.UI.Parameters.cellSpacing);
            var y = (box.pageIndex * grid.rows() + box.rowIndex) * (Basel.UI.Parameters.cellStdHeight + Basel.UI.Parameters.cellSpacing);
            var w = box.cols * Basel.UI.Parameters.cellStdWidth + (box.cols - 1) * Basel.UI.Parameters.cellSpacing;
            var h = box.rows * Basel.UI.Parameters.cellStdHeight + (box.rows - 1) * Basel.UI.Parameters.cellSpacing;

            $(el).css({
                "left": x + "px",
                "top": y + "px",
                "width": w + "px",
                "height": h + "px"
            });
            
            if (el.parent().height() < y + h) {
                el.parent().height(y + h);
            }
        },
        applyImageStyle: function(div, imageWidth, imageHeight, sourceRect, destWidth, destHeight) {
            var scaleX = destWidth / sourceRect.width;
            var scaleY = destHeight / sourceRect.height;
            var scaledWidth = Math.floor(scaleX * imageWidth);
            var scaledHeight = Math.floor(scaleY * imageHeight);
            var scaledLeft = Math.floor(scaleX * sourceRect.x) * -1;
            var scaledTop = Math.floor(scaleY * sourceRect.y) * -1;
            //console.log("background-size: " + scaledWidth + "px " + scaledHeight + "px");
            //console.log("background-position: " + scaledLeft + "px " + scaledTop + "px");
            $(div).css({
                "background-size": scaledWidth + "px " + scaledHeight + "px",
                "background-position": scaledLeft + "px " + scaledTop + "px"
            });
        },
        applyTextPosition: function(el, opInfo) {
            var text = el.find(".basel-inner-text");
            text.css("position", "absolute");
            if (opInfo.position == Basel.Text.Positions.BOTTOM_RIGHT || opInfo.position == Basel.Text.Positions.TOP_RIGHT) {
                $(text).css({
                    "text-align": "right",
                    "left": null,
                    "right": Basel.UI.Parameters.titlePadding + "px"
                });
            } else {
                $(text).css({
                    "text-align": "left",
                    "right": null,
                    "left": Basel.UI.Parameters.titlePadding + "px"
                });
            }
            if (opInfo.position == Basel.Text.Positions.TOP_LEFT || opInfo.position == Basel.Text.Positions.TOP_RIGHT) {
                $(text).css({
                    "top": Basel.UI.Parameters.titlePadding + "px",
                    "bottom": null
                });
            } else {
                $(text).css({
                    "bottom": Basel.UI.Parameters.titlePadding + "px",
                    "top": null
                });
            }
        },
        applyTextColor: function(el, opInfo) {
            var text = el.find(".basel-inner-text");
            if (opInfo.histInfo && Basel.UI.Parameters.textColorThreshold < opInfo.histInfo.mean) {
                text.css("color", Basel.UI.Parameters.darkFontColor);
                text.css("text-shadow", "0px 0px 4px " + Basel.UI.Parameters.lightFontColor);
            } else {
                text.css("color", Basel.UI.Parameters.lightFontColor);
                text.css("text-shadow", "0px 0px 4px " + Basel.UI.Parameters.darkFontColor);
            }
        },
        bindElement: function(el, grid, box) {
            // bound element must have an ID
            var id = el.attr("id");
            elementKeyMap[id] = { grid: grid, box: box };
            if (!boxKeyMap[grid]) {
                boxKeyMap[grid] = {};
            }
            var key = box.pageIndex + "-" + box.colIndex + "-" + box.rowIndex;
            boxKeyMap[grid][key] = el;
            el.addClass("basel-tile");
            if (0 == el.has(".basel-cover").length) {
                el.append($("<div class='basel-cover'></div>"));
            }
        },
        maximize: function(element, scrollParent) {
            var id = element.attr("id");
            if (!elementKeyMap[id]) {
                return;
            }

            var grid = elementKeyMap[id].grid;
            var targetBox = elementKeyMap[id].box;

            var pageWidth = grid.cols() * Basel.UI.Parameters.cellStdWidth + (grid.cols() - 1) * Basel.UI.Parameters.cellSpacing;
            var pageHeight = grid.rows() * Basel.UI.Parameters.cellStdHeight + (grid.rows() - 1) * Basel.UI.Parameters.cellSpacing;

            var targetWidth = pageWidth - Basel.UI.Parameters.cellMinWidth * (grid.cols() - targetBox.cols) - Basel.UI.Parameters.cellSpacing * (grid.cols() - targetBox.cols);
            var targetHeight = pageHeight - Basel.UI.Parameters.cellMinHeight * (grid.rows() - targetBox.rows) - Basel.UI.Parameters.cellSpacing * (grid.rows() - targetBox.rows);

            var unitWidth = (targetWidth - Basel.UI.Parameters.cellSpacing * (targetBox.cols - 1)) / targetBox.cols;
            var unitHeight = (targetHeight - Basel.UI.Parameters.cellSpacing * (targetBox.rows - 1)) / targetBox.rows;

            var pageY = targetBox.pageIndex * (pageHeight + Basel.UI.Parameters.cellSpacing);

            var targetX = targetBox.colIndex * (Basel.UI.Parameters.cellMinWidth + Basel.UI.Parameters.cellSpacing);
            var targetY = targetBox.rowIndex * (Basel.UI.Parameters.cellMinHeight + Basel.UI.Parameters.cellSpacing);

            scrollParent.find(".basel-tile").each(function() {
                if ($(this)[0] == element[0]) {
                    $(this).removeClass("basel-tile-unfocused");
                    $(this).addClass("basel-tile-focused");
                } else {
                    $(this).removeClass("basel-tile-focused");
                    $(this).addClass("basel-tile-unfocused");
                }
            });
            scrollParent.animate({ scrollTop: pageY }, 300);

            var boxes = grid.getBoxesInPage(targetBox.pageIndex);
            for (var i = 0; i < boxes.length; i++) {
                var x, y, w, h;

                // calculate position
                var ci = boxes[i].colIndex;
                var c = boxes[i].cols;
                var ri = boxes[i].rowIndex;
                var r = boxes[i].rows;

                if (ci + c <= targetBox.colIndex) {
                    // Left side of the target
                    w = c * Basel.UI.Parameters.cellMinWidth + (c - 1) * Basel.UI.Parameters.cellSpacing;
                    x = ci * (Basel.UI.Parameters.cellMinWidth + Basel.UI.Parameters.cellSpacing);
                } else if (targetBox.colIndex + targetBox.cols <= ci) {
                    // Right side of the target
                    w = c * Basel.UI.Parameters.cellMinWidth + (c - 1) * Basel.UI.Parameters.cellSpacing;
                    x = pageWidth - ((grid.cols() - ci) * Basel.UI.Parameters.cellMinWidth + (grid.cols() - ci - 1) * Basel.UI.Parameters.cellSpacing);
                } else {
                    // Overlap
                    if (ci <= targetBox.colIndex) {
                        x = ci * (Basel.UI.Parameters.cellMinWidth + Basel.UI.Parameters.cellSpacing);
                    } else {
                        x = targetX + (ci - targetBox.colIndex) * (unitWidth + Basel.UI.Parameters.cellSpacing);
                    }
                    var nonOverlappingColumns = Math.max(0, targetBox.colIndex - ci) + Math.max(0, ci + c - (targetBox.colIndex + targetBox.cols));
                    var overlappingColumns = c - nonOverlappingColumns;
                    w = nonOverlappingColumns * Basel.UI.Parameters.cellMinWidth + overlappingColumns * unitWidth + (c - 1) * Basel.UI.Parameters.cellSpacing;
                }

                if (ri + r <= targetBox.rowIndex) {
                    // Upper side of the target
                    h = r * Basel.UI.Parameters.cellMinHeight + (r - 1) * Basel.UI.Parameters.cellSpacing;
                    y = pageY + ri * (Basel.UI.Parameters.cellMinHeight + Basel.UI.Parameters.cellSpacing);
                } else if (targetBox.rowIndex + targetBox.rows <= ri) {
                        // Lower side of the target
                    h = r * Basel.UI.Parameters.cellMinHeight + (r - 1) * Basel.UI.Parameters.cellSpacing;
                    y = pageY + pageHeight - ((grid.rows() - ri) * Basel.UI.Parameters.cellMinHeight + (grid.rows() - ri - 1) * Basel.UI.Parameters.cellSpacing);
                } else {
                    // Overlap
                    if (ri <= targetBox.rowIndex) {
                        y = pageY + ri * (Basel.UI.Parameters.cellMinHeight + Basel.UI.Parameters.cellSpacing);
                    } else {
                        y = pageY + targetY + (ri - targetBox.rowIndex) * (unitHeight + Basel.UI.Parameters.cellSpacing);
                    }
                    var nonOverlappingRows = Math.max(0, targetBox.rowIndex - ri) + Math.max(0, ri + r - (targetBox.rowIndex + targetBox.rows));
                    var overlappingRows = r - nonOverlappingRows;
                    h = nonOverlappingRows * Basel.UI.Parameters.cellMinHeight + overlappingRows * unitHeight + (r - 1) * Basel.UI.Parameters.cellSpacing;
                }

                var key = boxes[i].pageIndex + "-" + boxes[i].colIndex + "-" + boxes[i].rowIndex;
                var el = boxKeyMap[grid][key];
                if (el) {
                    el.css({
                        "left": x + "px",
                        "top": y + "px",
                        "width": w + "px",
                        "height": h + "px"
                    });
                }
                var evt = el[0] == element[0] ? $.Event(Basel.UI.Events.MAXIMIZED) : $.Event(Basel.UI.Events.MINIMIZED);
                evt.width = w;
                evt.height = h;
                el.trigger(evt);
            }
            maximizedElement = element;
        },
        revert: function(scrollParent) {
            if (!maximizedElement) {
                return;
            }
            var id = maximizedElement.attr("id");
            if (!elementKeyMap[id]) {
                return;
            }

            var grid = elementKeyMap[id].grid;
            var box = elementKeyMap[id].box;
            
            scrollParent.find(".basel-tile").each(function() {
                if ($(this)[0] == maximizedElement[0]) {
                    //$(this).addClass("basel-tile-unfocused");
                    $(this).removeClass("basel-tile-focused");
                } else {
                    //$(this).addClass("basel-tile-focused");
                    $(this).removeClass("basel-tile-unfocused");
                }
            });

            var boxes = grid.getBoxesInPage(box.pageIndex);
            for (var i = 0; i < boxes.length; i++) {
                var key = boxes[i].pageIndex + "-" + boxes[i].colIndex + "-" + boxes[i].rowIndex;
                var el = boxKeyMap[grid][key];
                Basel.UI.applySizeAndPosition(grid, boxes[i], el);

                var w = boxes[i].cols * Basel.UI.Parameters.cellStdWidth + (boxes[i].cols - 1) * Basel.UI.Parameters.cellSpacing;
                var h = boxes[i].rows * Basel.UI.Parameters.cellStdHeight + (boxes[i].rows - 1) * Basel.UI.Parameters.cellSpacing;
                var evt = $.Event(Basel.UI.Events.REVERTED);
                evt.width = w;
                evt.height = h;
                el.trigger(evt);
            }

            maximizedElement = null;
        },
        toggleMaximize: function(element, scrollParent) {
            if (!maximizedElement) {
                Basel.UI.maximize(element, scrollParent);
            } else if (maximizedElement == element) {
                Basel.UI.revert(scrollParent);
            } else {
                var currentPage = elementKeyMap[maximizedElement.attr("id")].box.pageIndex;
                var newPage = elementKeyMap[element.attr("id")].box.pageIndex;
                if (currentPage != newPage) {
                    Basel.UI.revert(scrollParent);
                }
                Basel.UI.maximize(element, scrollParent);
            }
        }
    };
})();

//
//
// Unofficial APIs Below
//
//

/* Title Generate */

Basel.namespace("Basel.TitleLogo");
Basel.TitleLogo = {
	level: 5,
	create: function(text, fontName, width, height) {
		// Split Text
		var words = text.split(" ");
		var result = [];
		
		var fontSize = Math.floor(height / words.length);
		var range = { min: 0, max: width };
		var offset = 0;
		var lastWidth = width;
		for (var i = 0; i < words.length; i++) {
			// measure the length of each word
			var textWidth = Basel.Measure.measureText(words[i], fontName, fontSize);
			range.min = Math.max(0, offset - textWidth);
			range.max = Math.min(width - textWidth, offset + lastWidth);
			var offsetLevel = Basel.Util.getRandomInt(0, Basel.TitleLogo.level - 1);
			// both edges are excluded
			offset = Math.floor(range.min + (offsetLevel + 1) * ((range.max - range.min) / (Basel.TitleLogo.level + 2))) ;
			result.push( { text: words[i], size: fontSize, offset: offset } );
			lastWidth = textWidth;
		}
		return result;
	}
};

/* Measuring Text */

Basel.MeasureText = function(text, fontName, fontSize, maxWidth) {
	Basel.Measure.measureMultilineText(text, fontName, fontSize, maxWidth, null);
};

Basel.Measure = {
	canvas: null,
	measureText: function(text, fontName, fontSize) {
		if (Basel.Measure.canvas == null) {
			Basel.Measure.canvas = document.createElement("canvas");
			document.body.appendChild(Basel.Measure.canvas);
		}
		
		var context = Basel.Measure.canvas.getContext("2d");
		context.fillStyle = "rgba(0, 0, 0, 1)";
		context.font = fontSize + "px '" + fontName + "'";
		context.textBaseline = "baseline";
		context.textAlign = "left";
		
		var metrics = context.measureText(text);
		return metrics.width;
	},
	measureMultilineText: function(text, fontName, fontSize, maxWidth, callback) {
		console.log("INPUT: " + text);
		if (Basel.Measure.canvas == null) {
			Basel.Measure.canvas = document.createElement("canvas");
			document.body.appendChild(Basel.Measure.canvas);
		}
		
		Basel.Measure.canvas.width = maxWidth;
		Basel.Measure.canvas.height = maxWidth;
		
		var context = Basel.Measure.canvas.getContext("2d");
		context.fillStyle = "rgba(0, 0, 0, 1)";
		context.font = fontSize + "px '" + fontName + "'";
		context.textBaseline = "baseline";
		context.textAlign = "left";
		
		var widths = [];
		var height = 0;
		var words = text.split(" ");
		var line = "";
		var width = 0;
		var lineHeight = fontSize * 1.0;
		var y = 0;
		
		for (var i = 0; i < words.length; i++) {
			var testLine = (line == "") ? words[i] : line + " " + words[i];
			var metrics = context.measureText(testLine);
			var testWidth = metrics.width;
			if (maxWidth < testWidth) {
				context.fillText(line, 0, y + lineHeight);
				widths.push(width);
				y += lineHeight;
				line = words[i];
				width = context.measureText(line).width;
			} else {
				line = testLine;
				width = testWidth;
			}
		}
		y += lineHeight;
		context.fillText(line, 0, y);
		widths.push(width);
		height = y;
		
		if (callback != null) {
			callback(widths, height);
		} else if (NativeCB) {
			NativeCB.onTextMeasured(widths, height);
		}
	},
	adjustFontSize: function(textBox, minSize, maxSize) {
	    var outer = $(textBox);
	    var outerHeight = outer.height();
	    var currentSize = parseInt(outer.css("font-size"));
	    $(textBox).wrapInner("<div class='basel-inner-text'></div>");
	    var inner = $(textBox).find(".basel-inner-text");
	    inner.css("width", "100%");
	    var innerHeight = inner.height();
	    var ratio = Math.sqrt(outerHeight / innerHeight);
	    if (innerHeight < outerHeight) {
	        ratio *= 0.85;
	    }
	    var fontSize = Math.max(minSize, Math.min(maxSize, Math.round(currentSize * ratio)));
	    inner.css("font-size", fontSize + "px");
	}
};

/* Data */
Basel.Data = {
    data: [],
    Entry: function(id) {

        if (!(this instanceof Basel.Data.Entry)) {
            return new Basel.Data.Entry(id);
        }
        this.id = id;
        this.score = {
            social: 0,
            content: 1,
            total: 1
        };
        this.image = {
            url: null,
            width: 0,
            height: 0
        };
        this.video = {
            url: null,
            preview_url: null,
            duration: 0
        };
        this.text = "";
        this.customData = null;
        this.source = "";
    }
};

/* Layout */

Basel.Layout = function() {
	if (!(this instanceof Basel.Layout)) {
		return new Basel.Layout();
	}
	$("head").append('<meta name="viewport" content="width=device-width, initial-scale=1">'); 
	$("head").append('<link rel="stylesheet" href="' + Basel.Page.CSS_PATH + '" type="text/css" />');
	this.templates = [];
	this.pages = [];
};

Basel.Layout.prototype.addTemplate = function(template) {
	this.templates.push(template);
};

Basel.Layout.prototype.inject = function($rootElement) {

	if (this.templates.length == 0) {
		return;
	}
	
	var children = $rootElement.children().detach();
	var pageIndex = 0;
	var template = null;
	while (0 < children.size()) {
		if (pageIndex < this.templates.length) {
			template = this.templates[pageIndex];
		}
		var n = Math.min(template.count, children.size());
		var page = new Basel.Page($rootElement, pageIndex, template);
		
		for (var i = 0; i < n; i++) {
			var item = page.getItem(i);
			// unwrap and wrap data again
			var child = children.eq(i);
			item.element.append(child.children());
			// set random background (will be replaced based on image analysis)
			var colors = Basel.Page.Item.generateColor();
			item.element.css("color", colors.fg);
			item.element.css("background-color", colors.bg);

					
			var img = item.element.find("." + Basel.Page.Item.CLASS_FIGURE).eq(0);
			if (img.size() != 0) {
				if (img.is("img")) {
					// replace image with canvas
					var src = img.attr("src");
					var canvas = document.createElement("canvas");
					canvas.className = Basel.Page.Item.CLASS_FIGURE;
					
					var dw = item.element.outerWidth(true) - item.element.width();
					var dh = item.element.outerHeight(true) - item.element.height();
					
					canvas.width = item.width - dw;
					canvas.height = item.height - dh;
					
					img.replaceWith($(canvas));
					
					// add dimmer
					item.element.append("<div class='" + Basel.Page.Item.CLASS_DIMMER + " " + Basel.Page.Item.CLASS_HIDDEN + "'></div>");
					
					var index = item.rowIndex * page.cols + item.colIndex;
					NativeCB.AnalyzeImage(page, index, src, item.width, item.height);
				}
				
				// append data-type attribute
				if (0 < item.element.find("." + Basel.Page.Item.CLASS_LONG_TEXT).size()) {
					item.element.attr(Basel.Page.Item.ATTR_DATA_TYPE, Basel.Page.Item.VAL_DATA_TYPE_IMG_AND_TEXT);
				} else {
					item.element.attr(Basel.Page.Item.ATTR_DATA_TYPE, Basel.Page.Item.VAL_DATA_TYPE_IMG);
				}

			} else {
				item.element.attr(Basel.Page.Item.ATTR_DATA_TYPE, Basel.Page.Item.VAL_DATA_TYPE_TEXT);
			}
		}

		this.pages.push(page);
		pageIndex++;
		children = children.slice(n, children.size());
	}
	
	this.currentPageIndex = 0;
};

Basel.Layout.prototype.apply = function() {
	this.pages[this.currentPageIndex].applyLayout();
};

// Page (Tile) Object
Basel.Page = function($rootElement, pageIndex, template) {
	if (!(this instanceof Basel.Page)) {
		return new Basel.Page(template);
	}
	
	this.cols = template.cols;
	this.rows = template.rows;
	this.pageIndex = pageIndex;
	
	this.itemList = [];
	this.itemCount = template.count;

	this.expandedRowIndex = -1;
	this.expandedColIndex = -1;

	this.onResize = null;
	this.onApplyLayout = null;
	
	this.element = $("<div id='page" + pageIndex + "' class='" + Basel.Page.CLASS_ROOT + "' data-role='page' data-theme='a'></div>");
	$rootElement.append(this.element);
	
	$(window).bind("resize", function() {
		var prevCols = this.cols;
		var prevRows = this.rows;
		
		if (this.onResize != null) {
			this.onResize(prevCols, prevRows);
		}
		this.applyLayout();
	});
	
	this.createTiles($(window).width(), $(window).height(), template);
};

Basel.Page.MAX_VALUE = 10000;
Basel.Page.CLASS_ROOT = "page-root";
Basel.Page.CSS_PATH = "css/tile.css";


Basel.Page.prototype.addItem = function(item) {
	this.itemList.push(item);
	this.element.append(item.element);
};

Basel.Page.prototype.removeItem = function(item) {
	item.element.remove();
	this.itemList.splice(this.itemList.indexOf(item), 1);
};

Basel.Page.prototype.applyLayout = function() {
	//Tile.title.applyLayout();
	for (var i = 0; i < this.rows; i++) {
		for (var j = 0; j < this.cols; j++) {
			var item = this.itemList[i * this.cols + j];
			item.applyLayout();
			if (this.onApplyLayout != null) {
				this.onApplyLayout(item);
			}
		}
	}
};

Basel.Page.prototype.expand = function(colIndex, rowIndex) {
	//var maxWidth = $(window).width() - (Page.cols - 1) * Page.Item.MIN_WIDTH;
	//var maxHeight = $(window).height() - Page.title.getHeight() - (Page.rows - 1) * Page.Item.MIN_HEIGHT;
	var colspan = this.template.table[colIndex][rowIndex][0];
	var rowspan = this.template.table[colIndex][rowIndex][1];
	
	var maxWidth = this.width - Basel.Page.Item.MIN_WIDTH * (this.cols - colspan);
	var maxHeight = this.height - Basel.Page.Item.MIN_HEIGHT * (this.rows - rowspan);
	var unitWidth = maxWidth / colspan;
	var unitHeight = maxHeight / rowspan;
	
	this.expandedColIndex = colIndex;
	this.expandedRowIndex = rowIndex;
	
	var top = 0;
	//var top = Page.title.getHeight();
	
	for (var j = 0; j < this.rows;  j++) {
		var left = 0;
		for (var i = 0; i < this.cols; i++) {
			var item = this.itemList[j * this.cols + i];
			var itemColspan = this.template.table[i][j][0];
			var itemRowspan = this.template.table[i][j][1];

			if (itemColspan == 0) {
				item.width = 0;
				item.height = 0;
				var origC = this.template.getOriginCell(i, j).colIndex;
				var origR = this.template.getOriginCell(i, j).rowIndex;
				var origin = this.itemList[origR * this.cols + origC];
				if (i == origC) {
					left += origin.width;
				}
				if (i == this.cols - 1) {
					// check overlapping with the expanded item
					if (rowIndex <= j && j < rowIndex + rowspan) {
						// vertical overlap
						top += maxHeight / rowspan;
					} else {
						// no overlap
						top += Basel.Page.Item.MIN_HEIGHT;
					}
				}
			} else {
				if (j == rowIndex && i == colIndex) {
					item.isExpanded = true;
					item.width = maxWidth;
					item.height = maxHeight;
					item.element.find("." + Basel.Page.Item.CLASS_DIMMER).addClass(Basel.Page.Item.CLASS_HIDDEN);
				} else {
					item.isExpanded = false;
					
					if (i + itemColspan <= colIndex || colIndex + colspan <= i) {
						// No horizontal overlap
						item.width = Basel.Page.Item.MIN_WIDTH * itemColspan;
					} else {
						// Have some horizontal overlap
						var l = Math.max(i, colIndex);
						var r = Math.min(i + itemColspan, colIndex + colspan);
						var overlapCols = r - l;
						item.width = Basel.Page.Item.MIN_WIDTH * (itemColspan - overlapCols) + unitWidth * overlapCols;
					}
					
					if (j + itemRowspan <= rowIndex || rowIndex + rowspan <= j) {
						// No vertical overlap
						item.height = Basel.Page.Item.MIN_HEIGHT * itemRowspan;
					} else {
						// Have some vertical overlap
						var upper = Math.max(j, rowIndex);
						var lower = Math.min(j + itemRowspan, rowIndex + rowspan);
						var overlapRows = lower - upper;
						item.height = Basel.Page.Item.MIN_HEIGHT * (itemRowspan - overlapRows) + unitHeight * overlapRows;
					}
					
					item.element.find("." + Basel.Page.Item.CLASS_DIMMER).removeClass(Basel.Page.Item.CLASS_HIDDEN);
				}
			}	
			item.x = left;
			item.y = top;
			//console.log("[" + i + ", " + j + "]\tCurrent Left: " + left + ", top: " + top);
			left += item.width;
		}
		top += item.height;
	}
	
	this.applyLayout(true);
	
	// Invoke callbacks
	for (i = 0; i < this.rows;  i++) {
		for (j = 0; j < this.cols; j++) {
			item = this.itemList[i * this.cols + j];
			if (item.isExpanded) {
				if (item.onExpand != null) {
					item.onExpand(item.width, item.height);
				}
			} else if (item.onCollapse != null) {
				item.onCollapse(item.width, item.height);
			}
		}
	}
};

Basel.Page.prototype.revert = function() {
	var itemWidth = Math.floor(this.width / this.cols);
	var itemHeight = Math.floor(this.height / this.rows);
	
	for (var j = 0; j < this.rows; j++) {
		for (var i = 0; i < this.cols; i++) {
			var item = this.itemList[j * this.cols + i];
			item.isExpanded = false;
			item.x = itemWidth * i;
			item.y = itemHeight * j;
			item.width = itemWidth * this.template.table[i][j][0];
			item.height = itemHeight * this.template.table[i][j][1];
			item.element.find("." + Basel.Page.Item.CLASS_DIMMER).addClass(Basel.Page.Item.CLASS_HIDDEN);
		}
	}
	
	this.expandedColIndex = -1;
	this.expandedRowIndex = -1;
	this.applyLayout();
};

/*
Basel.Page.prototype.autoCreateTiles = function(width, height) {
	if (Basel.Page.Title.DEFAULT_HEIGHT + Basel.Page.Item.DEFAULT_HEIGHT < height) {
		Basel.Page.title.width = width;
		Basel.Page.title.height = Basel.Page.Title.DEFAULT_HEIGHT;
		Basel.Page.title.applyLayout();		

		var cols = Math.floor(width / Basel.Page.Item.DEFAULT_WIDTH);
		var rows = Math.floor((height - Basel.Page.title.getHeight()) / Basel.Page.Item.DEFAULT_HEIGHT);
		Basel.Page.createTiles(width, height - Basel.Page.title.getHeight(), cols, rows);
		
	} else {
		Basel.Page.title.width = width;
		Basel.Page.title.height = height;
		Basel.Page.rows = 0;
		Basel.Page.cols = 0;
		Basel.Page.itemList = [];
	}
};
*/

Basel.Page.prototype.createTiles = function(width, height, template) {
	this.width = width;
	this.height = height;
	this.cols = template.cols;
	this.rows = template.rows;
	this.template = template;
	
	var itemWidth = Math.floor(width / this.cols);
	var itemHeight = Math.floor(height / this.rows);
	var n = this.cols * this.rows;

	// add or remove items
	if (this.itemList.length < n) {
		for (var i = this.itemList.length; i < n; i++) {
			this.addItem(new Basel.Page.Item(this));
		}
	} else if (n < this.itemList.length) {
		for (var i = this.itemList.length - 1; n <= i; i--) {
			this.removeItem(this.itemList[i]);
		}
	}
	
	for (var j = 0; j < this.rows; j++) {
		for (var i = 0; i < this.cols; i++) {
			var item = this.itemList[j * this.cols + i];
			item.rowIndex = j;
			item.colIndex = i;
			item.x = itemWidth * i;
			item.y = itemHeight * j;
			item.width = itemWidth * this.template.table[i][j][0];
			item.height = itemHeight * this.template.table[i][j][1];
			if (!this.template.isSpannedCell(i, j)) {
				item.element.removeClass(Basel.Page.Item.CLASS_SPANNED);
			} else {
				item.element.addClass(Basel.Page.Item.CLASS_SPANNED);
			}
			if (item.onCollapse != null) {
				item.onCollapse(item.width, item.height);
			}
		}
	}
};

Basel.Page.prototype.inject = function($dataList) {

	var n = Math.min(this.itemCount, $dataList.size());
	
	for (var i = 0; i < n; i++) {
		var item = this.getItem(i);
		// unwrap and wrap data again
		var child = $dataList.eq(i);
		
		item.element.append(child.children());

		var img = item.element.find("img." + Basel.Page.Item.CLASS_FIGURE).eq(0);
		if (img) {
			// replace image with canvas
			var src = img.attr("src");
			var canvas = document.createElement("canvas");
			canvas.className = Basel.Page.Item.CLASS_FIGURE;
			
			var dw = item.element.outerWidth(true) - item.element.width();
			var dh = item.element.outerHeight(true) - item.element.height();
			
			canvas.width = item.width - dw;
			canvas.height = item.height - dh;
			
			img.replaceWith($(canvas));
			
			// add dimmer
			item.element.append("<div class='" + Basel.Page.Item.CLASS_DIMMER + " " + Basel.Page.Item.CLASS_HIDDEN + "'></div>");
			
			var index = item.rowIndex * this.cols + item.colIndex;
			NativeCB.AnalyzeImage(this, index, src, item.width, item.height);
		};
	}

};

Basel.Page.prototype.getItem = function(index) {
	var item = null;
	var k = 0;
	
	for (var j = 0; j < this.rows; j++) {
		for (var i = 0; i < this.cols; i++) {
			if (!this.template.isSpannedCell(i, j)) {
				if (k == index) {
					item = this.itemList[j * this.cols + i];
					return item;
				} else {
					k++;
				}
			}
		}
	}
	return item;
};

Basel.Page.prototype.setCroppedRegion = function(index, path, x, y, w, h, destW, destH) {
	var item = this.itemList[index];
	var canvas = item.element.find("canvas." + Basel.Page.Item.CLASS_FIGURE).get(0);
	if (canvas) {
		var img = new Image();
		img.src = path;
		img.onload = function() {
			var context = canvas.getContext("2d");
			context.drawImage(img, x, y, w, h, 0, 0, destW, destH);
			item.image = img;
			/*
			var lineGrad = context.createLinearGradient(destW - 100, 0, 100, 0);
			lineGrad.addColorStop(0, "rgba(172, 118, 107, 0)");
			lineGrad.addColorStop(1, "rgba(172, 118, 107, 1)");
			context.fillStyle = lineGrad;
			context.fillRect(destW - 100, 0, 100, destH);
			*/
		};
	}
};

Basel.Page.prototype.setItemColor = function(index, fg, bg) {
	var item = this.itemList[index].element;
	item.css("color", fg);
	item.css("background-color", bg);
};


// Item Object

Basel.Page.Item = function(parent) {
	if (!(this instanceof Basel.Page.Item)) {
		return new Basel.Page.Item(parent);
	}
	
	this.parent = parent;
	this.x = 0;
	this.y = 0;
	this.width = this.DEFAULT_WIDTH;
	this.height = this.DEFAULT_HEIGHT;
	this.colIndex = -1;
	this.rowIndex = -1;
	
	this.element = $("<div class='" + Basel.Page.Item.CLASS_DEFAULT + "'></div>");
	this.element.click(function(item) {
		return function() {
			if (!item.isExpanded) {
				item.parent.expand(item.colIndex, item.rowIndex);
			} else {
				item.parent.revert();
			}
		};
	}(this));
	this.image = null;
	this.isExpanded = false;
	
	this.onExpand = null;
	this.onCollapse = null;
};

Basel.Page.Item.MIN_WIDTH = 120;
Basel.Page.Item.MIN_HEIGHT = 120;
Basel.Page.Item.DEFAULT_WIDTH = 200;
Basel.Page.Item.DEFAULT_HEIGHT = 200;
Basel.Page.Item.MAX_WIDTH = 400;
Basel.Page.Item.MAX_HEIGHT = 400;
Basel.Page.Item.DEFAULT_FONT_SIZE_L = 48;
Basel.Page.Item.DEFAULT_FONT_SIZE_M = 24;

Basel.Page.Item.CLASS_DEFAULT = "page-item";
Basel.Page.Item.CLASS_SPANNED = "item-spanned";
Basel.Page.Item.CLASS_TITLE = "item-title";
Basel.Page.Item.CLASS_FIGURE = "item-figure";
Basel.Page.Item.CLASS_DIMMER = "item-dimmer";
Basel.Page.Item.CLASS_HIDDEN = "hidden";

Basel.Page.Item.CLASS_SHORT_TEXT = "desc-short";
Basel.Page.Item.CLASS_LONG_TEXT = "desc-long";

Basel.Page.Item.ATTR_DATA_TYPE = "data-type";
Basel.Page.Item.VAL_DATA_TYPE_TEXT = "text";
Basel.Page.Item.VAL_DATA_TYPE_IMG = "image";
Basel.Page.Item.VAL_DATA_TYPE_IMG_AND_TEXT = "image-and-text";

Basel.Page.Item.prototype.applyLayout = function() {
	if (this.element != null) {		
		var dw = this.element.outerWidth(true) - this.element.width();
		var dh = this.element.outerHeight(true) - this.element.height();
		
		this.element.css("left", this.x + "px");
		this.element.css("top", this.y + "px");
		this.element.width(Math.max(0, this.width - dw));
		this.element.height(Math.max(0, this.height - dh));
		
		var title = this.element.find("." + Basel.Page.Item.CLASS_TITLE);
		var ratio = (this.width / Basel.Page.Item.DEFAULT_WIDTH + this.height / Basel.Page.Item.DEFAULT_HEIGHT) / 4;
		var fontSizeL = Math.round(ratio * Basel.Page.Item.DEFAULT_FONT_SIZE_L);
		
		var imgWidth = this.width - dw;
		var imgHeight = this.height - dh;

		if (this.parent.expandedRowIndex == -1) {
			// default state
			title.removeClass(Basel.Page.Item.CLASS_HIDDEN);
		} else if (this.isExpanded) {
			// a. large rect
			title.removeClass(Basel.Page.Item.CLASS_HIDDEN);
			
			if (this.width - dw < this.height - dh) {
				imgWidth = this.width - dw;
				imgHeight = this.height * 0.5;
				this.element.css("-webkit-box-orient", "vertical");
				this.element.css("-ms-box-orient", "vertical");
			} else {
				imgHeight = this.height - dh; 
				imgWidth = this.width * 0.5;
				this.element.css("-webkit-box-orient", "horizontal");
				this.element.css("-ms-box-orient", "horizontal");
			}
				
		} else {
			if (this.rowIndex == this.parent.expandedRowIndex) {
				// b. portrait
				fontSizeL = this.width * 0.75;
				title.addClass(Basel.Page.Item.CLASS_HIDDEN);
			} else if (this.colIndex == this.parent.expandedColIndex) {
				// c. landscape
				fontSizeL = this.height * 0.75;			
				title.removeClass(Basel.Page.Item.CLASS_HIDDEN);
			} else {
				// d. small rect
				fontSizeL = this.width * 0.75;		
				title.addClass(Basel.Page.Item.CLASS_HIDDEN);
			}
		}
		
		//title.css("font-size", fontSizeL + "px");
		
		if (this.image) {
			var canvas = this.element.find("." + Basel.Page.Item.CLASS_FIGURE).get(0);
			if (canvas) {
				canvas.width = imgWidth;
				canvas.height = imgHeight;
			}
			title.width(canvas.width);
			NativeCB.CalcCroppedRegion(this.parent, this.parent.cols * this.rowIndex + this.colIndex, this.image.src, canvas.width, canvas.height);
		}
	}
};

Basel.Page.Item.prototype.getWidth = function() {
	if (this.element != null) {
		return this.element.outerWidth(true);
	} else {
		return 0;
	}
};

Basel.Page.Item.prototype.getHeight = function() {
	if (this.element != null) {
		return this.element.outerHeight(true);
	} else {
		return 0;
	}
};

// Randomly generates a pair of bg and fg
Basel.Page.Item.generateColor = function() {
	var hue = Math.floor(Math.random() * 360);
	var bg = "hsl(" + hue + ", 25%, 75%)";
	return { fg: "rgb(0,0,0)", bg: bg };
};

// Template

Basel.Page.Template = function(cols, rows) {
	if (!(this instanceof Basel.Page.Template)) {
		return new Basel.Page.Template(cols, rows);
	}
	
	this.cols = cols;
	this.rows = rows;
	this.count = cols * rows;

	this.table = new Array(cols);
	for (var i = 0; i < this.table.length; i++) {
		this.table[i] = new Array(rows);
		for (var j = 0; j < this.table[i].length; j++) {
			this.table[i][j] = [1, 1];
		}
	}
};

Basel.Page.Template.prototype.setSpan = function(colIndex, rowIndex, colspan, rowspan) {
	var colMax = Math.min(colIndex + colspan, this.cols);
	var rowMax = Math.min(rowIndex + rowspan, this.rows);
	
	for (var i = colIndex; i < colMax; i++) {
		for (var j = rowIndex; j < rowMax; j++) {
			if (i == colIndex && j == rowIndex) {
				this.table[i][j] = [colspan, rowspan];
			} else {
				// add origin info at element 2 & 3
				this.table[i][j] = [0, 0, colIndex, rowIndex];
			}
		}
	}
	
	var count = 0;
	for (i = 0; i < this.cols; i++) {
		for (j = 0; j < this.rows; j++) {
			if (this.table[i][j][0] != 0) {
				count++;
			}
		}
	}
	this.count = count;
};

Basel.Page.Template.prototype.isSpannedCell = function(colIndex, rowIndex) {
	return (this.table[colIndex][rowIndex][0] == 0);
};

Basel.Page.Template.prototype.getOriginCell = function(colIndex, rowIndex) {
	var c = this.table[colIndex][rowIndex][2];
	var r = this.table[colIndex][rowIndex][3];
	return { colIndex: c, rowIndex: r };
};

Basel.Page.Template.prototype.countSurroundingCells = function(colIndex, rowIndex) {
	var colspan = this.table[colIndex][rowIndex][0];
	var rowspan = this.table[colIndex][rowIndex][1];
	
	// left
	var itemsL = 0;
	for (var i = 0; i < colIndex; i++) {
		for (var j = 0; j < this.rows; j++) {
			if (!this.isSpannedCell(i, j)) {
				itemsL++;
				break;
			}
		}
	}
	
	// right
	var itemsR = 0;
	for (i = colIndex + colspan; i < this.cols; i++) {
		for (j = 0; j < this.rows; j++) {
			if (!this.isSpannedCell(i, j)) {
				itemsR++;
				break;
			}
		}
	}
	
	// top
	var itemsT = 0;
	for (j = 0; j < rowIndex; j++) {
		for (i = 0; i < this.cols; i++) {
			if (!this.isSpannedCell(i, j)) {
				itemsT++;
				break;
			}
		}
	}
	
	// bottom
	var itemsB = 0;
	for (j = rowIndex + rowspan; j < this.rows; j++) {
		for (i = 0; i < this.cols; i++) {
			if (!this.isSpannedCell(i, j)) {
				itemsB++;
				break;
			}
		}
	}
	
	return { left: itemsL, top: itemsT, right: itemsR, bottom: itemsB };
};

Basel.Page.Template.prototype.printDebug = function() {
	for (var j = 0; j < this.rows; j++) {
		var str = "";
		for (var i = 0; i < this.cols; i++) {
			str = str + "(" + this.table[i][j][0] + ", " + this.table[i][j][1] + ") ";
		}
		console.log(str);
	}
	console.log(this.count + " item(s)");
};

