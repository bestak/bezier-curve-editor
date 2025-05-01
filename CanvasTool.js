
class CanvasTool {
    constructor(name) {
        this.name = name;
    }
    toString() {
        return `CanvasTool.${this.name}`;
    }

    static from(value, canvas) {
        switch (value) {
            case 'select':
                return new SelectTool(canvas);
            case 'scale':
                return new ScaleTool(canvas);
            case 'rotate':
                return new RotateTool(canvas);
            case 'edit':
                return new EditTool(canvas);
            case 'brush':
                return new BrushTool(canvas);
        }
    }

    hidePoints() {
        return this.name === 'select' || this.name === 'rotate' || this.name === 'scale'
    }

    draw(canvas) {}

    onMouseDown(pos) {}
    onMouseMove(pos) {}
    onMouseUp(pos) {}

    onKeyPress(keys) {}

    onClick(pos) {}
    onDoubleClick(pos) {}

    deselect() {}
}

class SelectTool extends CanvasTool {
    constructor(canvas, name = 'select') {
        super(name, canvas);
        this.canvas = canvas;
        this.dragStart = null;
    }

    onMouseDown(pos) {
        for (const curve of this.canvas.curves) {
            curve.setSelected(false);
        }

        for (const curve of this.canvas.curves) {
            if (curve.isBoundingPointColliding(pos) || curve.isCurveColliding(pos)) {
                this.dragStart = pos;

                this.canvas.selectedCurve = curve;
                curve.setSelected(true);

                this.canvas.setCursorStyle('move')
                break;
            }
        }
    }

    onMouseMove(pos) {
        if (this.dragStart) {
            const dx = pos.x - this.dragStart.x;
            const dy = pos.y - this.dragStart.y;
            for (const point of this.canvas.selectedCurve.getPathPoints()) {
                point.x += dx;
                point.y += dy;
            }
            this.dragStart = pos;
        }
    }

    onMouseUp(pos) {
        if (this.dragStart) {
            this.canvas.setCursorStyle('default')
        }
        this.dragStart = null;
    }

    onKeyPress(keys) {
        if (keys.has('Backspace')) {
            this.canvas.deleteCurve(this.canvas.selectedCurve);
            this.canvas.selectedCurve = null;
            this.canvas.selectedPoint = null;
        }
    }

    draw(canvas, drawPoints = true) {
        let curve = this.canvas.selectedCurve
        if (!curve) {
            return;
        }
        if (curve.selected && !curve.currentlyCreating) {
            let bounds = curve.getBoundingBox()
            canvas.drawCurve(getRectPoints(...bounds), {curve: { width: 1, color: "rgba(71,71,71,0.55)", dash: 5 }})

            if (drawPoints) {
                canvas.drawVertices(bounds)
            }
        }
    }
}


class EditTool extends CanvasTool {
    constructor(canvas) {
        super('edit');
        this.canvas = canvas;
        this.collisionPoints = null;
        this.dragStart = null;
        this.addingNewGuide = false;
    }

    onMouseDown(pos) {
        let curves = this.canvas.curves;

        let collisionsPoint = []
        let collisionsCurve = []
        for (const curve of curves) {
            collisionsPoint.push(curve.isPointColliding(pos))
            collisionsCurve.push(curve.isCurveColliding(pos))
            for (const point of curve.getPoints()) {
                curve.setSelected(false);
                point.setSelected(false);
            }
        }

        for (let i = 0; i < curves.length; i++) {
            let curve = curves[i];
            let collisionPoints = collisionsPoint[i]
            if (collisionsCurve[i]) {
                this.canvas.selectedCurve = curve;
                curve.setSelected(true);
            }
            if (collisionPoints) {
                this.collisionPoints = collisionPoints;
                this.dragStart = pos;

                this.canvas.selectedCurve = curve;
                this.canvas.selectedPoint = collisionPoints.bezierPoint;

                curve.setSelected(true);
                curve.selectPoint(collisionPoints.bezierPoint, true)

                this.canvas.setCursorStyle('move')
                break;
            }
        }
    }

    onMouseMove(pos) {
        if (this.collisionPoints) {
            this.checkMissingGuides()

            let pathPoint = this.collisionPoints.pathPoint;
            let bezierPoint = this.collisionPoints.bezierPoint;


            const delta = pos.minus(this.dragStart)
            pathPoint.set(pathPoint.plus(delta));

            if (pathPoint === bezierPoint.point) { // main point
                for (const guide of bezierPoint.getGuides()) {
                    guide.set(guide.plus(delta))
                }
            } else if (bezierPoint.guide1 && bezierPoint.guide2) { // guides
                let lockLength = !this.canvas.pressedKeys.has('ShiftLeft');
                let changeOtherGuide = !this.canvas.pressedKeys.has('AltLeft')
                if (changeOtherGuide) {
                    if (pathPoint === bezierPoint.guide1) {
                        bezierPoint.copyGuideVector(bezierPoint.guide1, bezierPoint.guide2, lockLength)
                    } else if (pathPoint === bezierPoint.guide2) {
                        bezierPoint.copyGuideVector(bezierPoint.guide2, bezierPoint.guide1, lockLength)
                    }
                }
            }
            this.dragStart = pos;
        }
    }

    checkMissingGuides() {
        let curve = this.canvas.selectedCurve;
        let pathPoint = this.collisionPoints.pathPoint;
        let bezierPoint = this.collisionPoints.bezierPoint;

        let isMissingGuides;
        if (curve.getPoints()[0] === bezierPoint) {
            isMissingGuides = bezierPoint.guide2 == null;
        } else if (curve.getPoints()[curve.getPoints().length - 1] === bezierPoint) {
            isMissingGuides = bezierPoint.guide1 == null;
        } else {
            isMissingGuides = bezierPoint.isMissingGuide()
        }

        if (!this.addingNewGuide && isMissingGuides && this.canvas.pressedKeys.has('AltLeft')) {
            this.addingNewGuide = true;
            let newGuide = pathPoint.clone();
            if (!bezierPoint.guide1 && curve.getPoints()[0] !== bezierPoint) {
                bezierPoint.guide1 = newGuide;
            } else if (curve.getPoints()[curve.getPoints().length - 1] !== bezierPoint) {
                bezierPoint.guide2 = newGuide;
            }
            this.collisionPoints = {
                bezierPoint: bezierPoint,
                pathPoint: newGuide
            }
        }
    }

    onMouseUp(pos) {
        if (this.collisionPoints) {
            this.collisionPoints = null;
            this.canvas.setCursorStyle('default')
        }
        this.addingNewGuide = false;
    }

    onKeyPress(keys) {
        if (keys.has('Backspace')) {
            if (this.canvas.selectedPoint) {
                let points = this.canvas.selectedCurve.getPoints();
                const index = points.indexOf(this.canvas.selectedPoint);
                if (index !== -1) {
                    if (points.length === 2) {
                        this.canvas.deleteCurve(this.canvas.selectedCurve);
                        this.canvas.selectedCurve = null;
                    } else {
                        if (index === 0 && points.length > 1) {
                            points[index + 1].guide1 = null;
                        } else if (index === points.length - 1 && points.length > 1) {
                            points[index - 1].guide2 = null;
                        }
                        points.splice(index, 1);
                    }
                    this.canvas.selectedPoint = null;
                }
            }
        }
    }

    onDoubleClick(pos) {
        // Add new point
        if (this.canvas.selectedCurve) {
            let collision = this.canvas.selectedCurve.isCurveColliding(pos)
            if (collision) {
                let points = this.canvas.selectedCurve.getPoints()
                let t = collision.t
                let previousPoint = points[collision.segmentIndex]
                let nextPoint = points[collision.segmentIndex + 1]

                let p0 = previousPoint.point
                let p1 = previousPoint.guide2 ? previousPoint.guide2 : previousPoint.point
                let p2 = nextPoint.guide1 ? nextPoint.guide1 : nextPoint.point
                let p3 = nextPoint.point

                let p01 = this.getPointOnSegment(p0, p1, t)
                let p12 = this.getPointOnSegment(p1, p2, t)
                let p23 = this.getPointOnSegment(p2, p3, t)
                let p012 = this.getPointOnSegment(p01, p12, t)
                let p123 = this.getPointOnSegment(p12, p23, t)
                let p0123 = this.getPointOnSegment(p012, p123, t)

                let newPoint;
                if (!previousPoint.guide2 && !nextPoint.guide1) {
                    newPoint = new BezierPoint(null, p0123, null)
                } else {
                    previousPoint.guide2 = previousPoint.guide2 ? p01 : null;
                    nextPoint.guide1 = nextPoint.guide1 ? p23 : null;
                    newPoint = new BezierPoint(p012, p0123, p123)
                }

                this.canvas.selectedCurve.getPoints().splice(collision.segmentIndex + 1, 0, newPoint)
                this.canvas.selectedPoint = newPoint;
                this.canvas.selectedCurve.selectPoint(newPoint, true)
            }
        }
    }

    getPointOnSegment(a, b, t) {
        return a.multiply(1 - t).plus(b.multiply(t))
    }

    deselect() {
        if (this.canvas.selectedPoint) {
            this.canvas.selectedCurve.selectPoint(this.canvas.selectedPoint, false)
        }
    }
}

class BrushTool extends CanvasTool {
    constructor(canvas) {
        super('brush');
        this.canvas = canvas;
        this.dragStart = null;

        this.currentPoint = null;
        this.currentPointIsBezier = false;
        this.previousPoint = null;

        this.currentCurve = null;

        this.canvas.deselectAllCurves()
    }

    onMouseDown(pos) {
        this.dragStart = pos;
        this.currentPointIsBezier = false;
        this.previousPoint?.setSelected(false)

        if (!this.currentCurve) {
            this.createNewCurve(pos)
        }
    }

    onMouseMove(pos) {
        if (this.dragStart) {
            this.currentPoint.currentlyDrawing = false;
            if (pos.distanceTo(this.dragStart) > 5) {
                this.currentPointIsBezier = true;
                this.addPointGuides(pos)
            }
        } else if (this.currentCurve) {
            // draw projection
            if (this.currentPointIsBezier) {
                this.currentPoint.guide1 = null;
            }
            this.currentPoint.point.set(pos)
        }
    }

    onMouseUp(pos) {
        if (this.dragStart) {
            this.currentPoint.currentlyDrawing = false;
            this.previousPoint = this.currentPoint;

            this.addPoint(pos)

            this.dragStart = null;
        }
    }

    createNewCurve(pos) {
        this.canvas.deselectAllCurves()
        this.currentCurve = new Curve(this.canvas.currentBrushColor)
        this.currentCurve.setSelected(true);
        this.currentCurve.currentlyCreating = true;
        this.canvas.selectedCurve = this.currentCurve;

        this.addPoint(pos)

        this.canvas.curves.push(this.currentCurve)
    }

    addPoint(pos) {
        this.currentPoint = new BezierPoint(null, pos.clone(), null);
        this.currentPoint.setSelected(true)
        this.currentPoint.currentlyDrawing = true;
        this.currentCurve.addPoint(this.currentPoint);
    }

    addPointGuides(pos) {
        this.currentPoint.guide2 = pos;

        let lockLength = !this.canvas.pressedKeys.has('ShiftLeft');
        let changeOtherGuide = !this.canvas.pressedKeys.has('AltLeft') && this.previousPoint !== null
        if (changeOtherGuide) {
            if (!this.currentPoint.guide1) {
                this.currentPoint.guide1 = this.currentPoint.guide2.clone();
            }
            this.currentPoint.copyGuideVector(this.currentPoint.guide2, this.currentPoint.guide1, lockLength)
        }
    }

    onKeyPress(keys) {
        if (keys.has('Escape')) {
            if (this.previousPoint) {
                this.previousPoint.guide2 = null;
                this.previousPoint.setGuidesVisible(false);
                this.previousPoint = null;
            }
            if (this.currentPoint) {
                let points = this.currentCurve.getPoints();
                const index = points.indexOf(this.currentPoint);
                points.splice(index, 1);
                if (points.length === 1) {
                    this.canvas.deleteCurve(this.currentCurve);
                }

                this.currentPoint = null;
            }
            if (this.currentCurve) {
                this.currentCurve.currentlyCreating = false;
                this.currentCurve = null;
            }
            this.canvas.selectedCurve = null;
            this.canvas.selectedPoint = null;
        }
    }
}


class RotateTool extends SelectTool {
    constructor(canvas) {
        super(canvas, 'rotate');
        this.dragStart = null;
        this.lastAngle = null;
        this.rotationCenter = null;
        this.handleOriginalPosition = null;
    }

    onMouseDown(pos) {
        super.onMouseDown(pos)
        for (const curve of this.canvas.curves) {
            let collisionPoint = curve.isBoundingPointColliding(pos)
            if (collisionPoint) {
                this.dragStart = pos;
                this.canvas.selectedCurve = curve;
                curve.setSelected(true);

                this.rotationCenter = curve.getBoundingBoxCenter()
                this.lastAngle = this.getCurrentAngle(pos)
                this.handleOriginalPosition = collisionPoint;
            }
        }
    }

    onMouseMove(pos) {
        if (this.dragStart && this.rotationCenter) {
            let angle = this.getCurrentAngle(pos)

            let dAngle = angle - this.lastAngle;
            for (const point of this.canvas.selectedCurve.getPoints()) {
                point.move(this.rotationCenter.inverse())
                point.rotate(dAngle)
                point.move(this.rotationCenter)
            }
            this.lastAngle = angle
            this.dragStart = pos;
        } else {
            super.onMouseMove(pos)
        }
    }

    getCurrentAngle(pos) {
        let vector = pos.minus(this.rotationCenter);
        return math.atan2(vector.y, vector.x);
    }

    onMouseUp(pos) {
        super.onMouseUp(pos)
        this.rotationCenter = null;
        this.lastAngle = null;
    }

    draw(canvas) {
        super.draw(canvas, this.rotationCenter === null)
        if (this.dragStart && this.rotationCenter) {
            let centerSize = 5
            let centerStyle = {curve: { width: 2, color: "rgba(71,71,71,0.55)", dash: 0 }};
            canvas.drawCurve(getLinePoints(
                this.rotationCenter.plus(new Point(centerSize, 0)),
                this.rotationCenter.plus(new Point(-centerSize, 0))
            ), centerStyle)
            canvas.drawCurve(getLinePoints(
                this.rotationCenter.plus(new Point(0, centerSize)),
                this.rotationCenter.plus(new Point(0, -centerSize))
            ), centerStyle)

            let handleMagnitude = this.handleOriginalPosition.minus(this.rotationCenter).magnitude();
            let handleVector = new Point(1, 0).multiply(handleMagnitude).rotate(this.lastAngle)
            let handlePoint = this.rotationCenter.plus(handleVector)

            let handleSize = centerSize
            canvas.drawCurve(getLinePoints(
                handlePoint.plus(new Point(handleSize, 0).rotate(Math.PI / 4)),
                handlePoint.plus(new Point(-handleSize, 0).rotate(Math.PI / 4))
            ), centerStyle)
            canvas.drawCurve(getLinePoints(
                handlePoint.plus(new Point(0, handleSize).rotate(Math.PI / 4)),
                handlePoint.plus(new Point(0, -handleSize).rotate(Math.PI / 4))
            ), centerStyle)
        }
    }
}


class ScaleTool extends SelectTool {
    constructor(canvas) {
        super(canvas, 'scale');
        this.dragStart = null;
        this.scaleAnchorPoint = null;
        this.scaleDirections = null;
        this.lastBoundingBox  = null;
    }

    onMouseDown(pos) {
        super.onMouseDown(pos)

        for (const curve of this.canvas.curves) {
            let boundingBoxCollisionPoint = this.getBoundingBoxAndEdgesCollision(curve, pos)
            if (boundingBoxCollisionPoint || curve.isCurveColliding(pos)) {
                this.canvas.selectedCurve = curve;
                curve.setSelected(true);
            }
            if (boundingBoxCollisionPoint) {
                this.dragStart = pos;

                this.lastBoundingBox = curve.getBoundingBox();
                this.scaleAnchorPoint = this.getOppositeBoundingPoint(boundingBoxCollisionPoint, curve);
                this.scaleDirections = this.getScaleDirections(curve, this.scaleAnchorPoint, boundingBoxCollisionPoint);

                this.canvas.setCursorStyle('nesw-resize')
                break;
            }
        }
    }

    getBoundingBoxAndEdgesCollision(curve, pos) {
        for (const point of [...curve.getBoundingBox(), ...curve.getBoundingBoxEdges()]) {
            if (point.isCollidingWith(pos)) {
                return point;
            }
        }
        return null;
    }

    getScaleDirections(curve, anchor, point) {
        let cornerPoint = curve.getBoundingBox().indexOf(point) !== -1
        if (cornerPoint) {
            return [1, 1]
        }

        let diff = anchor.minus(point);
        return [
            diff.x !== 0,
            diff.y !== 0
        ];
    }

    getOppositeBoundingPoint(pos, curve) {
        let center = curve.getBoundingBoxCenter();
        let vector = pos.minus(center)
        return center.plus(vector.inverse())
    }

    onMouseMove(pos) {
        if (this.dragStart && this.scaleAnchorPoint) {
            const anchor = this.scaleAnchorPoint;
            const originalVector = this.dragStart.minus(anchor);
            const currentVector = pos.minus(anchor);

            const lambda1 = currentVector.x / (originalVector.x === 0 ? 1 : originalVector.x);
            const lambda2 = currentVector.y / (originalVector.y === 0 ? 1 : originalVector.y);

            for (const point of this.canvas.selectedCurve.getPoints()) {
                point.move(this.scaleAnchorPoint.inverse())
                point.scale([
                    this.scaleDirections[0] ? lambda1 : 1,
                    this.scaleDirections[1] ? lambda2 : 1
                ])
                point.move(this.scaleAnchorPoint)
            }
            this.lastBoundingBox = this.canvas.selectedCurve.getBoundingBox();
            this.dragStart = pos;
        } else {
            super.onMouseMove(pos)
        }
    }

    onMouseUp(pos) {
        super.onMouseUp(pos)
        this.scaleAnchorPoint = null;
        this.scaleDirections = null;
        this.lastBoundingBox = null;
    }

    draw(canvas) {
        super.draw(canvas);

        let curve = this.canvas.selectedCurve
        if (!curve) {
            return;
        }
        if (curve.selected && !curve.currentlyCreating) {
            let edges = curve.getBoundingBoxEdges()
            canvas.drawVertices(edges)
        }
    }
}