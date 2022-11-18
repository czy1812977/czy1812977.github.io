function cutFaceAndEyes(resizedDetection, offset, video, plane) {
    let cap = new cv.VideoCapture(video);
    let src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
    let img;
    let box = resizedDetection.detection.box;
    let landmarks = resizedDetection.landmarks;
    let leftEye = landmarks.getLeftEye()
    let rightEye = landmarks.getRightEye()
    console.log(box)
    console.log(landmarks)
    console.log( leftEye)
    console.log(rightEye)
    leftEye.splice(3, 1);
    leftEye.splice(0, 1);
    rightEye.splice(3, 1);
    rightEye.splice(0, 1);
    let leftContre = getCrossPoint(leftEye);
    let rightContre = getCrossPoint(rightEye);
    let leftWidth = getWidth(leftEye, leftContre);
    let rightWidth = getWidth(rightEye, rightContre);
    let left;
    let right;
    cap.read(src);
    console.log(src)
    let rgbaPlanes = new cv.MatVector();
    cv.split(src, rgbaPlanes)
    let R = rgbaPlanes.get(0);
    let G = rgbaPlanes.get(1);
    let B = rgbaPlanes.get(2);
    if (plane === 'R') {
        img = R;
    } else if (plane === 'G') {
        img = G;
    } else if (plane === 'B') {
        img = B;
    } else {
        let dst = new cv.Mat(video.height, video.width, cv.CV_8UC1);
        cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
        img = dst
    }
    console.log(img)
    let FaceRect = new cv.Rect(box.x, box.y, box.width, box.height);
    let LeftRect = new cv.Rect(leftContre.x + offset[0].x, leftContre.y + offset[0].y, leftWidth, leftWidth);
    let RightRect = new cv.Rect(rightContre.x + offset[1].x, rightContre.y + offset[1].y, rightWidth, rightWidth);
    left = img.roi(LeftRect);
    right = img.roi(RightRect);
    img = img.roi(FaceRect);
    let face_mat = cvMat2mathMat({face: img, leftEye: left, rightEye: right})
    let mF = gaussianBlur(face_mat.face).resize([100, 100])
    let mL = gaussianBlur(face_mat.leftEye).resize([40, 40])
    let mR = gaussianBlur(face_mat.rightEye).resize([40, 40])
    src.delete();
    return {face: mF, leftEye: mL, rightEye: mR}
}

function cvMat2mathMat(cvList) {
    let mF = math.matrix(Array.from(cvList.face.data))
    let mL = math.matrix(Array.from(cvList.leftEye.data));
    let mR = math.matrix(Array.from(cvList.rightEye.data));
    math.reshape(mF, cvList.face.matSize);
    math.reshape(mL, cvList.leftEye.matSize);
    math.reshape(mR, cvList.rightEye.matSize);
    return {face: mF, leftEye: mL, rightEye: mR}
}

function gaussianBlur(src, sigma = 0.5) {
    const width = src.size()[0]
    const height = src.size()[1]
    let dest = math.zeros(width, height)
    const radius = Math.ceil(sigma * 2) * 2 + 1 // kernel size
    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
            let accumulation = 0
            let weightSum = 0
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    const x = Math.min(width - 1, Math.max(0, i + dx))
                    const y = Math.min(height - 1, Math.max(0, j + dy))
                    // calc weight
                    const weight =
                        math.exp(
                            -(math.pow(dx, 2) + math.pow(dy, 2)) / (2 * math.pow(sigma, 2))
                        ) /
                        (math.PI * 2 * math.pow(sigma, 2))
                    accumulation += src.get([x, y]) * weight
                    weightSum += weight
                }
            }
            dest.set([i, j], accumulation / weightSum)
        }
    }
    return dest
}

function getCrossPoint(posList) {
    let a = posList[0];
    let b = posList[2];
    let c = posList[1];
    let d = posList[3];
    var denominator = (b.y - a.y) * (d.x - c.x) - (a.x - b.x) * (c.y - d.y);
// 线段所在直线的交点坐标 (x , y)
    var x = ((b.x - a.x) * (d.x - c.x) * (c.y - a.y)
        + (b.y - a.y) * (d.x - c.x) * a.x
        - (d.y - c.y) * (b.x - a.x) * c.x) / denominator;
    var y = -((b.y - a.y) * (d.y - c.y) * (c.x - a.x)
        + (b.x - a.x) * (d.y - c.y) * a.y
        - (d.x - c.x) * (b.y - a.y) * c.y) / denominator;
    return {x: x, y: y}

}

function getWidth(posList, contre) {
    let sum_x = 0, sum_y = 0;
    for (let i = 0; i < posList.length; i++) {
        sum_x += Math.abs(posList[i].x - contre.x);
        sum_y += Math.abs(posList[i].x - contre.y);
    }
    return Math.min(sum_x / 2, sum_y / 2)
}


function calcDiff(Flash, Background) {
    let feat = math.evaluate('(a-b)./(a+b)', {a: Flash, b: Background});

    feat.forEach(function (value, index, matrix) {
        if (isNaN(value)) {
            matrix.set(index, 0);
        }
    })
    let feat_vec = feat.reshape([1, feat.size()[0] * feat.size()[1]]);
    return feat_vec.toArray()[0]

}

function calcFeat(flash, background) {
    let Ddiff = calcDiff(flash.face, background.face);
    let Dspec_right = calcDiff(flash.rightEye, background.rightEye).sort();
    let Dspec_left = calcDiff(flash.leftEye, background.leftEye).sort();
    let Dspec = [...Dspec_left, ...Dspec_right];
    return [...Dspec, ...Ddiff]
}

function runSVM(SpecDiff,params) {
    let Nsv = (params.coef).length
    let score_pool
    let decision_value = 0;
    for (let j = 0; j < Nsv; j++) {

        decision_value = decision_value + params.coef[j] * RBFkernel(params.SV[j][0], SpecDiff, params.gama)
    }

    score_pool = decision_value - params.rho;
    return score_pool
}

function RBFkernel(vec1, vec2, gama) {
    return math.exp(-gama * (math.dot(vec1, vec1) + math.dot(vec2, vec2) - 2 * math.dot(vec1, vec2)))
}