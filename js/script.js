const video = document.getElementById('video')
const text = document.getElementById('text')
const trackSuccess = new Event('trackSuccess');
let start_flag = 0;
let params
let pose_index = 0
let flag1 = true;
let flag2 = true;
let flag3 = true, flag4 = true, flag5 = true, flag6 = true, flag7 = true, flag8 = true, flag9 = true;
let offset = [{x: 0, y: 0}, {x: 0, y: 0}]
let B_r_images, B_g_images, B_b_images, r_images, g_images, b_images;
const Fail = new Event('Fail');
const start_Diff = new Event('start_Diff')
let times = 0
import * as faceapi from '/js/face-api.esm.js';
const modelPath = '/models/'
// const modelPath = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
const minScore = 0.2; // minimum score
const maxResults = 5; // maximum number of results to return
let optionsSSDMobileNet;

function str(json) {
    let text = '<font color="lightblue">';
    text += json ? JSON.stringify(json).replace(/{|}|"|\[|\]/g, '').replace(/,/g, ', ') : '';
    text += '</font>';
    return text;
}

// helper function to print strings to html document as a log
function log(...txt) {
    console.log(...txt); // eslint-disable-line no-console
    const div = document.getElementById('log');
    if (div) div.innerHTML += `<br>${txt}`;
}

// helper function to draw detected faces
function drawFaces(canvas, data, fps) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // draw title
    ctx.font = 'small-caps 20px "Segoe UI"';
    ctx.fillStyle = 'white';
    ctx.fillText(`FPS: ${fps}`, 10, 25);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'deepskyblue';
    ctx.fillStyle = 'deepskyblue';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.rect(data.detection.box.x, data.detection.box.y, data.detection.box.width, data.detection.box.height);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // draw text labels
    ctx.fillStyle = 'black';
    ctx.fillText(`roll:${data.angle.roll}° pitch:${data.angle.pitch}° yaw:${data.angle.yaw}°`, data.detection.box.x, data.detection.box.y - 5);
    ctx.fillStyle = 'lightblue';
    ctx.fillText(`roll:${data.angle.roll}° pitch:${data.angle.pitch}° yaw:${data.angle.yaw}°`, data.detection.box.x, data.detection.box.y - 6);

}

async function detectVideo(video, canvas) {
    if (!video || video.paused) return false;
    const t0 = performance.now();
    faceapi.matchDimensions(canvas,{width:video.width,height:video.height})
    faceapi
        .detectSingleFace(video, optionsSSDMobileNet)
        .withFaceLandmarks()
        .then((result) => {
            let resizedResult=faceapi.resizeResults(result,{width:video.width,height:video.height})
            const fps = 1000 / (performance.now() - t0);
            if (flag1 && isNaN(result)) {
                video.dispatchEvent(trackSuccess);
                flag1 = false
            }
            if (start_flag === 1) {
                // if (times > 200) {
                //     alert("活体检测超时")
                //     video.dispatchEvent(Fail);
                //
                // }
                if (pose_index <= 1) {
                    pose_index = pose_detection(resizedResult, pose_index)
                    times += 1
                }
                if (pose_index === 2) {
                    times = 0
                    start_flag = -1
                    text.innerHTML = "动作检测完成,请保持头部静止"
                    setTimeout(() => {
                        video.dispatchEvent(start_Diff);
                        flag2 = false;
                    }, 1000)
                }
            }
            if (flag3 && (!flag2)) {
                flag3 = false;
                B_r_images = cutFaceAndEyes(resizedResult, offset, video, 'R');
                B_g_images = cutFaceAndEyes(resizedResult, offset, video, 'G');
                B_b_images = cutFaceAndEyes(resizedResult, offset, video, 'B');
                setTimeout(() => {
                    flag4 = false
                }, 3000)
            }
            if (flag5 && (!flag4)) {
                flag5 = false;
                r_images = cutFaceAndEyes(resizedResult, offset, video, 'R');
                setTimeout(() => {
                    flag6 = false
                }, 1000)

            }
            if (flag7 && (!flag6)) {
                flag7 = false;
                g_images = cutFaceAndEyes(resizedResult, offset, video, 'G');
                setTimeout(() => {
                    flag8 = false
                }, 1000)

            }
            if (flag9 && (!flag8)) {
                flag9 = false;
                b_images = cutFaceAndEyes(resizedResult, offset, video, 'B');
                setTimeout(() => {
                    let score_r = runSVM(calcFeat(r_images, B_r_images),params)
                    let score_g = runSVM(calcFeat(g_images, B_g_images),params)
                    let score_b = runSVM(calcFeat(b_images, B_b_images),params)
                    console.log(score_b)
                    console.log(score_g)
                    console.log(score_r)
                    if (math.min(score_r, score_g, score_b) < -2.5 && math.max(score_r, score_g, score_b) < -0.5) {
                        video.dispatchEvent(Fail);
                    } else {
                        text.innerHTML = "活体检测成功";
                        document.body.style.background = 'hsl(200,20%,20%)';
                    }
                }, 1000)
            }
            drawFaces(canvas, resizedResult, fps.toLocaleString());
            requestAnimationFrame(() => detectVideo(video, canvas));
            return true;
        })
        .catch((err) => {
            console.log(err)
            requestAnimationFrame(() => detectVideo(video, canvas));
            return false;
        });
    return false;
}

// just initialize everything and call main function
async function setupCamera() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    if (!video || !canvas) return null;

    log('Setting up camera');
    // setup webcam. note that navigator.mediaDevices requires that page is accessed via https
    if (!navigator.mediaDevices) {
        log('Camera Error: access not supported');
        return null;
    }
    let stream;
    const constraints = {audio: false, video: {facingMode: 'user', resizeMode: 'crop-and-scale'}};
    if (window.innerWidth > window.innerHeight) constraints.video.width = {ideal: window.innerWidth/2};
    else constraints.video.height = {ideal: window.innerHeight/3};
    try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
        if (err.name === 'PermissionDeniedError' || err.name === 'NotAllowedError') log(`Camera Error: camera permission denied: ${err.message || err}`);
        if (err.name === 'SourceUnavailableError') log(`Camera Error: camera not available: ${err.message || err}`);
        return null;
    }
    if (stream) video.srcObject = stream;
    else {
        log('Camera Error: stream empty');
        return null;
    }
    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    if (settings.deviceId) delete settings.deviceId;
    if (settings.groupId) delete settings.groupId;
    if (settings.aspectRatio) settings.aspectRatio = Math.trunc(100 * settings.aspectRatio) / 100;
    log(`Camera active: ${track.label}`);
    log(`Camera settings: ${str(settings)}`);
    canvas.addEventListener('click', () => {
        if (video && video.readyState >= 2) {
            if (video.paused) {
                video.width = video.videoWidth;
                video.height = video.videoHeight;
                video.play();
                detectVideo(video, canvas);
            } else {
                video.pause();
            }
        }
        log(`Camera state: ${video.paused ? 'paused' : 'playing'}`);
    });
    return new Promise((resolve) => {
        video.onloadeddata = async () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            video.width = video.videoWidth;
            video.height = video.videoHeight;
            video.play();
            detectVideo(video, canvas);
            resolve(true);
        };
    });
}

async function setupFaceAPI() {
    // load face-api models
    // log('Models loading');
    // await faceapi.nets.tinyFaceDetector.load(modelPath); // using ssdMobilenetv1
    await faceapi.nets.ssdMobilenetv1.load(modelPath);
    await faceapi.nets.faceLandmark68Net.load(modelPath);
    optionsSSDMobileNet = new faceapi.SsdMobilenetv1Options({minConfidence: minScore, maxResults});
    // check tf engine state
    log(`Models loaded: ${str(faceapi.tf.engine().state.numTensors)} tensors`);
}

video.addEventListener('trackSuccess', () => {
    text.innerHTML = "请按照提示完成动作";
    setTimeout(() => {
        start_flag = 1
    }, 2000)
})
video.addEventListener('start_Diff', () => {
    setTimeout(() => {
        text.innerHTML = "屏幕将高亮三秒";
    }, 1500);
    setTimeout(() => {
        text.innerHTML = "3";
        text.style.color = 'white'
        document.body.style.background = 'hsl(0,100%,50%)';
    }, 3500);
    setTimeout(() => {
        text.innerHTML = "2"
        document.body.style.background = 'hsl(120,100%,50%)';
    }, 4500);
    setTimeout(() => {
        text.innerHTML = "1"
        document.body.style.background = 'hsl(240,100%,50%)';
    }, 5500);
    setTimeout(() => {
        text.innerHTML = "正在进行活体检测"
    }, 6500);
})
video.addEventListener('Fail', () => {
    setTimeout(() => {
        text.innerHTML = "活体检测失败";
        document.body.style.background = 'hsl(200,20%,20%)';
    }, 1000)

})

window.onload = async function () {
    log('Live_Detection WebCam Test');
    await faceapi.tf.setBackend('webgl');
    await faceapi.tf.ready();
    const url = "/models/SV.json";/*json文件url，本地的就写本地的位置，如果是服务器的就写服务器的路径*/
    const request = new XMLHttpRequest();
    request.open("get", url);/*设置请求方法与路径*/
    request.send(null);/*不发送数据到服务器*/
    request.onload = function () {/*XHR对象获取到返回信息后执行*/
        if (request.status === 200) {/*返回状态为200，即为数据获取成功*/
            params = JSON.parse(request.responseText);
        }
    }
    // log(`Version: FaceAPI ${str(faceapi?.version || '(not loaded)')} TensorFlow/JS ${str(faceapi?.tf?.version_core || '(not loaded)')} Backend: ${str(faceapi?.tf?.getBackend() || '(not loaded)')}`);
    await setupFaceAPI();
    await setupCamera();
}