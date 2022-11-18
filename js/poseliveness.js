let down_pose=0,left_pose=0,right_pose=0,shake_pose=0,eye_count=0,mouth_count=0,blink=0,close_pose=0
const detector_list=create_random_list(2)
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
function pose_detection(landmarks,index,width){
    let mar=mouth_aspect_ratio(landmarks.getMouth())
    let ear=math.evaluate((eye_aspect_ratio(landmarks.getLeftEye())+eye_aspect_ratio(landmarks.getRightEye()))/2)
    let njd=nose_jaw_distance(landmarks.getNose(),landmarks.getJawOutline())
    let ebd=eyebrow_jaw_distance(landmarks.getLeftEye(),landmarks.getJawOutline())
    if(detector_list[index]===0){
        text.innerText="请点头"
        down_pose=nod_detection(width,ebd,down_pose)
        if(down_pose===2){
            index+=1;
        }
    }
    else if(detector_list[index]===1){
        text.innerText="请摇头"
        let flags=shake_detection(width,njd,left_pose,right_pose,shake_pose)
        left_pose=flags.left
        right_pose=flags.right
        shake_pose=flags.shake
        if(shake_pose===1){
            index+=1;
        }
    }
    else if(detector_list[index]===2){
        text.innerText="请眨眼睛"
        let flags=blink_detection(width,ear,eye_count,blink)
        eye_count=flags.count
        blink=flags.blink
        if(blink===1){
            index+=1;
        }
    }
    else if(detector_list[index]===3){
        text.innerText="请张嘴"
        let flags=mouth_detection(width,mar,mouth_count,close_pose)
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

function nose_jaw_distance(nose,jaw){
    let face_left1=count_euclidean(nose[0],jaw[0])
    let face_right1 = count_euclidean(nose[0], jaw[16])
    let face_left2 = count_euclidean(nose[3], jaw[2])
    let face_right2 = count_euclidean(nose[3], jaw[14])
    return [face_left1,face_right1,face_left2,face_right2]

}
function eyebrow_jaw_distance(Eyebrow, jaw){
    let eyebrow_left = count_euclidean(Eyebrow[2], jaw[0])
    let eyebrow_right = count_euclidean(Eyebrow[2], jaw[16])
    let left_right = count_euclidean(jaw[0], jaw[16])
    return [eyebrow_left, eyebrow_right, left_right]
}

function nod_detection(width,ebd,down,threshold=-3.5){
    console.log(ebd[2]-ebd[1]-ebd[0])
    if(((ebd[2]-ebd[1]-ebd[0])>=threshold)&&down===0){
        down+=1
    }
    if((down!==0)&&((ebd[2]-ebd[1]-ebd[0])<=(2*threshold))){
        down+=1
    }
    return down
}

function shake_detection(width,njd,left,right,shake,threshold=35){
    console.log(njd[0]-njd[1])
    if(((njd[0]-njd[1])>=threshold)&&((njd[2]-njd[3])>=threshold)){
        left+=1;
    }
    if(((njd[0]-njd[1])<=-threshold)&&((njd[2]-njd[3])<=-threshold)){
        right+=1;
    }
    if(left!==0&&right!==0){
        shake+=1;
    }
    return{left:left,right:right,shake:shake}
}

function blink_detection(width,ear,count,blink,threshold=0.28,frame=2){
    console.log(ear)
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
function mouth_detection(width,mar,count,close,threshold=0.50,frame=2){
    console.log(mar)
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