const pointBaseStyle = {
    point: { radius: 10, width: 2, color: "#4e4e4e", fill: "rgba(200,200,200,0.5)", arc1: 0, arc2: 2 * Math.PI }
}
const pointSelectedStyle = {
    point: { radius: 10, width: 4, color: "#393838", fill: "rgba(200,200,200,0.5)", arc1: 0, arc2: 2 * Math.PI }
}

class Point {
    constructor(x, y, radius = 10) {
        this.x = x;
        this.y = y;
        this.radius = radius;
    }

    isCollidingWith(pos) {
        let dx = this.x - pos.x;
        let dy = this.y - pos.y;
        if ((dx * dx) + (dy * dy) < this.radius * this.radius) {
            return true;
        }
        return false;
    }

    clone() {
        return new Point(this.x, this.y)
    }

    set(point) {
        this.x = point.x;
        this.y = point.y;
    }

    plus(other) {
        return new Point(this.x + other.x, this.y + other.y);
    }

    minus(other) {
        return new Point(this.x - other.x, this.y - other.y);
    }

    multiply(scalar) {
        return new Point(this.x * scalar, this.y * scalar);
    }

    divide(scalar) {
        return new Point(this.x / scalar, this.y / scalar);
    }

    inverse() {
        return new Point(-this.x, -this.y)
    }

    distanceTo(other) {
        return math.sqrt(math.pow(this.x - other.x, 2) + math.pow(this.y - other.y, 2))
    }

    magnitude() {
        return this.distanceTo(new Point(0, 0))
    }

    normalize() {
        let magnitude = this.magnitude()
        return new Point(this.x / magnitude, this.y / magnitude);
    }

    sqrt() {
        return new Point(Math.sqrt(this.x), Math.sqrt(this.y));
    }

    abs() {
        return new Point(Math.abs(this.x), Math.abs(this.y));
    }

    static min(p1, p2) {
        return new Point(Math.min(p1.x, p2.x), Math.min(p1.y, p2.y));
    }

    static max(p1, p2) {
        return new Point(Math.max(p1.x, p2.x), Math.max(p1.y, p2.y));
    }

    rotate(angle) {
        let matrix = [
            [math.cos(angle), -math.sin(angle)],
            [math.sin(angle), math.cos(angle)]
        ];
        this.set(multiplyByMatrix(this, matrix));
        return this;
    }
}

class BezierPoint {
    constructor(guide1, point, guide2) {
        this.guide1 = guide1;
        this.point = point;
        this.guide2 = guide2;

        this.selected = false;
        this.guidesVisible = false;
        this.currentlyDrawing = false;
    }

    draw(canvas) {
        if (!this.currentlyDrawing) {
            canvas.drawVertices([this.point], this.selected ? pointSelectedStyle : pointBaseStyle, this.isSimplePoint());
        }
        if (this.guidesVisible) {
            for (const guide of this.getGuides()) {
                canvas.drawVertices([guide]);
                canvas.drawCurve(getLinePoints(this.point, guide));
            }
        }
    }

    getPathPoints() {
        let points = [];
        if (this.guide1) {
            points.push(this.guide1)
        }
        points.push(this.point)
        if (this.guide2) {
            points.push(this.guide2)
        }
        return points;
    }

    getGuides() {
        let guides = []
        if (this.guide1) {
            guides.push(this.guide1)
        }
        if (this.guide2) {
            guides.push(this.guide2)
        }
        return guides;
    }

    getCollisionDetectionPoints() {
        if (!this.guidesVisible) {
            return [this.point];
        }
        return [...this.getGuides(), this.point];
    }

    isCollidingWith(pos) {
        for (const pathPoint of this.getCollisionDetectionPoints()) {
            if (pathPoint.isCollidingWith(pos)) {
                return pathPoint;
            }
        }
        return null;
    }

    copyGuideVector(originalGuide, copyGuide, lockLength) {
        let vector = originalGuide.minus(this.point)

        if (lockLength) {
            copyGuide.set(this.point.plus(vector.inverse()))
        } else {
            let copyVector = copyGuide.minus(this.point)
            let copyMagnitude = copyVector.magnitude()
            if (vector.magnitude() <= 0) {
                return;
            }
            let inverted = vector.inverse()
            let invertedNormalized = inverted.normalize()
            let scaled = invertedNormalized.multiply(copyMagnitude)
            copyGuide.set(this.point.plus(scaled))
        }
    }

    setSelected(selected) {
        this.selected = selected;
        this.guidesVisible = selected;
    }

    setGuidesVisible(visible) {
        this.guidesVisible = visible;
    }

    move(diff) {
        for (const point of this.getPathPoints()) {
            point.set(point.plus(diff))
        }
    }

    rotate(angle) {
        for (const point of this.getPathPoints()) {
            point.rotate(angle);
        }
    }
    scale(lambdas) {
        for (const point of this.getPathPoints()) {
            let matrix = [
                [lambdas[0], 0],
                [0, lambdas[1]]
            ];
            point.set(multiplyByMatrix(point, matrix));
        }
    }

    isSimplePoint() {
        return !this.guide1 && !this.guide2
    }

    isMissingGuide() {
        return !this.guide1 || !this.guide2
    }
}

class Curve {
    constructor(color, points = []) {
        this.color = color
        this.points = points;
        this.selected = false;
        this.currentlyCreating = false;

        this.curveCollisionRadius = 10;
        this.drawPointsPerSegment = 2000;
    }

    draw(canvas, tool) {
        let bezierPoints = this.getCompositeBezierCurvePoints(this.getPoints())
        let width = this.selected ? 4 : 2;
        canvas.drawCurve(bezierPoints, {curve: {width: width, color: this.color}});

        if (this.selected && !tool.hidePoints()) {
            for (const point of this.points) {
                point.draw(canvas)
            }
        }
    }

    getPathPoints() {
        return this.points.map((p) => p.getPathPoints()).flat();
    }

    getPoints() {
        return this.points;
    }

    addPoint(point) {
        this.points.push(point)
    }

    isPointColliding(pos) {
        for (const bezierPoint of this.points) {
            let pathPointCollision = bezierPoint.isCollidingWith(pos)
            if (pathPointCollision) {
                return {
                    bezierPoint: bezierPoint,
                    pathPoint: pathPointCollision
                };
            }
        }
        return null;
    }

    isBoundingPointColliding(pos) {
        for (const point of this.getBoundingBox()) {
            if (point.isCollidingWith(pos)) {
                return point;
            }
        }
        return null;
    }

    isCurveColliding(pos) {
        let drawPoints = this.getCompositeBezierCurvePoints(this.getPoints())
        for (let i = 0; i < drawPoints.length; i++) {
            let point = drawPoints[i];
            if (new Point(point.x, point.y).distanceTo(pos) < this.curveCollisionRadius) {
                let segmentsCount = this.getPoints().length - 1;
                let index = Math.floor(i / this.drawPointsPerSegment)
                let startT = index / segmentsCount;
                return {
                    point: point,
                    segmentIndex: index,
                    t: ((i / drawPoints.length) - startT) * segmentsCount,
                };
            }
        }
        return null;
    }

    setSelected(selected) {
        this.selected = selected;
        if (!selected) {
            for (const point of this.points) {
                point.setSelected(false)
            }
        }
    }

    selectPoint(point, selected, selectNeighbors = true) {
        const i = this.points.indexOf(point);
        if (i === -1) {
            throw new Error("Point not on this curve")
        }
        point.setSelected(selected)
        if (!this.currentlyCreating && selectNeighbors) {
            // Highlight neighboring guides
            if (i > 0) {
                this.points[i - 1].setGuidesVisible(selected);
            }
            if (i < this.points.length - 1) {
                this.points[i + 1].setGuidesVisible(selected);
            }
        }
    }

    getCompositeBezierCurvePoints(points) {
        if (points.length === 0) {
            return [];
        } else if (points.length === 1) {
            return [points[0].point]
        }

        let pathPoints = this.convertBezierPointsToPathPoints(points)

        let resPoints = [];
        for (let i = 0; i < Math.floor(pathPoints.length / 3); i++) {
            let index = i * 3;
            resPoints.push(...this.getSingleBezierCurvePoints(pathPoints.slice(index, index + 4)))
        }
        return resPoints;
    }

    convertBezierPointsToPathPoints(points) {
        let pathPoints = [];
        for (const point of points) {
            if (!point.guide1) {
                pathPoints.push(point.point)
            } else {
                pathPoints.push(point.guide1)
            }
            pathPoints.push(point.point)
            if (!point.guide2) {
                pathPoints.push(point.point)
            } else {
                pathPoints.push(point.guide2)
            }
        }
        return pathPoints.slice(1, -1);
    }

    getSingleBezierCurvePoints(points) {
        return getCurvePoints(
            (t) => this.getBezierCurvePoint(points, t).x,
            (t) => this.getBezierCurvePoint(points, t).y,
            1,
            1 / this.drawPointsPerSegment
        )
    }

    getBezierCurvePoint(points, t) {
        let x = 0, y = 0;
        for (let i = 0; i < points.length; i++) {
            let bernstein = this.getBernsteinPolynomialValue(points.length - 1, i, t);
            x += points[i].x * bernstein
            y += points[i].y * bernstein
        }
        return { x: x, y: y }
    }

    getBernsteinPolynomialValue(n, i, t) {
        let combination = math.combinations(n, i)
        return combination * math.pow(t, i) * math.pow(1 - t, n - i);
    }

    move(diff) {
        for (const point of this.points) {
            point.move(diff)
        }
    }

    getBoundingBox() {
        let pathPoints = this.convertBezierPointsToPathPoints(this.points)
        if (this.points.length <= 1) {
            return [0, 0, 0, 0]
        }

        let bounds = [math.Infinity, math.Infinity, -math.Infinity, -math.Infinity];
        for (let i = 0; i < Math.floor(pathPoints.length / 3); i++) {
            let index = i * 3;
            let currentBounds = this.boundingBoxSingleSegment(
                ...pathPoints.slice(index, index + 4)
            )
            bounds[0] = math.min(currentBounds[0], bounds[0])
            bounds[1] = math.min(currentBounds[1], bounds[1])
            bounds[2] = math.max(currentBounds[2], bounds[2])
            bounds[3] = math.max(currentBounds[3], bounds[3])
        }
        let a = new Point(bounds[0], bounds[1]);
        let b = new Point(bounds[0], bounds[3]);
        let c = new Point(bounds[2], bounds[3]);
        let d = new Point(bounds[2], bounds[1]);
        return [a, b, c, d];
    }

    /**
     * Based on https://iquilezles.org/articles/bezierbbox/
     */
    boundingBoxSingleSegment(p0, p1, p2, p3) {
        let mi = Point.min(p0, p3);
        let ma = Point.max(p0, p3);

        const c = p1.minus(p0);
        const b = p2.minus(p1.multiply(2)).plus(p0);
        const a = p3.minus(p2.multiply(3)).plus(p1.multiply(3)).minus(p0);

        const h = new Point(
            b.x * b.x - a.x * c.x,
            b.y * b.y - a.y * c.y
        );

        if (h.x > 0 || h.y > 0) {
            const g = h.abs().sqrt()

            const computeT = (bCoord, gCoord, aCoord) => {
                const t1 = clamp((-bCoord - gCoord) / aCoord, 0, 1);
                const t2 = clamp((-bCoord + gCoord) / aCoord, 0, 1);
                return [t1, t2];
            };

            const [t1x, t2x] = computeT(b.x, g.x, a.x);
            const [t1y, t2y] = computeT(b.y, g.y, a.y);

            const evalBezier = (t, axis) => {
                const s = 1 - t;
                return (
                    s * s * s * p0[axis] +
                    3 * s * s * t * p1[axis] +
                    3 * s * t * t * p2[axis] +
                    t * t * t * p3[axis]
                );
            };

            if (h.x > 0) {
                const q1x = evalBezier(t1x, 'x');
                const q2x = evalBezier(t2x, 'x');
                mi.x = Math.min(mi.x, Math.min(q1x, q2x));
                ma.x = Math.max(ma.x, Math.max(q1x, q2x));
            }

            if (h.y > 0) {
                const q1y = evalBezier(t1y, 'y');
                const q2y = evalBezier(t2y, 'y');
                mi.y = Math.min(mi.y, Math.min(q1y, q2y));
                ma.y = Math.max(ma.y, Math.max(q1y, q2y));
            }
        }
        return [mi.x, mi.y, ma.x, ma.y];
    }

    getBoundingBoxEdges() {
        let bounds = this.getBoundingBox();
        return [
            bounds[0].plus(bounds[1]).divide(2),
            bounds[1].plus(bounds[2]).divide(2),
            bounds[2].plus(bounds[3]).divide(2),
            bounds[3].plus(bounds[0]).divide(2)
        ]
    }

    getBoundingBoxCenter() {
        let bounds = this.getBoundingBox();
        return bounds[0].plus(bounds[2]).divide(2)
    }
}