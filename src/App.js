import React, { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';

const S = {
  wrap: { display:'flex', flexDirection:'column', alignItems:'center', minHeight:'100vh', backgroundColor:'#0a0a0a', fontFamily:'Arial', padding:'30px 20px' },
  h1: { color:'#ffffff', fontSize:'2rem', marginBottom:'5px' },
  sub: { color:'#888', marginBottom:'25px' },
  video: { width:'320px', height:'240px', borderRadius:'20px', border:'3px solid #4376FF', backgroundColor:'#111', objectFit:'cover' },
  btnWrap: { marginTop:'20px', display:'flex', gap:'10px' },
  btn1: { padding:'14px 35px', backgroundColor:'#4376FF', color:'white', border:'none', borderRadius:'30px', fontSize:'1rem', cursor:'pointer', fontWeight:'bold' },
  btn2on: { padding:'14px 35px', backgroundColor:'#00cc66', color:'white', border:'none', borderRadius:'30px', fontSize:'1rem', cursor:'pointer', fontWeight:'bold' },
  btn2off: { padding:'14px 35px', backgroundColor:'#555', color:'white', border:'none', borderRadius:'30px', fontSize:'1rem', cursor:'not-allowed', fontWeight:'bold' },
  scoreWrap: { marginTop:'20px', textAlign:'center' },
  scoreLabel: { color:'#888', margin:'0 0 5px 0' },
  scoreHigh: { fontSize:'3rem', fontWeight:'bold', color:'#00ff88', margin:0 },
  scoreMid: { fontSize:'3rem', fontWeight:'bold', color:'#ffaa00', margin:0 },
  scoreLow: { fontSize:'3rem', fontWeight:'bold', color:'#ff4444', margin:0 },
  feedback: { marginTop:'15px', backgroundColor:'#1a1a2e', padding:'20px 30px', borderRadius:'15px', color:'#fff', fontSize:'1.1rem', textAlign:'center', border:'1px solid #4376FF', maxWidth:'350px' },
  emotion: { color:'#aaa', fontSize:'0.9rem', marginTop:'10px' },
  historyWrap: { marginTop:'25px', width:'100%', maxWidth:'380px' },
  historyTitle: { color:'#888', fontSize:'0.85rem', marginBottom:'10px', textAlign:'center' },
  historyItem: { display:'flex', justifyContent:'space-between', alignItems:'center', backgroundColor:'#1a1a1a', padding:'10px 16px', borderRadius:'10px', marginBottom:'6px' },
  historyDate: { color:'#aaa', fontSize:'0.8rem' },
  historyEmo: { color:'#fff', fontSize:'0.85rem' },
  clearBtn: { marginTop:'8px', padding:'8px 20px', backgroundColor:'transparent', color:'#ff4444', border:'1px solid #ff4444', borderRadius:'20px', fontSize:'0.8rem', cursor:'pointer', display:'block', margin:'10px auto 0' }
};

function App() {
  const videoRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [emotion, setEmotion] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('mirrorHistory');
    if (saved) setHistory(JSON.parse(saved));

    const loadModels = async () => {
      setFeedback('AI models load ho rahe hain...');
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceExpressionNet.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      setModelsLoaded(true);
      setFeedback('');
    };
    loadModels();
  }, []);

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
      setFeedback('Camera permission do!');
    }
  };

  const analyzeMe = async () => {
    if (!modelsLoaded) { setFeedback('Wait karo, models load ho rahe hain!'); return; }
    setAnalyzing(true);
    setFeedback('AI tera face analyze kar raha hai...');

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

      if (!detection) {
        setFeedback('Face nahi dikh raha — camera ke saamne aao!');
        setAnalyzing(false);
        return;
      }

      const expressions = detection.expressions;
      const dominant = Object.entries(expressions).sort((a, b) => b[1] - a[1])[0][0];
      setEmotion('Detected: ' + dominant);

      const map = {
        happy:     { msg: 'Waah! Aaj tu bahut khush lag raha hai! Yeh energy rakhna!', sc: 95 },
        sad:       { msg: 'Thoda sad lag raha hai — koi baat nahi, kal better hoga!', sc: 55 },
        angry:     { msg: 'Stress dikh raha hai — thodi deep breathing karo!', sc: 50 },
        surprised: { msg: 'Surprised expression! Kya hua? Relax karo!', sc: 70 },
        fearful:   { msg: 'Nervous mat ho — tu capable hai! Confidence rakho!', sc: 60 },
        disgusted: { msg: 'Kuch bura hua kya? Fresh start karo aaj!', sc: 55 },
        neutral:   { msg: 'Neutral expression — thoda smile karo, duniya better lagegi!', sc: 75 },
      };

      const result = map[dominant] || map.neutral;
      setFeedback(result.msg);
      setScore(result.sc);
      saveToHistory(result.sc, dominant);

    } catch (err) {
      setFeedback('Kuch error aaya — dobara try karo!');
    }
    setAnalyzing(false);
  };

  const getScoreStyle = () => {
    if (score >= 85) return S.scoreHigh;
    if (score >= 70) return S.scoreMid;
    return S.scoreLow;
  };

  const emojiMap = { happy:'😊', sad:'😢', angry:'😠', surprised:'😲', fearful:'😨', disgusted:'🤢', neutral:'😐' };

  return (
    <div style={S.wrap}>
      <h1 style={S.h1}>DailyMirror AI</h1>
      <p style={S.sub}>Real AI face analysis!</p>

      <video ref={videoRef} autoPlay style={S.video} />

      <div style={S.btnWrap}>
        {!started ? (
          <button onClick={startCamera} style={S.btn1}>Camera Start Karo</button>
        ) : (
          <button onClick={analyzeMe} disabled={analyzing || !modelsLoaded} style={analyzing ? S.btn2off : S.btn2on}>
            {analyzing ? 'Analyzing...' : !modelsLoaded ? 'Loading AI...' : 'AI Se Poocho'}
          </button>
        )}
      </div>

      {emotion && <p style={S.emotion}>{emotion}</p>}

      {score !== null && (
        <div style={S.scoreWrap}>
          <p style={S.scoreLabel}>Aaj ka Score</p>
          <p style={getScoreStyle()}>{score}/100</p>
        </div>
      )}

      {feedback && <div style={S.feedback}>{feedback}</div>}

      {history.length > 0 && (
        <div style={S.historyWrap}>
          <p style={S.historyTitle}>📊 Last 7 Days History</p>
          {history.map((item, i) => (
            <div key={i} style={S.historyItem}>
              <span style={S.historyDate}>{item.date} {item.time}</span>
              <span style={S.historyEmo}>{emojiMap[item.emotion] || '😐'} {item.emotion}</span>
              <span style={getScoreStyle()}>{item.score}</span>
            </div>
          ))}
          <button onClick={clearHistory} style={S.clearBtn}>History Clear Karo</button>
        </div>
      )}
    </div>
  );
}

export default App;