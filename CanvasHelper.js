function getRectPoints(a, b, c, d) {
    let points = []
    points.push(...getLinePoints(a, b));
    points.push(...getLinePoints(b, c));
    points.push(...getLinePoints(c, d));
    points.push(...getLinePoints(d, a));
    return points;
}

function getLinePoints(a, b) {
    return [a, b]
}

function getCurvePoints(xF, yF, max = 1, step = 0.001) {
    let points = [];
    for (let t = 0; t < max; t += step) {
        let point = {
            x: xF(t),
            y: yF(t)
        }
        points.push(point);
    }
    return points;
}

const lerp = (x, y, a) => x * (1 - a) + y * a;
const clamp = (a, min = 0, max = 1) => Math.min(max, Math.max(min, a));
const invlerp = (x, y, a) => clamp((a - x) / (y - x));
const range = (x1, y1, x2, y2, a) => lerp(x2, y2, invlerp(x1, y1, a));

function saveToFile(text, name, type) {
    var a = document.createElement("a");
    var file = new Blob([text], {type: type});
    a.href = URL.createObjectURL(file);
    a.download = name;
    a.click();
}

function readSingleFile(event, onResult) {
    let file = event.target.files[0];
    if (!file) {
        return;
    }

    let reader = new FileReader();
    reader.onload = function(e) {
        let contents = e.target.result;
        onResult(contents);
    };
    reader.readAsText(file);
}

function multiplyByMatrix(point, matrix) {
    const mathMatrix = math.matrix(matrix);
    const pointAsArray = [point.x, point.y];
    const result = math.multiply(mathMatrix, pointAsArray); // result is a matrix!
    return new Point(result.get([0]), result.get([1]));
}