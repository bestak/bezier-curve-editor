class BezierCanvas {

    constructor(canvas, context) {
        this.canvas = canvas;
        this.context = context;
        this.canvasAdditionalDraw = (canvas, context) => {}

        // line style defaults
        this.context.lineCap = "round";
        this.context.lineJoin = "round";

        // event handlers
        this.dragStart = this.dragStart.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.dragEnd = this.dragEnd.bind(this);
        this.loadCurvesFromFile = this.loadCurvesFromFile.bind(this)

        this.canvas.onmousedown = this.dragStart;
        this.canvas.onmousemove = this.onMouseMove;
        this.canvas.onmouseup = canvas1.onmouseout = this.dragEnd;
        this.canvas.addEventListener('click', (event) => {
            this.onClick(event)
        });
        this.canvas.addEventListener('dblclick', (event) => {
            this.onDoubleClick(event)
        });

        this.pressedKeys = new Set();
        document.addEventListener('keydown', (event) => {
            this.onKeyDown(event)
        });
        document.addEventListener('keyup', (event) => {
            this.onKeyUp(event)
        });

        this.curves = [
            // new Curve('#900', [
            //     new BezierPoint(null, new Point(200, 100), new Point(300, 100)),
            //     new BezierPoint(new Point(300, 200), new Point(350, 200), new Point(400, 200)),
            //     new BezierPoint(new Point(400, 100), new Point(500, 100), null)
            // ]),
        ];

        this.selectedCurve = null;
        this.selectedPoint = null;

        this.currentBrushColor = "#900";
    }

    drawCanvas() {
        this.clearCanvas()

        // Background grids
        this.drawGrid(); // Draw background grid

        this.canvasAdditionalDraw(this.canvas, this.context);

        for (const curve of this.curves) {
            curve.draw(this, this.tool)
        }

        this.tool.draw(this)
    }

    clearCanvas() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawGrid() {
        let bw = this.canvas.width;
        let bh = this.canvas.height;
        var delta = 50; // grid cell size

        for (var x = 0; x <= bw; x += delta) {
            this.context.moveTo(x, 0);
            this.context.lineTo(x, bh);
        }

        for (var y = 0; y <= bh; y += delta) {
            this.context.moveTo(0, y);
            this.context.lineTo(bw, y);
        }

        this.context.lineWidth = 1;
        this.context.strokeStyle = "lightgray";
        this.context.stroke();

        this.context.fillStyle = "black";
        this.context.font = "12px Arial";
        this.context.fillText("(0,0)", 2, 12);
    }

    drawCurve(points, style = defaultStyle) {
        if (points.length === 0) {
            return;
        }
        // Draw curve
        this.context.lineWidth = style.curve.width;
        this.context.strokeStyle = style.curve.color;

        this.context.beginPath();
        let dash = style.curve.dash;
        this.context.setLineDash([dash, dash]);

        var firstPoint = points[0];
        var currentPoint;
        this.context.moveTo(firstPoint.x, firstPoint.y);
        for (var i = 0; i < points.length; i++) {
            currentPoint = points[i];
            this.context.lineTo(currentPoint.x, currentPoint.y);
        }
        this.context.stroke();
        this.context.setLineDash([]);
    }

    drawVertices(points, style = defaultStyle, rect = false) {
        for (var i = 0; i < points.length; i++) {
            var p = points[i];
            this.context.lineWidth = style.point.width;
            this.context.strokeStyle = style.point.color;
            this.context.fillStyle = style.point.fill;
            this.context.beginPath();
            if (rect) {
                let offset = style.point.radius * math.cos(math.PI / 4)
                let rectPoints = [
                    new Point(p.x - offset, p.y - offset),
                    new Point(p.x - offset, p.y + offset),
                    new Point(p.x + offset, p.y + offset),
                    new Point(p.x + offset, p.y - offset),
                    new Point(p.x - offset, p.y - offset),
                    new Point(p.x - offset, p.y + offset), // pad to hide corner when rendering
                ]
                this.drawCurve(rectPoints, {curve: {width: style.point.width, color: style.point.color, dash: 0}})
            } else {
                this.context.arc(p.x, p.y, style.point.radius, style.point.arc1, style.point.arc2, true);
            }
            this.context.fill();
            this.context.stroke();
        }
    }

    resizeCanvas() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        this.drawCanvas()
    }

    /**
     Methods to allow dragging transformedPoints around
     **/

    // event parser
    mousePos(event) {
        event = (event ? event : window.event);
        return new Point(
            event.pageX - this.canvas.offsetLeft,
            event.pageY - this.canvas.offsetTop
        )
    }

    dragStart(e) {
        let pos = this.mousePos(e)
        this.clickMouseDownPoint = pos.clone();
        this.tool?.onMouseDown(pos)
        this.drawCanvas();
    }

    onMouseMove(e) {
        let pos = this.mousePos(e)
        this.tool?.onMouseMove(pos)
        this.drawCanvas();
    }

    // end dragging
    dragEnd(e) {
        let pos = this.mousePos(e)
        this.tool?.onMouseUp(pos)
        this.drawCanvas();
    }

    onClick(e) {
        let pos = this.mousePos(e)
    }
    onDoubleClick(e) {
        let pos = this.mousePos(e)
        this.tool.onDoubleClick(pos)
        this.drawCanvas()
    }

    deselectAllCurves() {
        for (const curve of this.curves) {
            curve.setSelected(false);
        }
        this.selectedCurve = null;
        this.selectedPoint = null;
        this.drawCanvas()
    }

    deleteCurve(curve) {
        const index = this.curves.indexOf(curve);
        if (index !== -1) {
            this.curves.splice(index, 1);
        }
    }

    onKeyDown(event) {
        this.pressedKeys.add(event.code)
        if (this.pressedKeys.has('Escape')) {
            this.deselectAllCurves()
        }
        this.tool.onKeyPress(this.pressedKeys)
        this.drawCanvas()
    }

    onKeyUp(event) {
        this.pressedKeys.delete(event.code)
        this.drawCanvas()
    }

    onColorInput(color) {
        this.currentBrushColor = color;
        if (this.selectedCurve) {
            this.selectedCurve.color = color;
            this.drawCanvas()
        }
    }

    setTool(tool) {
        this.tool?.deselect()
        this.tool = tool;
        this.drawCanvas()
    }

    setCursorStyle(style) {
        this.canvas.style.cursor = style;
    }

    saveCurvesToFile() {
        saveToFile(JSON.stringify(this.curves), 'curves.txt', 'text/plain');
    }

    loadCurvesFromFile(contents) {
        let plainCurves = JSON.parse(contents);
        this.curves = plainCurves.map((curve) => {
            let points = curve.points.map((bezierPoint) => {
                let point = bezierPoint.point;
                let guide1 = bezierPoint.guide1;
                let guide2 = bezierPoint.guide2;
                return new BezierPoint(
                    guide1 ? new Point(guide1.x, guide1.y, guide1.radius) : null,
                    new Point(point.x, point.y, point.radius),
                    guide2 ? new Point(guide2.x, guide2.y, guide2.radius) : null
                )
            })
            return new Curve(
                curve.color,
                points
            )
        })
        this.drawCanvas();
    }
}