/* Nadi Budaya V10 browser camera runtime.
 * Webcam access and visual overlays run on the visitor's device, never on the Vercel server.
 * MediaPipe Tasks Vision and its model files are fetched from pinned public CDNs on first use.
 */
(() => {
  const FILTERS = [
    'iket','mahkota','kembang','topeng','ondel_merah','ondel_biru','abang','selendang',
    'mahkota_kembang','bando_emas','topeng_kembang','pita_merah','bunga_tanjung',
    'pucuk_rebung','mega_mendung','mahkota_bintang','none'
  ];
  const VARIATION = FILTERS.filter(x => x !== 'none');
  const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
  const POSE_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
  const CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';

  let visionModule = null;
  let video = null;
  let canvas = null;
  let ctx = null;
  let stream = null;
  let faceLandmarker = null;
  let poseLandmarker = null;
  let animationFrame = 0;
  let mode = 'stage';
  let selectedFilter = 'iket';
  let effectMode = 'same';
  let currentStep = 0;
  let lastVideoTime = -1;
  let lastDetectAt = 0;
  let status = {running:false, face_count:0, pose_detected:false, max_faces:4, error:'', dance_feedback:'Kamera belum aktif.'};
  let onStatus = () => {};
  let faceResults = null;
  let poseResults = null;
  let modelLoadError = '';
  let detectBusy = false;

  function notify(patch = {}) {
    status = {...status, ...patch};
    try { onStatus({...status}); } catch (_) {}
  }
  function point(face, index, width, height) {
    const p = face[index];
    return p ? {x:p.x * width, y:p.y * height} : {x:width/2,y:height/2};
  }
  function flower(c, x, y, size, palette = ['#9e3028','#dcae4c','#f7e7bd']) {
    c.save();
    for (let i=0;i<8;i++) {
      const a = i*Math.PI/4;
      c.beginPath(); c.ellipse(x+Math.cos(a)*size*.36,y+Math.sin(a)*size*.36,size*.25,size*.16,a,0,Math.PI*2);
      c.fillStyle = palette[i%palette.length]; c.fill();
    }
    c.beginPath();c.arc(x,y,size*.17,0,Math.PI*2);c.fillStyle='#f4d88a';c.fill();
    c.restore();
  }
  function drawBand(c, left, right, y, width, color, accent='#e8c76e') {
    c.save(); c.lineCap='round'; c.lineJoin='round';
    c.beginPath(); c.moveTo(left,y+width*.08); c.quadraticCurveTo((left+right)/2,y-width*.08,right,y+width*.08);
    c.strokeStyle='#173d32';c.lineWidth=width;c.stroke();
    c.beginPath(); c.moveTo(left,y+width*.08); c.quadraticCurveTo((left+right)/2,y-width*.08,right,y+width*.08);
    c.strokeStyle=color;c.lineWidth=width*.55;c.stroke();
    c.beginPath(); c.moveTo(left,y+width*.08); c.quadraticCurveTo((left+right)/2,y-width*.08,right,y+width*.08);
    c.strokeStyle=accent;c.lineWidth=Math.max(2,width*.09);c.stroke();
    flower(c,(left+right)/2,y,Math.max(12,width*.72)); c.restore();
  }
  function drawCrown(c, left, right, top, bottom, variant) {
    const mid=(left+right)/2, w=right-left;
    const palettes={
      mahkota:['#165946','#d6a447','#f7e5b1'], ondel_merah:['#a92e2a','#e4b54c','#f8e6bd'],
      ondel_biru:['#266c88','#e0b74f','#e7f0e8'], abang:['#273932','#d6aa55','#f1e0ae'],
      mahkota_kembang:['#b66b3b','#e2ba62','#fff0cf'], bando_emas:['#9a6f2b','#e9ca7b','#fff1c2'],
      mahkota_bintang:['#315640','#e7c15c','#fff0bd'], pucuk_rebung:['#1c5a49','#d8ae53','#f7e9c8']
    };
    const pal=palettes[variant]||palettes.mahkota;
    c.save(); c.beginPath();c.moveTo(left,bottom);c.lineTo(left+w*.06,top+w*.18);c.lineTo(mid-w*.17,top+w*.10);c.lineTo(mid,top);c.lineTo(mid+w*.17,top+w*.10);c.lineTo(right-w*.06,top+w*.18);c.lineTo(right,bottom);c.closePath();
    c.fillStyle=pal[0];c.fill();c.strokeStyle=pal[1];c.lineWidth=Math.max(3,w*.018);c.stroke();
    for(let i=0;i<5;i++){const x=left+w*(.13+i*.185);flower(c,x,top+w*.18,w*.055,[pal[1],pal[2], '#b63e31']);}
    c.restore();
  }
  function drawAccessory(c, face, name, width, height) {
    if (!face || name==='none') return;
    const leftP=point(face,127,width,height), rightP=point(face,356,width,height), topP=point(face,10,width,height);
    const eyeL=point(face,33,width,height), eyeR=point(face,263,width,height);
    const faceWidth=Math.max(48,Math.hypot(rightP.x-leftP.x,rightP.y-leftP.y));
    const left=leftP.x-faceWidth*.06, right=rightP.x+faceWidth*.06, mid=(left+right)/2;
    const bandY=topP.y+faceWidth*.12, top=topP.y-faceWidth*.23, bottom=bandY+faceWidth*.04;
    c.save();
    if (name==='iket'||name==='bando_emas') {
      drawBand(c,left,right,bandY,faceWidth*.09,name==='iket'?'#d7ac4f':'#e4c16d',name==='iket'?'#f1dfad':'#fff1c4');
    } else if (name==='kembang'||name==='bunga_tanjung') {
      flower(c,leftP.x-faceWidth*.07,bandY+faceWidth*.02,faceWidth*.15);
      flower(c,rightP.x+faceWidth*.07,bandY+faceWidth*.02,faceWidth*.15);
      if(name==='bunga_tanjung') drawBand(c,left,right,bandY+faceWidth*.12,faceWidth*.045,'#a6322d','#e7c16f');
    } else if (name==='topeng'||name==='topeng_kembang') {
      const y=(eyeL.y+eyeR.y)/2, h=faceWidth*.15;
      c.beginPath(); c.moveTo(left,y-h*.2);c.quadraticCurveTo(mid,y-h*.9,right,y-h*.2);c.lineTo(right-faceWidth*.08,y+h*.45);c.quadraticCurveTo(mid,y+h*.12,left+faceWidth*.08,y+h*.45);c.closePath();
      c.fillStyle='rgba(34,78,59,.78)';c.fill();c.strokeStyle='#dfb65c';c.lineWidth=Math.max(2,faceWidth*.012);c.stroke();
      if(name==='topeng_kembang'){flower(c,left+faceWidth*.12,y,faceWidth*.08);flower(c,right-faceWidth*.12,y,faceWidth*.08);}
    } else if (name==='selendang') {
      const y=topP.y+faceWidth*.20;
      c.beginPath();c.moveTo(leftP.x-faceWidth*.05,y);c.quadraticCurveTo(mid, y+faceWidth*.1,rightP.x+faceWidth*.05,y);
      c.strokeStyle='#a83b32';c.lineWidth=faceWidth*.1;c.stroke();c.strokeStyle='#e2bd61';c.lineWidth=faceWidth*.025;c.stroke();
    } else if (name==='pita_merah') {
      const y=bandY;
      c.fillStyle='#b52f35';c.strokeStyle='#e9c36e';c.lineWidth=Math.max(2,faceWidth*.015);
      c.beginPath();c.moveTo(mid,y);c.lineTo(mid-faceWidth*.23,y-faceWidth*.10);c.lineTo(mid-faceWidth*.22,y+faceWidth*.05);c.closePath();c.fill();c.stroke();
      c.beginPath();c.moveTo(mid,y);c.lineTo(mid+faceWidth*.23,y-faceWidth*.10);c.lineTo(mid+faceWidth*.22,y+faceWidth*.05);c.closePath();c.fill();c.stroke();
      flower(c,mid,y,faceWidth*.09);
    } else if (name==='mega_mendung') {
      for(let i=0;i<3;i++){c.beginPath();c.ellipse(mid,bandY-faceWidth*(.08+i*.07),faceWidth*.47,faceWidth*.075,0,Math.PI,Math.PI*2);c.strokeStyle=['#1d6250','#d3a94f','#a7332d'][i];c.lineWidth=faceWidth*.035;c.stroke();}
      flower(c,mid,top+faceWidth*.12,faceWidth*.10);
    } else if (name==='ondel_merah'||name==='ondel_biru') {
      drawCrown(c,left,right,top,bottom,name);
      c.fillStyle=name==='ondel_merah'?'#b3322d':'#2b7388';
      for(let i=0;i<9;i++){const a=Math.PI+i*Math.PI/8;const x=mid+Math.cos(a)*faceWidth*.62;const y=top+Math.sin(a)*faceWidth*.14;c.beginPath();c.ellipse(x,y,faceWidth*.035,faceWidth*.11,a,0,Math.PI*2);c.fill();}
    } else if (name==='pucuk_rebung') {
      c.strokeStyle='#d6ad55';c.lineWidth=faceWidth*.025;
      c.beginPath();for(let i=0;i<9;i++){const x=left+(right-left)*i/8;const y=bandY-(i%2?faceWidth*.11:0);if(i===0)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();
      drawBand(c,left,right,bandY+faceWidth*.07,faceWidth*.035,'#1b6650','#e9d394');
    } else {
      drawCrown(c,left,right,top,bottom,name);
    }
    c.restore();
  }
  function effectFor(index) {
    if(effectMode!=='mix'||selectedFilter==='none') return selectedFilter;
    const ordered=[selectedFilter,...VARIATION.filter(x=>x!==selectedFilter)];
    return ordered[index % ordered.length] || selectedFilter;
  }
  function evaluatePose() {
    const marks=poseResults?.landmarks?.[0];
    if(!marks) return {detected:false,feedback:'Pastikan kepala, bahu, dan kedua tangan terlihat kamera.'};
    const ids=[11,12,15,16];
    if(ids.some(i=>(marks[i]?.visibility??1)<.35)) return {detected:true,feedback:'Pastikan bahu dan kedua tangan terlihat oleh kamera.'};
    const ls=marks[11],rs=marks[12],lw=marks[15],rw=marks[16];
    let ok=false, feedback='';
    if(currentStep===0){ok=true;feedback='Tubuh terdeteksi. Kamu siap memulai latihan.';}
    else if(currentStep===1){ok=Math.abs(lw.y-ls.y)<.24&&Math.abs(rw.y-rs.y)<.24&&Math.abs(lw.x-ls.x)>.12&&Math.abs(rw.x-rs.x)>.12;feedback=ok?'Bagus, kedua tangan sudah terbuka.':'Coba rentangkan kedua tangan mendekati tinggi bahu.';}
    else if(currentStep===2){ok=rw.y<rs.y-.08;feedback=ok?'Gerakan tangan kanan terdeteksi.':'Coba angkat tangan kanan sedikit lebih tinggi.';}
    else if(currentStep===3){ok=lw.y<ls.y-.08;feedback=ok?'Gerakan tangan kiri terdeteksi.':'Coba angkat tangan kiri sedikit lebih tinggi.';}
    else {ok=lw.y>ls.y-.05&&rw.y>rs.y-.05;feedback=ok?'Kamu sudah kembali ke posisi nyaman.':'Turunkan kedua tangan perlahan.';}
    return {detected:true,feedback};
  }
  async function loadModels(needsFace, needsPose) {
    if(!visionModule){
      visionModule=await import(`${CDN}/vision_bundle.mjs`);
    }
    const resolver=await visionModule.FilesetResolver.forVisionTasks(`${CDN}/wasm`);
    if(needsFace&&!faceLandmarker){
      try {
        faceLandmarker=await visionModule.FaceLandmarker.createFromOptions(resolver,{baseOptions:{modelAssetPath:FACE_MODEL,delegate:'GPU'},runningMode:'VIDEO',numFaces:4,outputFaceBlendshapes:false});
      } catch (_) {
        faceLandmarker=await visionModule.FaceLandmarker.createFromOptions(resolver,{baseOptions:{modelAssetPath:FACE_MODEL,delegate:'CPU'},runningMode:'VIDEO',numFaces:4,outputFaceBlendshapes:false});
      }
    }
    if(needsPose&&!poseLandmarker){
      try {
        poseLandmarker=await visionModule.PoseLandmarker.createFromOptions(resolver,{baseOptions:{modelAssetPath:POSE_MODEL,delegate:'GPU'},runningMode:'VIDEO',numPoses:1});
      } catch (_) {
        poseLandmarker=await visionModule.PoseLandmarker.createFromOptions(resolver,{baseOptions:{modelAssetPath:POSE_MODEL,delegate:'CPU'},runningMode:'VIDEO',numPoses:1});
      }
    }
  }
  async function start(options) {
    await stop();
    video=options.video; canvas=options.canvas; ctx=canvas.getContext('2d',{alpha:false});
    mode=options.mode||'stage';selectedFilter=options.filterName||'iket';effectMode=options.effectMode||'same';onStatus=options.onStatus||(()=>{});modelLoadError='';
    notify({running:false,face_count:0,pose_detected:false,max_faces:4,error:'',dance_feedback:'Meminta izin kamera…'});
    if(!navigator.mediaDevices?.getUserMedia) throw new Error('Browser tidak mendukung kamera. Gunakan HTTPS atau localhost.');
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720},frameRate:{ideal:24,max:30}},audio:false});
    video.srcObject=stream;video.muted=true;video.playsInline=true;
    await video.play();
    const w=video.videoWidth||1280,h=video.videoHeight||720;
    canvas.width=w;canvas.height=h;canvas.classList.remove('hidden');
    notify({running:true,face_count:0,pose_detected:false,dance_feedback:'Kamera aktif. Menyiapkan pelacakan wajah dan gerak…'});
    try {
      await loadModels(mode!=='dance',mode!=='filter'||selectedFilter==='selendang');
    } catch (error) {
      modelLoadError=error?.message||'Model pelacakan tidak dapat dimuat.';
      notify({error:'Preview kamera aktif, tetapi model filter/pose tidak berhasil dimuat. Periksa koneksi internet.'});
    }
    drawLoop();
    return {...status};
  }
  function drawLoop() {
    if(!video||!canvas||!ctx||video.readyState<2){animationFrame=requestAnimationFrame(drawLoop);return;}
    const w=canvas.width,h=canvas.height;
    ctx.save();ctx.clearRect(0,0,w,h);ctx.translate(w,0);ctx.scale(-1,1);ctx.drawImage(video,0,0,w,h);
    const now=performance.now();
    if(now-lastDetectAt>42&&!detectBusy&&video.currentTime!==lastVideoTime){
      detectBusy=true;lastDetectAt=now;lastVideoTime=video.currentTime;
      try {
        if(faceLandmarker&&mode!=='dance') faceResults=faceLandmarker.detectForVideo(video,now);
        if(poseLandmarker&&(mode!=='filter'||selectedFilter==='selendang')) poseResults=poseLandmarker.detectForVideo(video,now);
        else poseResults=null;
      } catch(error) { modelLoadError=error?.message||'Pelacakan gagal.'; }
      finally { detectBusy=false; }
    }
    const faces=faceResults?.faceLandmarks||[];
    if(mode!=='dance') faces.slice(0,4).forEach((face,index)=>drawAccessory(ctx,face,effectFor(index),w,h));
    const pose=evaluatePose();
    if(mode!=='filter'||selectedFilter==='selendang'){
      status={...status,face_count:Math.min(4,faces.length),pose_detected:pose.detected,dance_feedback:pose.feedback,error:modelLoadError};
    } else {
      status={...status,face_count:Math.min(4,faces.length),pose_detected:false,dance_feedback:'Mode filter wajah aktif. Pilih mode Panggung atau Belajar Gerak untuk panduan pose.',error:modelLoadError};
    }
    ctx.restore();
    if(now-(status.lastNotify||0)>500){status.lastNotify=now;try{onStatus({...status});}catch(_){}}
    animationFrame=requestAnimationFrame(drawLoop);
  }
  function setFilter(name, nextMode=effectMode) { selectedFilter=name;effectMode=nextMode; }
  function setStep(step) { currentStep=Math.max(0,Math.min(4,Number(step)||0)); }
  async function stop() {
    if(animationFrame)cancelAnimationFrame(animationFrame);animationFrame=0;
    if(stream){stream.getTracks().forEach(track=>track.stop());stream=null;}
    if(video){video.pause();video.srcObject=null;}
    if(ctx&&canvas)ctx.clearRect(0,0,canvas.width,canvas.height);
    notify({running:false,face_count:0,pose_detected:false,dance_feedback:'Kamera sudah dimatikan.'});
    faceResults=null;poseResults=null;lastVideoTime=-1;detectBusy=false;
  }
  function getStatus(){return {...status};}
  return {start,stop,setFilter,setStep,getStatus};
})();
