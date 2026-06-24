import React, { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';

const ACHIEVEMENTS = [
  { id:'first',   icon:'🥇', title:'First Scan!',   desc:'Pehla scan kiya',        condition:(h)=>h.length>=1 },
  { id:'streak3', icon:'🔥', title:'3 Din Streak!', desc:'3 din lagatar scan',      condition:(h,s)=>s>=3 },
  { id:'streak7', icon:'⚡', title:'7 Din Streak!', desc:'Ek hafta lagatar!',        condition:(h,s)=>s>=7 },
  { id:'happy',   icon:'😊', title:'Happy Vibes!',  desc:'5 baar happy emotion',    condition:(h)=>h.filter(x=>x.emotion==='happy').length>=5 },
  { id:'perfect', icon:'💯', title:'Perfect Score!',desc:'95+ score mila',          condition:(h)=>h.some(x=>x.score>=95) },
  { id:'master',  icon:'🌟', title:'Mood Master!',  desc:'30 din streak',           condition:(h,s)=>s>=30 },
];

const AFFIRMATIONS = [
  "Aaj tu apni best life jee raha hai!",
  "Tera confidence hi teri superpower hai!",
  "Har din ek naya mauka hai — use karo!",
  "Tu jaise hai, ekdum perfect hai!",
  "Chhoti khushiyan hi badi zindagi banati hain!",
  "Aaj ka din tera hai — isko own karo!",
  "Mushkilein temporary hain, tu permanent hai!",
];

const moodData = {
  happy:     { msg:'Waah! Aaj tu bahut khush lag raha hai! Yeh energy pure din rakhna!', sc:95, tips:['Positivity share karo doston ke saath','Naya kaam shuru karne ka perfect time','Gym ya walk ke liye best mood!'], color:'#00ff88', emoji:'😊' },
  sad:       { msg:'Thoda sad lag raha hai — koi baat nahi, kal better hoga!',          sc:55, tips:['Favorite song suno abhi','Garam chai piyo aur rest karo','Kisi dost ko call karo'],                                 color:'#4376FF', emoji:'😢' },
  angry:     { msg:'Stress dikh raha hai — thodi deep breathing karo!',                  sc:50, tips:['5 min deep breathing karo','Bahar short walk pe jao','Thanda paani piyo aur relax karo'],                         color:'#ff4444', emoji:'😠' },
  surprised: { msg:'Surprised expression! Excitement feel ho rahi hai!',                 sc:70, tips:['Is energy ko goal pe lagao','Naya experiment karo aaj','Yeh moment enjoy karo!'],                                  color:'#ffaa00', emoji:'😲' },
  fearful:   { msg:'Nervous mat ho — tu capable hai, trust kar khud pe!',                sc:60, tips:['Khud pe trust karo','Feelings paper pe likho','Slow breathing se anxiety kam hogi'],                               color:'#ff6b35', emoji:'😨' },
  disgusted: { msg:'Kuch bura feel ho raha hai — fresh start karte hain!',               sc:55, tips:['Fresh air lo bahar','Healthy kuch khao','Thoda break lo — mind reset hoga'],                                      color:'#ff4444', emoji:'🤢' },
  neutral:   { msg:'Neutral mode mein hai — thoda smile karo, sab better lagega!',      sc:75, tips:['Mirror mein smile practice karo','Aaj ka ek small goal set karo','Dhoop mein 10 min baitho'],                      color:'#ffaa00', emoji:'😐' },
};

export default function App() {
  const videoRef = useRef(null);
  const [started,       setStarted]       = useState(false);
  const [feedback,      setFeedback]      = useState('');
  const [score,         setScore]         = useState(null);
  const [analyzing,     setAnalyzing]     = useState(false);
  const [modelsLoaded,  setModelsLoaded]  = useState(false);
  const [emotion,       setEmotion]       = useState('');
  const [tips,          setTips]          = useState([]);
  const [history,       setHistory]       = useState([]);
  const [moodColor,     setMoodColor]     = useState('#4376FF');
  const [speaking,      setSpeaking]      = useState(false);
  const [streak,        setStreak]        = useState(0);
  const [unlockedBadges,setUnlockedBadges]= useState([]);
  const [newBadge,      setNewBadge]      = useState(null);
  const affirmation = AFFIRMATIONS[new Date().getDay() % AFFIRMATIONS.length];

  useEffect(() => {
    const saved   = localStorage.getItem('mirrorHistory');
    const savedSt = localStorage.getItem('mirrorStreak');
    const savedBa = localStorage.getItem('mirrorBadges');
    if (saved)   setHistory(JSON.parse(saved));
    if (savedSt) setStreak(parseInt(savedSt));
    if (savedBa) setUnlockedBadges(JSON.parse(savedBa));
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
    } catch {
      setFeedback('Models load nahi hue — refresh karo!');
    }
  };

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'hi-IN'; u.rate = 0.85; u.pitch = 1.1;
    u.onstart = () => setSpeaking(true);
    u.onend   = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  const stopSpeaking = () => { window.speechSynthesis.cancel(); setSpeaking(false); };

  const checkAchievements = (hist, str) => {
    const current = JSON.parse(localStorage.getItem('mirrorBadges') || '[]');
    ACHIEVEMENTS.forEach(ach => {
      if (!current.includes(ach.id) && ach.condition(hist, str)) {
        const updated = [...current, ach.id];
        setUnlockedBadges(updated);
        localStorage.setItem('mirrorBadges', JSON.stringify(updated));
        setNewBadge(ach);
        setTimeout(() => setNewBadge(null), 3000);
      }
    });
  };

  const saveToHistory = (sc, emo) => {
    const now = new Date();
    const entry = {
      date: now.toLocaleDateString('en-IN'),
      time: now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }),
      score: sc,
      emotion: emo,
    };
    const updated = [entry, ...history].slice(0, 30);
    setHistory(updated);
    localStorage.setItem('mirrorHistory', JSON.stringify(updated));

    const today     = now.toLocaleDateString('en-IN');
    const yesterday = new Date(Date.now()-86400000).toLocaleDateString('en-IN');
    const lastDate  = history[0] ? history[0].date : null;
    let newStreak   = (!lastDate || lastDate === yesterday || lastDate === today) ? streak + 1 : 1;
    setStreak(newStreak);
    localStorage.setItem('mirrorStreak', String(newStreak));
    checkAchievements(updated, newStreak);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:true });
      videoRef.current.srcObject = stream;
      setStarted(true);
    } catch {
      setFeedback('Camera permission do!');
    }
  };

  const analyzeMe = async () => {
    if (!modelsLoaded) { setFeedback('Wait karo — AI load ho raha hai!'); return; }
    setAnalyzing(true);
    setTips([]);
    setFeedback('AI tera face analyze kar raha hai...');
    try {
      const det = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

      if (!det) {
        setFeedback('Face nahi dikh raha — achhi roshni mein aao!');
        setAnalyzing(false);
        return;
      }

      const dominant = Object.entries(det.expressions).sort((a,b) => b[1]-a[1])[0][0];
      const result   = moodData[dominant] || moodData.neutral;

      setEmotion(result.emoji + ' ' + dominant.toUpperCase());
      setFeedback(result.msg);
      setScore(result.sc);
      setTips(result.tips);
      setMoodColor(result.color);
      speak(result.msg);
      saveToHistory(result.sc, dominant);
    } catch {
      setFeedback('Error aaya — dobara try karo!');
    }
    setAnalyzing(false);
  };

  const shareResult = () => {
    const text = `Aaj mera DailyMirror AI mood score: ${score}/100 ${emotion}\nStreak: ${streak} din 🔥`;
    if (navigator.share) {
      navigator.share({ title:'DailyMirror AI', text });
    } else {
      navigator.clipboard.writeText(text);
      alert('Score copy ho gaya! Paste karo kahi bhi!');
    }
  };

  const resetAll = () => {
    setHistory([]); setStreak(0); setUnlockedBadges([]);
    localStorage.clear();
  };

  // ── All styles ──────────────────────────────────────────
  const wrap          = { display:'flex', flexDirection:'column', alignItems:'center', minHeight:'100vh', backgroundColor:'#0a0a0a', fontFamily:'Arial', padding:'20px 16px 60px' };
  const h1Style       = { background:'linear-gradient(90deg,#4376FF,#00cc66)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', fontSize:'2rem', marginBottom:'2px', fontWeight:'bold' };
  const subStyle      = { color:'#888', marginBottom:'8px', fontSize:'0.85rem' };
  const affirmStyle   = { color:'#aaa', fontSize:'0.88rem', textAlign:'center', fontStyle:'italic', marginBottom:'14px', maxWidth:'300px', lineHeight:'1.4' };
  const streakWrap    = { display:'flex', alignItems:'center', gap:'8px', backgroundColor:'#1a1a1a', padding:'10px 20px', borderRadius:'25px', marginBottom:'14px', border:'1px solid #333' };
  const streakNum     = { color:'#ff6b35', fontSize:'1.4rem', fontWeight:'bold' };
  const streakLabel   = { color:'#888', fontSize:'0.82rem' };
  const videoWrap     = { position:'relative' };
  const videoStyle    = { width:'300px', height:'225px', borderRadius:'20px', border:'3px solid #4376FF', backgroundColor:'#111', objectFit:'cover', display:'block' };
  const scanLine      = { position:'absolute', top:0, left:0, width:'100%', height:'3px', backgroundColor:'#00ff88', animation:'scan 1.5s linear infinite' };
  const btnWrap       = { marginTop:'14px', display:'flex', gap:'8px', flexWrap:'wrap', justifyContent:'center' };
  const btn1          = { padding:'12px 28px', backgroundColor:'#4376FF', color:'white', border:'none', borderRadius:'30px', fontSize:'0.95rem', cursor:'pointer', fontWeight:'bold' };
  const btn2on        = { padding:'12px 28px', backgroundColor:'#00cc66', color:'white', border:'none', borderRadius:'30px', fontSize:'0.95rem', cursor:'pointer', fontWeight:'bold' };
  const btn2off       = { padding:'12px 28px', backgroundColor:'#555', color:'white', border:'none', borderRadius:'30px', fontSize:'0.95rem', cursor:'not-allowed', fontWeight:'bold' };
  const voiceBtn      = { padding:'12px 18px', backgroundColor:'#ff6b35', color:'white', border:'none', borderRadius:'30px', fontSize:'0.95rem', cursor:'pointer', fontWeight:'bold' };
  const shareBtn      = { padding:'12px 18px', backgroundColor:'#7c3aed', color:'white', border:'none', borderRadius:'30px', fontSize:'0.95rem', cursor:'pointer', fontWeight:'bold' };
  const scoreLabel    = { color:'#888', margin:'0 0 5px 0', fontSize:'0.85rem' };
  const scoreHigh     = { fontSize:'3rem', fontWeight:'bold', color:'#00ff88', margin:0 };
  const scoreMid      = { fontSize:'3rem', fontWeight:'bold', color:'#ffaa00', margin:0 };
  const scoreLow      = { fontSize:'3rem', fontWeight:'bold', color:'#ff4444', margin:0 };
  const tipsWrap      = { marginTop:'12px', backgroundColor:'#0f1a0f', padding:'14px 18px', borderRadius:'15px', border:'1px solid #00cc66', maxWidth:'340px', width:'100%' };
  const tipsTitle     = { color:'#00cc66', fontSize:'0.85rem', marginBottom:'8px', fontWeight:'bold' };
  const tipItem       = { color:'#ccc', fontSize:'0.85rem', padding:'5px 0', borderBottom:'1px solid #1a2a1a' };
  const sectionTitle  = { color:'#555', fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'2px', margin:'18px 0 10px', textAlign:'center' };
  const badgesWrap    = { display:'flex', flexWrap:'wrap', gap:'8px', justifyContent:'center', maxWidth:'360px' };
  const badgeUnlocked = { backgroundColor:'#1a1a1a', border:'1px solid #333', borderRadius:'12px', padding:'8px 12px', textAlign:'center', minWidth:'75px' };
  const badgeLocked   = { backgroundColor:'#111', border:'1px dashed #2a2a2a', borderRadius:'12px', padding:'8px 12px', textAlign:'center', minWidth:'75px', opacity:0.35 };
  const badgeIcon     = { fontSize:'1.4rem' };
  const badgeTitle    = { color:'#fff', fontSize:'0.68rem', marginTop:'3px' };
  const graphWrap     = { maxWidth:'360px', width:'100%', backgroundColor:'#111', borderRadius:'15px', padding:'15px', border:'1px solid #222' };
  const graphBars     = { display:'flex', gap:'8px', alignItems:'flex-end', height:'80px', justifyContent:'center' };
  const graphDay      = { display:'flex', flexDirection:'column', alignItems:'center', gap:'3px' };
  const graphLabel    = { color:'#555', fontSize:'0.62rem' };
  const histItem      = { display:'flex', justifyContent:'space-between', alignItems:'center', backgroundColor:'#1a1a1a', padding:'10px 14px', borderRadius:'10px', marginBottom:'6px', border:'1px solid #222', maxWidth:'360px', width:'100%' };
  const histDate      = { color:'#555', fontSize:'0.72rem' };
  const histEmo       = { color:'#fff', fontSize:'0.82rem' };
  const clearBtn      = { marginTop:'8px', padding:'7px 18px', backgroundColor:'transparent', color:'#ff4444', border:'1px solid #ff4444', borderRadius:'20px', fontSize:'0.78rem', cursor:'pointer', display:'block', margin:'10px auto 0' };
  const popupWrap     = { position:'fixed', top:'20px', left:'50%', transform:'translateX(-50%)', backgroundColor:'#1a1a2e', border:'2px solid #4376FF', borderRadius:'20px', padding:'15px 25px', textAlign:'center', zIndex:1000 };
  const popupIcon     = { fontSize:'2rem', marginBottom:'4px' };
  const popupTitle    = { color:'#4376FF', fontWeight:'bold', fontSize:'1rem' };
  const popupDesc     = { color:'#aaa', fontSize:'0.8rem', marginTop:'3px' };

  // Dynamic styles (depend on state)
  const feedbackStyle   = { marginTop:'12px', backgroundColor:'#1a1a2e', padding:'18px 25px', borderRadius:'15px', color:'#fff', fontSize:'1rem', textAlign:'center', maxWidth:'340px', lineHeight:'1.5', border:'1px solid ' + moodColor };
  const emotionStyle    = { color:moodColor, fontSize:'1rem', marginTop:'8px', fontWeight:'bold' };
  const scoreBorder     = { marginTop:'15px', textAlign:'center', backgroundColor:'#111', padding:'18px 35px', borderRadius:'20px', border:'2px solid ' + moodColor };

  const getScoreStyle = (val) => {
    const v = val !== undefined ? val : score;
    if (v >= 85) return scoreHigh;
    if (v >= 70) return scoreMid;
    return scoreLow;
  };

  const last7 = history.slice(0, 7).reverse();

  return (
    <div style={wrap}>
      <style>{`@keyframes scan { 0%{top:0} 100%{top:calc(100% - 3px)} }`}</style>

      {newBadge && (
        <div style={popupWrap}>
          <div style={popupIcon}>{newBadge.icon}</div>
          <div style={popupTitle}>{newBadge.title}</div>
          <div style={popupDesc}>{newBadge.desc}</div>
        </div>
      )}

      <h1 style={h1Style}>DailyMirror AI</h1>
      <p style={subStyle}>Real AI face and emotion analysis</p>
      <p style={affirmStyle}>"{affirmation}"</p>

      <div style={streakWrap}>
        <span>🔥</span>
        <span style={streakNum}>{streak}</span>
        <span style={streakLabel}>din ka streak</span>
        {streak >= 7 && <span>⚡</span>}
      </div>

      <div style={videoWrap}>
        <video ref={videoRef} autoPlay style={videoStyle} />
        {analyzing && <div style={scanLine} />}
      </div>

      <div style={btnWrap}>
        {!started ? (
          <button onClick={startCamera} style={btn1}>Camera Start Karo</button>
        ) : (
          <>
            <button
              onClick={analyzeMe}
              disabled={analyzing || !modelsLoaded}
              style={analyzing ? btn2off : btn2on}
            >
              {analyzing ? 'Analyzing...' : !modelsLoaded ? 'Loading...' : 'AI Se Poocho'}
            </button>
            <button
              onClick={speaking ? stopSpeaking : () => speak(feedback)}
              disabled={!feedback}
              style={voiceBtn}
            >
              {speaking ? 'Stop' : 'Suno'}
            </button>
            {score && (
              <button onClick={shareResult} style={shareBtn}>Share</button>
            )}
          </>
        )}
      </div>

      {emotion && <p style={emotionStyle}>{emotion}</p>}

      {score !== null && (
        <div style={scoreBorder}>
          <p style={scoreLabel}>Aaj ka Mood Score</p>
          <p style={getScoreStyle()}>{score}/100</p>
        </div>
      )}

      {feedback && <div style={feedbackStyle}>{feedback}</div>}

      {tips.length > 0 && (
        <div style={tipsWrap}>
          <p style={tipsTitle}>Aaj ke liye Tips:</p>
          {tips.map((tip, i) => (
            <div key={i} style={tipItem}>{tip}</div>
          ))}
        </div>
      )}

      {last7.length > 0 && (
        <>
          <p style={sectionTitle}>Weekly Progress</p>
          <div style={graphWrap}>
            <div style={graphBars}>
              {last7.map((item, i) => {
                const barStyle = {
                  width: '28px',
                  height: Math.max(6, Math.round((item.score / 100) * 70)) + 'px',
                  backgroundColor: item.score >= 85 ? '#00ff88' : item.score >= 70 ? '#ffaa00' : '#ff4444',
                  borderRadius: '4px 4px 0 0',
                };
                return (
                  <div key={i} style={graphDay}>
                    <div style={barStyle} />
                    <span style={graphLabel}>{item.score}</span>
                    <span style={graphLabel}>{item.date.split('/')[0]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <p style={sectionTitle}>Achievements</p>
      <div style={badgesWrap}>
        {ACHIEVEMENTS.map(ach => (
          <div key={ach.id} style={unlockedBadges.includes(ach.id) ? badgeUnlocked : badgeLocked}>
            <div style={badgeIcon}>{ach.icon}</div>
            <div style={badgeTitle}>{ach.title}</div>
          </div>
        ))}
      </div>

      {history.length > 0 && (
        <>
          <p style={sectionTitle}>History</p>
          {history.slice(0, 7).map((item, i) => (
            <div key={i} style={histItem}>
              <span style={histDate}>{item.date} {item.time}</span>
              <span style={histEmo}>{moodData[item.emotion]?.emoji || '😐'} {item.emotion}</span>
              <span style={getScoreStyle(item.score)}>{item.score}</span>
            </div>
          ))}
          <button onClick={resetAll} style={clearBtn}>Reset All</button>
        </>
      )}
    </div>
  );
}