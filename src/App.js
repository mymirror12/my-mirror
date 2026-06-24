import React, { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';

const S = {
  wrap: { display:'flex', flexDirection:'column', alignItems:'center', minHeight:'100vh', backgroundColor:'#0a0a0a', fontFamily:'Arial', padding:'30px 20px' },
  h1: { background:'linear-gradient(90deg, #4376FF, #00cc66)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', fontSize:'2.2rem', marginBottom:'5px', fontWeight:'bold' },
  sub: { color:'#888', marginBottom:'25px', fontSize:'0.95rem' },
  videoWrap: { position:'relative' },
  video: { width:'320px', height:'240px', borderRadius:'20px', border:'3px solid #4376FF', backgroundColor:'#111', objectFit:'cover', display:'block' },
  scanLine: { position:'absolute', top:0, left:0, width:'100%', height:'3px', backgroundColor:'#00ff88', borderRadius:'2px', animation:'scan 2s linear infinite' },
  btnWrap: { marginTop:'20px', display:'flex', gap:'10px', flexWrap:'wrap', justifyContent:'center' },
  btn1: { padding:'14px 35px', backgroundColor:'#4376FF', color:'white', border:'none', borderRadius:'30px', fontSize:'1rem', cursor:'pointer', fontWeight:'bold' },
  btn2on: { padding:'14px 35px', backgroundColor:'#00cc66', color:'white', border:'none', borderRadius:'30px', fontSize:'1rem', cursor:'pointer', fontWeight:'bold' },
  btn2off: { padding:'14px 35px', backgroundColor:'#555', color:'white', border:'none', borderRadius:'30px', fontSize:'1rem', cursor:'not-allowed', fontWeight:'bold' },
  snapBtn: { padding:'14px 20px', backgroundColor:'#7c3aed', color:'white', border:'none', borderRadius:'30px', fontSize:'1rem', cursor:'pointer', fontWeight:'bold' },
  voiceBtn: { padding:'14px 20px', backgroundColor:'#ff6b35', color:'white', border:'none', borderRadius:'30px', fontSize:'1rem', cursor:'pointer', fontWeight:'bold' },
  emotion: { color:'#4376FF', fontSize:'1rem', marginTop:'10px', fontWeight:'bold' },
  scoreWrap: { marginTop:'20px', textAlign:'center', backgroundColor:'#111', padding:'20px 40px', borderRadius:'20px', border:'1px solid #222' },
  scoreLabel: { color:'#888', margin:'0 0 5px 0', fontSize:'0.9rem' },
  scoreHigh: { fontSize:'3.5rem', fontWeight:'bold', color:'#00ff88', margin:0 },
  scoreMid: { fontSize:'3.5rem', fontWeight:'bold', color:'#ffaa00', margin:0 },
  scoreLow: { fontSize:'3.5rem', fontWeight:'bold', color:'#ff4444', margin:0 },
  feedback: { marginTop:'15px', backgroundColor:'#1a1a2e', padding:'20px 30px', borderRadius:'15px', color:'#fff', fontSize:'1.1rem', textAlign:'center', border:'1px solid #4376FF', maxWidth:'360px', lineHeight:'1.5' },
  tipsWrap: { marginTop:'15px', backgroundColor:'#0f1a0f', padding:'16px 20px', borderRadius:'15px', border:'1px solid #00cc66', maxWidth:'360px', width:'100%' },
  tipsTitle: { color:'#00cc66', fontSize:'0.9rem', marginBottom:'10px', fontWeight:'bold' },
  tipItem: { color:'#ccc', fontSize:'0.9rem', padding:'6px 0', borderBottom:'1px solid #1a2a1a' },
  photoWrap: { marginTop:'15px', textAlign:'center' },
  photoImg: { width:'200px', borderRadius:'15px', border:'2px solid #7c3aed' },
  downloadLink: { display:'block', marginTop:'8px', color:'#7c3aed', fontSize:'0.85rem', textDecoration:'none' },
  historyWrap: { marginTop:'25px', width:'100%', maxWidth:'380px' },
  historyTitle: { color:'#888', fontSize:'0.85rem', marginBottom:'10px', textAlign:'center' },
  historyItem: { display:'flex', justifyContent:'space-between', alignItems:'center', backgroundColor:'#1a1a1a', padding:'10px 16px', borderRadius:'10px', marginBottom:'6px', border:'1px solid #222' },
  historyDate: { color:'#666', fontSize:'0.75rem' },
  historyEmo: { color:'#fff', fontSize:'0.85rem' },
  historyScore: { fontSize:'1rem', fontWeight:'bold' },
  clearBtn: { marginTop:'8px', padding:'8px 20px', backgroundColor:'transparent', color:'#ff4444', border:'1px solid #ff4444', borderRadius:'20px', fontSize:'0.8rem', cursor:'pointer', display:'block', margin:'10px auto 0' },
  loadingWrap: { marginTop:'15px', color:'#4376FF', fontSize:'0.9rem', textAlign:'center' },
  progressBar: { width:'200px', height:'4px', backgroundColor:'#222', borderRadius:'2px', marginTop:'8px', overflow:'hidden' },
  progressFill: { height:'100%', backgroundColor:'#4376FF', borderRadius:'2px', animation:'progress 3s ease-in-out infinite' },
};

const moodData = {
  happy: {
    msg: 'Waah! Aaj tu bahut khush lag raha hai! Yeh energy pure din rakhna!',
    sc: 95,
    tips: ['😊 Yeh positivity doston ke saath share karo', '🌟 Aaj koi naya kaam shuru karne ka perfect time', '💪 Gym ya morning walk ke liye best mood hai!'],
    color: '#00ff88'
  },
  sad: {
    msg: 'Thoda sad lag raha hai — koi baat nahi, kal ka din better hoga!',
    sc: 55,
    tips: ['🎵 Apni favorite song suno abhi', '☕ Garam chai ya coffee piyo', '📞 Kisi close dost ko call karo'],
    color: '#4376FF'
  },
  angry: {
    msg: 'Stress aur frustration dikh raha hai — thodi deep breathing karo!',
    sc: 50,
    tips: ['🧘 5 min deep breathing abhi karo', '🚶 Bahar short walk pe jao', '💧 Thanda paani piyo aur relax karo'],
    color: '#ff4444'
  },
  surprised: {
    msg: 'Surprised expression hai — kya hua aaj? Excitement feel ho rahi hai!',
    sc: 70,
    tips: ['🎯 Is energy ko kisi goal pe lagao', '✨ Naya experiment karne ka mood hai', '📸 Yeh moment capture karo!'],
    color: '#ffaa00'
  },
  fearful: {
    msg: 'Thoda nervous lag raha hai — par tu capable hai, doubt mat kar!',
    sc: 60,
    tips: ['💪 Khud pe trust karo — tu kar sakta hai', '📝 Apni feelings ek paper pe likho', '🌬️ Slow deep breathing se anxiety kam hogi'],
    color: '#ff6b35'
  },
  disgusted: {
    msg: 'Kuch bura feel ho raha hai — fresh start karte hain aaj!',
    sc: 55,
    tips: ['🌅 Bahar thodi fresh air lo', '🍎 Healthy kuch khao — mood better hoga', '🎮 Thoda break lo, mind reset hoga'],
    color: '#ff4444'
  },
  neutral: {
    msg: 'Neutral mode mein hai — thoda smile karo, sab kuch better lagega!',
    sc: 75,
    tips: ['😄 Mirror mein smile practice karo', '🎯 Aaj ka ek small goal set karo', '☀️ Dhoop mein 10 min baitho — mood lift hoga'],
    color: '#ffaa00'
  },
};

const emojiMap = { happy:'😊', sad:'😢', angry:'😠', surprised:'😲', fearful:'😨', disgusted:'🤢', neutral:'😐' };

export default function App() {
  const videoRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [emotion, setEmotion] = useState('');
  const [tips, setTips] = useState([]);
  const [history, setHistory] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [moodColor, setMoodColor] = useState('#4376FF');
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('mirrorHistory');
    if (saved) setHistory(JSON.parse(saved));
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setFeedback('AI models load ho rahe hain...');
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceExpressionNet.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      setModelsLoaded(true);
      setFeedback('');
    } catch (err) {
      setFeedback('Models load nahi hue — page refresh karo!');
    }
  };

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.85;
    utterance.pitch = 1.1;
    utterance.volume = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const saveToHistory = (sc, emo) => {
    const now = new Date();
    const entry = {
      date: now.toLocaleDateString('en-IN'),
      time: now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }),
      score: sc,
      emotion: emo
    };
    const updated = [entry, ...history].slice(0, 7);
    setHistory(updated);
    localStorage.setItem('mirrorHistory', JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('mirrorHistory');
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setStarted(true);
    } catch (err) {
      setFeedback('Camera permission do! Browser settings check karo.');
    }
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    setPhoto(canvas.toDataURL('image/png'));
  };

  const analyzeMe = async () => {
    if (!modelsLoaded) { setFeedback('Wait karo — AI load ho raha hai!'); return; }
    setAnalyzing(true);
    setPhoto(null);
    setTips([]);
    setFeedback('AI tera face analyze kar raha hai...');

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

      if (!detection) {
        setFeedback('Face nahi dikh raha — camera ke seedha saamne aao aur achhi roshni rakho!');
        setAnalyzing(false);
        return;
      }

      const dominant = Object.entries(detection.expressions)
        .sort((a, b) => b[1] - a[1])[0][0];

      const result = moodData[dominant] || moodData.neutral;

      setEmotion(emojiMap[dominant] + ' ' + dominant.toUpperCase());
      setFeedback(result.msg);
      setScore(result.sc);
      setTips(result.tips);
      setMoodColor(result.color);
      speak(result.msg);
      saveToHistory(result.sc, dominant);
      takePhoto();

    } catch (err) {
      setFeedback('Kuch error aaya — dobara try karo!');
    }
    setAnalyzing(false);
  };

  const getScoreStyle = (sc) => {
    const s = sc || score;
    if (s >= 85) return S.scoreHigh;
    if (s >= 70) return S.scoreMid;
    return S.scoreLow;
  };

  return (
    <div style={S.wrap}>
      <style>{`
        @keyframes scan { 0%{top:0} 100%{top:calc(100% - 3px)} }
        @keyframes progress { 0%{width:0%} 50%{width:100%} 100%{width:0%} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>

      <h1 style={S.h1}>🪞 DailyMirror AI</h1>
      <p style={S.sub}>Real AI face & emotion analysis</p>

      <div style={S.videoWrap}>
        <video ref={videoRef} autoPlay style={S.video} />
        {analyzing && <div style={S.scanLine} />}
      </div>

      {!modelsLoaded && !started && (
        <div style={S.loadingWrap}>
          <p>AI Models load ho rahe hain...</p>
          <div style={S.progressBar}>
            <div style={S.progressFill} />
          </div>
        </div>
      )}

      <div style={S.btnWrap}>
        {!started ? (
          <button onClick={startCamera} style={S.btn1}>
            📷 Camera Start Karo
          </button>
        ) : (
          <>
            <button
              onClick={analyzeMe}
              disabled={analyzing || !modelsLoaded}
              style={analyzing ? S.btn2off : S.btn2on}
            >
              {analyzing ? '⏳ Analyzing...' : !modelsLoaded ? '⏳ Loading AI...' : '🤖 AI Se Poocho'}
            </button>
            <button
              onClick={speaking ? stopSpeaking : () => speak(feedback)}
              style={S.voiceBtn}
              disabled={!feedback}
            >
              {speaking ? '🔇 Stop' : '🔊 Suno'}
            </button>
          </>
        )}
      </div>

      {emotion && (
        <p style= ...S.emotion, color: moodColor >{emotion}</p>
      )}

      {score !== null && (
        <div style= ...S.scoreWrap, borderColor: moodColor >
          <p style={S.scoreLabel}>Aaj ka Mood Score</p>
          <p style={getScoreStyle()}>{score}/100</p>
        </div>
      )}

      {feedback && !analyzing && (
        <div style= ...S.feedback, borderColor: moodColor >
          {feedback}
        </div>
      )}

      {analyzing && (
        <div style={S.feedback}>
          ⏳ AI analyze kar raha hai...
        </div>
      )}

      {tips.length > 0 && (
        <div style={S.tipsWrap}>
          <p style={S.tipsTitle}>💡 Aaj ke liye Tips:</p>
          {tips.map((tip, i) => (
            <div key={i} style={S.tipItem}>{tip}</div>
          ))}
        </div>
      )}

      {photo && (
        <div style={S.photoWrap}>
          <img src={photo} alt="snapshot" style={S.photoImg} />
          <a href={photo} download="dailymirror-snap.png" style={S.downloadLink}>
            📥 Photo Download Karo
          </a>
        </div>
      )}

      {history.length > 0 && (
        <div style={S.historyWrap}>
          <p style={S.historyTitle}>📊 Last 7 Days History</p>
          {history.map((item, i) => (
            <div key={i} style={S.historyItem}>
              <span style={S.historyDate}>{item.date} {item.time}</span>
              <span style={S.historyEmo}>{emojiMap[item.emotion] || '😐'} {item.emotion}</span>
              <span style={getScoreStyle(item.score)}>{item.score}</span>
            </div>
          ))}
          <button onClick={clearHistory} style={S.clearBtn}>
            🗑️ History Clear
          </button>
        </div>
      )}
    </div>
  );
}