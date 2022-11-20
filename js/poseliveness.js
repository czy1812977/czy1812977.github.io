let down_pose=0,left_pose=0,right_pose=0,shake_pose=0,eye_count=0,mouth_count=0,blink=0,close_pose=0
const detector_list=create_random_list(2)
let max_ear=0;
function count_euclidean(point1,point2){
    return math.sqrt(math.pow((point1.x-point2.x),2)+math.pow((point1.y-point2.y),2))
}
function create_random_list(num,list=4){
    let arr = [];
    let json = {};
    while (arr.length < num) {
        let ranNum = Math.floor((Math.random() * list));
        if (!json[ranNum]) {
            json[ranNum] = 1;
            arr.push(ranNum)
        }
    }
    return arr;
}
function pose_detection(detection,index){
    let mar=mouth_aspect_ratio(detection.landmarks.getMouth())
    let ear=math.evaluate((eye_aspect_ratio(detection.landmarks.getLeftEye())+eye_aspect_ratio(detection.landmarks.getRightEye()))/2)

    if(detector_list[index]===0){
        text.innerText="请点头"
        down_pose=nod_detection(detection.angle.pitch,down_pose)
        if(down_pose===2){
            index+=1;
        }
    }
    else if(detector_list[index]===1){
        text.innerText="请摇头"
        let flags=shake_detection(detection.angle.yaw,left_pose,right_pose,shake_pose)
        left_pose=flags.left
        right_pose=flags.right
        shake_pose=flags.shake
        if(shake_pose===1){
            index+=1;
        }
    }
    else if(detector_list[index]===2){
        text.innerText="请眨眼睛"
        max_ear=math.max(ear,max_ear)
        let flags=blink_detection(ear,eye_count,blink,max_ear*0.9)
        eye_count=flags.count
        blink=flags.blink
        if(blink===1){
            index+=1;
        }
    }
    else if(detector_list[index]===3){
        text.innerText="请张嘴"
        let flags=mouth_detection(mar,mouth_count,close_pose)
        mouth_count=flags.count
        close_pose=flags.close
        if(close_pose===1){
            index+=1;
        }
    }
    return index
}

function eye_aspect_ratio(eye){
    let A=count_euclidean(eye[1],eye[5])
    let B=count_euclidean(eye[2],eye[4])
    let C=count_euclidean(eye[0],eye[3])
    return math.evaluate((A+B)/(2*C))
}

function mouth_aspect_ratio(mouth){
    let A=count_euclidean(mouth[2],mouth[9])
    let B=count_euclidean(mouth[4],mouth[7])
    let C=count_euclidean(mouth[0],mouth[6])
    return math.evaluate((A+B)/(2*C))

}

function nod_detection(pitch,down,threshold=3.5){
    if(((pitch)<=(-2*threshold))&&down===0){
        down+=1
    }
    if((down!==0)&&(pitch>=threshold)){
        down+=1
    }
    return down
}

function shake_detection(yaw,left,right,shake,threshold=35){

    if(yaw>threshold){
        left+=1;
    }
    if(yaw<-threshold){
        right+=1;
    }
    if(left!==0&&right!==0){
        shake+=1;
    }
    return{left:left,right:right,shake:shake}
}

function blink_detection(ear,count,blink,threshold=-0.27,frame=3){
    if( ear<threshold){
        count+=1;
    }
    else {
        if(count>=frame){
            blink+=1;
        }
        count=0;
    }
    return{count:count,blink:blink}
}
function mouth_detection(mar,count,close,threshold=0.65,frame=2){
    if( mar<threshold){
        count+=1;
    }
    else {
        if(count>=frame){
            close+=1;
        }
        count=0;
    }
    return{count:count,close:close}
}