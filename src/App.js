import React, { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { auth, db, provider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, collection, onSnapshot, query, where, getDocs, addDoc, deleteDoc } from 'firebase/firestore';

const moodData = {
  happy:     { msg:'Waah! Aaj tu bahut khush lag raha hai!', sc:95, color:'#00ff88', emoji:'😊' },
  sad:       { msg:'Thoda sad lag raha hai — koi baat nahi!', sc:55, color:'#4376FF', emoji:'😢' },
  angry:     { msg:'Stress dikh raha hai — breathe karo!', sc:50, color:'#ff4444', emoji:'😠' },
  surprised: { msg:'Surprised expression! Excitement hai!', sc:70, color:'#ffaa00', emoji:'😲' },
  fearful:   { msg:'Nervous mat ho — tu capable hai!', sc:60, color:'#ff6b35', emoji:'😨' },
  disgusted: { msg:'Fresh start karte hain aaj!', sc:55, color:'#ff4444', emoji:'🤢' },
  neutral:   { msg:'Thoda smile karo — sab better lagega!', sc:75, color:'#ffaa00', emoji:'😐' },
};

export default function App() {
  const videoRef = useRef(null);
  const [user,         setUser]         = useState(null);
  const [started,      setStarted]      = useState(false);
  const [feedback,     setFeedback]     = useState('');
  const [score,        setScore]        = useState(null);
  const [analyzing,    setAnalyzing]    = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [emotion,      setEmotion]      = useState('');
  const [moodColor,    setMoodColor]    = useState('#4376FF');
  const [friendsMoods, setFriendsMoods] = useState([]);
  const [friendInput,  setFriendInput]  = useState('');
  const [myUsername,   setMyUsername]   = useState('');
  const [usernameSet,  setUsernameSet]  = useState(false);
  const [tab,          setTab]          = useState('scan');
  const [friendRequests, setFriendRequests] = useState([]);
  const [reactions, setReactions] = useState({});
  const [myNotifications, setMyNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [feedReactions, setFeedReactions] = useState({});

  useEffect(() => {
    onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        loadModels();
        const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', u.uid)));
        if (!userDoc.empty) {
          setMyUsername(userDoc.docs[0].data().username);
          setUsernameSet(true);
          listenFriendsMoods(u.uid);
          listenFriendRequests(u.uid);
          listenFriendRequests(u.uid);
          listenNotifications(u.uid);
        }
      } else {
        setUser(null);
      }
    });
  }, []);

  const loadModels = async () => {
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceExpressionNet.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      setModelsLoaded(true);
    } catch { console.log('Model error'); }
  };

  const listenFriendsMoods = (uid) => {
    const q = query(collection(db, 'moods'), where('visibleTo', 'array-contains', uid));
    onSnapshot(q, (snap) => {
      const moods = snap.docs.map(d => d.data()).sort((a,b) => b.timestamp - a.timestamp);
      setFriendsMoods(moods);
    });
  };

  const listenFriendRequests = (uid) => {
    const q = query(collection(db, 'friendRequests'), where('toUid', '==', uid));
    onSnapshot(q, (snap) => {
      setFriendRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  };
  const listenNotifications = (uid) => {
  const q = query(
    collection(db, 'notifications'),
    where('toUid', '==', uid)
  );
  onSnapshot(q, (snap) => {
    const notifs = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => b.timestamp - a.timestamp);
    setMyNotifications(notifs);
    if (notifs.some(n => !n.read)) setShowNotif(true);
  });
};

const listenReactions = (uid) => {
  const q = query(
    collection(db, 'reactions'),
    where('toUid', '==', uid)
  );
  onSnapshot(q, (snap) => {
    const reactionMap = {};
    snap.docs.forEach(d => {
      const data = d.data();
      const key = data.reaction;
      reactionMap[key] = (reactionMap[key] || 0) + 1;
    });
    setFeedReactions(reactionMap);
  });
};

const markAllRead = async () => {
  myNotifications.forEach(async (n) => {
    if (!n.read) {
      await setDoc(doc(db, 'notifications', n.id), { ...n, read: true });
    }
  });
  setShowNotif(false);
};
  const loginWithGoogle = async () => {
    try { await signInWithPopup(auth, provider); }
    catch (e) { console.log(e); }
  };

  const saveUsername = async () => {
    if (!myUsername.trim() || myUsername.length < 3) {
      alert('Username kam se kam 3 characters ka ho!'); return;
    }
    const existing = await getDocs(query(collection(db, 'users'), where('username', '==', myUsername)));
    if (!existing.empty) { alert('Yeh username le liya hai — dusra try karo!'); return; }
    await setDoc(doc(db, 'users', user.uid), { uid: user.uid, username: myUsername, name: user.displayName, photo: user.photoURL });
    setUsernameSet(true);
    listenFriendsMoods(user.uid);
    listenFriendRequests(user.uid);
    listenNotifications(user.uid);
    listenReactions(user.uid);
  };

  const sendFriendRequest = async () => {
    if (!friendInput.trim()) return;
    const found = await getDocs(query(collection(db, 'users'), where('username', '==', friendInput.trim())));
    if (found.empty) { alert('User nahi mila!'); return; }
    const toUser = found.docs[0].data();
    if (toUser.uid === user.uid) { alert('Apne aap ko friend nahi add kar sakte!'); return; }
    await addDoc(collection(db, 'friendRequests'), { fromUid: user.uid, fromUsername: myUsername, fromName: user.displayName, toUid: toUser.uid, toUsername: toUser.username });
    setFriendInput('');
    alert('Friend request bhej diya!');
  };

  const acceptFriendRequest = async (req) => {
    await setDoc(doc(db, 'users', user.uid, 'friends', req.fromUid), { uid: req.fromUid, username: req.fromUsername, name: req.fromName });
    await setDoc(doc(db, 'users', req.fromUid, 'friends', user.uid), { uid: user.uid, username: myUsername, name: user.displayName });
    await deleteDoc(doc(db, 'friendRequests', req.id));
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:true });
      videoRef.current.srcObject = stream;
      setStarted(true);
    } catch { setFeedback('Camera permission do!'); }
  };

  const analyzeMe = async () => {
    if (!modelsLoaded) { setFeedback('Wait karo — AI load ho raha hai!'); return; }
    setAnalyzing(true);
    setFeedback('AI analyze kar raha hai...');
    try {
      const det = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

      if (!det) { setFeedback('Face nahi dikh raha!'); setAnalyzing(false); return; }

      const dominant = Object.entries(det.expressions).sort((a,b) => b[1]-a[1])[0][0];
      const result   = moodData[dominant] || moodData.neutral;

      setEmotion(result.emoji + ' ' + dominant.toUpperCase());
      setFeedback(result.msg);
      setScore(result.sc);
      setMoodColor(result.color);

      if (user) {
  try {
    const myFriends = await getDocs(
      collection(db, 'users', user.uid, 'friends')
    );
    const friendUids = myFriends.docs.map(d => d.data().uid);
    const visibleTo  = [user.uid, ...friendUids];
    await setDoc(doc(db, 'moods', user.uid), {
      userId:    user.uid,
      username:  myUsername || 'user',
      name:      user.displayName || 'User',
      photo:     user.photoURL || '',
      emotion:   dominant,
      emoji:     result.emoji,
      score:     result.sc,
      color:     result.color,
      timestamp: Date.now(),
      visibleTo,
    });
  } catch (fireErr) {
    console.log('Firestore save error:', fireErr.message);
  }
}
    } catch (e) { setFeedback('Error aaya — dobara try karo!'); }
    setAnalyzing(false);
  };

  const timeAgo = (ts) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + ' min ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + ' hr ago';
    return Math.floor(hrs/24) + ' days ago';
  };
  const sendReaction = async (toUserId, reactionEmoji) => {
  try {
    await addDoc(collection(db, 'reactions'), {
      fromUid:      user.uid,
      fromName:     user.displayName,
      fromUsername: myUsername,
      toUid:        toUserId,
      reaction:     reactionEmoji,
      timestamp:    Date.now(),
    });
    const key = toUserId + reactionEmoji;
    setReactions(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setReactions(prev => ({ ...prev, [key]: false })), 2000);
  } catch (e) {
    console.log('Reaction error:', e.message);
  }
};

const checkOnFriend = async (friend) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      toUid:        friend.userId,
      fromName:     user.displayName,
      fromUsername: myUsername,
      message:      myUsername + ' is checking on you! You okay?',
      timestamp:    Date.now(),
      read:         false,
    });
    alert('Check on request bhej diya ' + friend.name + ' ko!');
  } catch (e) {
    console.log('Check on error:', e.message);
  }
};

  // Styles
  const wrap       = { display:'flex', flexDirection:'column', alignItems:'center', minHeight:'100vh', backgroundColor:'#0a0a0a', fontFamily:'Arial', padding:'20px 16px 80px' };
  const h1Style    = { background:'linear-gradient(90deg,#4376FF,#00cc66)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', fontSize:'2rem', marginBottom:'4px', fontWeight:'bold' };
  const loginWrap  = { textAlign:'center', marginTop:'80px' };
  const loginBtn   = { padding:'14px 30px', backgroundColor:'#4376FF', color:'white', border:'none', borderRadius:'30px', fontSize:'1rem', cursor:'pointer', fontWeight:'bold' };
  const inputStyle = { padding:'12px 18px', backgroundColor:'#1a1a1a', border:'1px solid #333', borderRadius:'25px', color:'white', fontSize:'0.95rem', width:'220px', outline:'none' };
  const smallBtn   = { padding:'10px 20px', backgroundColor:'#00cc66', color:'white', border:'none', borderRadius:'25px', fontSize:'0.9rem', cursor:'pointer', fontWeight:'bold' };
  const tabWrap    = { display:'flex', gap:'8px', marginBottom:'20px' };
  const tabActive  = { padding:'10px 24px', backgroundColor:'#4376FF', color:'white', border:'none', borderRadius:'25px', fontSize:'0.9rem', cursor:'pointer', fontWeight:'bold' };
  const tabInactive= { padding:'10px 24px', backgroundColor:'#1a1a1a', color:'#888', border:'1px solid #333', borderRadius:'25px', fontSize:'0.9rem', cursor:'pointer' };
  const videoStyle = { width:'300px', height:'225px', borderRadius:'20px', border:'3px solid #4376FF', backgroundColor:'#111', objectFit:'cover', display:'block' };
  const scanLine   = { position:'absolute', top:0, left:0, width:'100%', height:'3px', backgroundColor:'#00ff88', animation:'scan 1.5s linear infinite' };
  const btn2on     = { padding:'12px 28px', backgroundColor:'#00cc66', color:'white', border:'none', borderRadius:'30px', fontSize:'0.95rem', cursor:'pointer', fontWeight:'bold', marginTop:'12px' };
  const btn2off    = { padding:'12px 28px', backgroundColor:'#555', color:'white', border:'none', borderRadius:'30px', fontSize:'0.95rem', cursor:'not-allowed', fontWeight:'bold', marginTop:'12px' };
  const feedStyle  = { marginTop:'12px', backgroundColor:'#1a1a2e', padding:'16px 22px', borderRadius:'15px', color:'#fff', fontSize:'0.95rem', textAlign:'center', maxWidth:'320px', border:'1px solid ' + moodColor };
  const emoStyle   = { color:moodColor, fontSize:'1rem', marginTop:'8px', fontWeight:'bold' };
  const scoreWrap  = { marginTop:'12px', textAlign:'center', backgroundColor:'#111', padding:'16px 32px', borderRadius:'18px', border:'2px solid ' + moodColor };
  const scoreHigh  = { fontSize:'2.8rem', fontWeight:'bold', color:'#00ff88', margin:0 };
  const scoreMid   = { fontSize:'2.8rem', fontWeight:'bold', color:'#ffaa00', margin:0 };
  const scoreLow   = { fontSize:'2.8rem', fontWeight:'bold', color:'#ff4444', margin:0 };
  const feedCard   = { backgroundColor:'#111', border:'1px solid #222', borderRadius:'16px', padding:'14px 18px', marginBottom:'10px', maxWidth:'360px', width:'100%', display:'flex', alignItems:'center', gap:'12px' };
  const feedAvatar = { width:'44px', height:'44px', borderRadius:'50%', objectFit:'cover', border:'2px solid #333' };
  const feedName   = { color:'#fff', fontSize:'0.9rem', fontWeight:'bold' };
  const feedTime   = { color:'#555', fontSize:'0.75rem', marginTop:'2px' };
  const feedEmoji  = { fontSize:'2rem' };
  const reqCard    = { backgroundColor:'#1a1a2e', border:'1px solid #4376FF', borderRadius:'14px', padding:'12px 16px', marginBottom:'8px', maxWidth:'360px', width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center' };
  const acceptBtn  = { padding:'8px 16px', backgroundColor:'#00cc66', color:'white', border:'none', borderRadius:'20px', fontSize:'0.82rem', cursor:'pointer', fontWeight:'bold' };
  const logoutBtn  = { padding:'8px 18px', backgroundColor:'transparent', color:'#ff4444', border:'1px solid #ff4444', borderRadius:'20px', fontSize:'0.8rem', cursor:'pointer' };
  const userInfo   = { display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' };
  const userAvatar = { width:'36px', height:'36px', borderRadius:'50%' };
  const userName   = { color:'#fff', fontSize:'0.9rem', fontWeight:'bold' };
  const userHandle = { color:'#555', fontSize:'0.78rem' };
  // Yeh variables styles section mein add karo (return ke UPAR):
  const loginSubText  = { color:'#888', marginBottom:'30px', fontSize:'1rem' };
  const loginEmoji    = { fontSize:'4rem', marginBottom:'20px' };
  const usernameWrap  = { marginTop:'60px', textAlign:'center' };
  const usernameTitle = { color:'#fff', fontSize:'1.1rem', marginBottom:'8px' };
  const usernameSub   = { color:'#888', fontSize:'0.85rem', marginBottom:'24px' };
  const usernameRow   = { display:'flex', gap:'8px', justifyContent:'center', flexWrap:'wrap' };
  const videoRelative  = { position:'relative' };
  const startBtn       = { padding:'12px 28px', backgroundColor:'#4376FF', color:'white', border:'none', borderRadius:'30px', fontSize:'0.95rem', cursor:'pointer', fontWeight:'bold', marginTop:'12px' };
  const scoreLabelSm   = { color:'#888', margin:'0 0 4px', fontSize:'0.82rem' };
  const feedSubText    = { color:'#888', fontSize:'0.85rem', marginBottom:'14px' };
  const emptyFeedText  = { color:'#555', textAlign:'center', marginTop:'40px' };
  const reqTitle       = { color:'#4376FF', fontSize:'0.85rem', marginBottom:'10px', alignSelf:'flex-start' };
  const reqFromName    = { color:'#fff', fontSize:'0.9rem', fontWeight:'bold' };
  const reqFromHandle  = { color:'#555', fontSize:'0.78rem' };
  const addFriendTitle = { color:'#888', fontSize:'0.85rem', margin:'14px 0 10px', alignSelf:'flex-start' };
  const addFriendRow   = { display:'flex', gap:'8px', flexWrap:'wrap', justifyContent:'center' };
  const reactionsRow   = { display:'flex', gap:'6px', marginTop:'8px', flexWrap:'wrap' };
  const reactionBtn    = { padding:'4px 10px', backgroundColor:'#1a1a2e', border:'1px solid #333', borderRadius:'15px', fontSize:'0.85rem', cursor:'pointer', color:'white' };
  const reactionSent   = { padding:'4px 10px', backgroundColor:'#4376FF', border:'1px solid #4376FF', borderRadius:'15px', fontSize:'0.85rem', cursor:'pointer', color:'white' };
  const checkOnBtnStyle = { marginTop:'6px', padding:'5px 12px', backgroundColor:'transparent', border:'1px solid #ff6b35', borderRadius:'15px', fontSize:'0.78rem', cursor:'pointer', color:'#ff6b35' };
  const notifBell    = { position:'relative', cursor:'pointer', fontSize:'1.4rem' };
  const notifDot     = { position:'absolute', top:'-4px', right:'-4px', width:'10px', height:'10px', backgroundColor:'#ff4444', borderRadius:'50%' };
  const notifPanel   = { backgroundColor:'#1a1a2e', border:'1px solid #4376FF', borderRadius:'16px', padding:'16px', maxWidth:'360px', width:'100%', marginBottom:'16px' };
  const notifTitle   = { color:'#4376FF', fontSize:'0.88rem', fontWeight:'bold', marginBottom:'10px' };
  const notifItem    = { backgroundColor:'#111', borderRadius:'10px', padding:'10px 14px', marginBottom:'6px', color:'#fff', fontSize:'0.85rem' };
  const notifTime    = { color:'#555', fontSize:'0.72rem', marginTop:'3px' };
  const reactionCount = { backgroundColor:'#1a1a2e', borderRadius:'10px', padding:'8px 12px', marginTop:'8px', color:'#aaa', fontSize:'0.82rem' };

  const getScoreStyle = (v) => {
    if (v >= 85) return scoreHigh;
    if (v >= 70) return scoreMid;
    return scoreLow;
  };

  if (!user) {
    return (
      <div style={wrap}>
        <h1 style={h1Style}>DailyMirror AI</h1>
        <div style={loginWrap}>
          <p style={loginSubText}>
            Apne doston ka mood dekho — real time mein!
          </p>
          <div style={loginEmoji}>🪞</div>
          <button onClick={loginWithGoogle} style={loginBtn}>
            Google se Login Karo
          </button>
        </div>
      </div>
    );
  }

  if (!usernameSet) {
    return (
      <div style={wrap}>
        <h1 style={h1Style}>DailyMirror AI</h1>
        <div style={usernameWrap}>
          <p style={usernameTitle}>Apna username choose karo</p>
          <p style={usernameSub}>Doston ko yahi username se dhundhna hoga</p>
          <div style={usernameRow}>
            <input
              style={inputStyle}
              placeholder="@username"
              value={myUsername}
              onChange={e => setMyUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))}
            />
            <button onClick={saveUsername} style={smallBtn}>Save</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <style>{`@keyframes scan { 0%{top:0} 100%{top:calc(100% - 3px)} }`}</style>

      <h1 style={h1Style}>DailyMirror AI</h1>

      <div style={userInfo}>
        <img src={user.photoURL} alt="" style={userAvatar} />
        <div>
          <div style={userName}>{user.displayName}</div>
          <div style={userHandle}>@{myUsername}</div>
        </div>
        <button onClick={() => signOut(auth)} style={logoutBtn}>Logout</button>
        <div style={notifBell} onClick={() => setShowNotif(!showNotif)}>
  🔔
  {myNotifications.some(n => !n.read) && <div style={notifDot} />}
</div>
      </div>
      {showNotif && myNotifications.length > 0 && (
  <div style={notifPanel}>
    <div style={notifTitle}>
      Notifications ({myNotifications.filter(n => !n.read).length} new)
    </div>
    {myNotifications.slice(0, 5).map((n, i) => (
      <div key={i} style={notifItem}>
        <div>{n.fromUsername} — {n.message}</div>
        <div style={notifTime}>{timeAgo(n.timestamp)}</div>
      </div>
    ))}
    <button onClick={markAllRead} style={checkOnBtnStyle}>
      Mark all read
    </button>
  </div>
)}
      <div style={tabWrap}>
        <button onClick={() => setTab('scan')}    style={tab==='scan'    ? tabActive : tabInactive}>Scan</button>
        <button onClick={() => setTab('feed')}    style={tab==='feed'    ? tabActive : tabInactive}>Friends Feed</button>
        <button onClick={() => setTab('friends')} style={tab==='friends' ? tabActive : tabInactive}>Friends</button>
      </div>

            {tab === 'scan' && (
        <>
          <div style={videoRelative}>
            <video ref={videoRef} autoPlay style={videoStyle} />
            {analyzing && <div style={scanLine} />}
          </div>

          {!started ? (
            <button onClick={startCamera} style={startBtn}>
              Camera Start Karo
            </button>
          ) : (
            <button
              onClick={analyzeMe}
              disabled={analyzing || !modelsLoaded}
              style={analyzing ? btn2off : btn2on}
            >
              {analyzing ? 'Analyzing...' : !modelsLoaded ? 'Loading...' : 'AI Se Poocho'}
            </button>
          )}

          {emotion && <p style={emoStyle}>{emotion}</p>}

          {score !== null && (
            <div style={scoreWrap}>
              <p style={scoreLabelSm}>Mood Score</p>
              <p style={getScoreStyle(score)}>{score}/100</p>
            </div>
          )}

          {feedback && <div style={feedStyle}>{feedback}</div>}
        </>
      )}

      {tab === 'feed' && (
        <>
          <p style={feedSubText}>Doston ka aaj ka mood</p>
          {friendsMoods.length === 0 ? (
            <p style={emptyFeedText}>
              Abhi koi friend nahi hai ya kisi ne scan nahi kiya!
            </p>
          ) : (
            friendsMoods.map((m, i) => {
              const dynamicCard   = { backgroundColor:'#111', border:'1px solid #222', borderRadius:'16px', padding:'14px 18px', marginBottom:'10px', maxWidth:'360px', width:'100%', display:'flex', alignItems:'center', gap:'12px', borderLeft:'3px solid ' + m.color };
              const dynamicFlex   = { flex:1 };
              const dynamicHandle = { color:'#888', fontSize:'0.78rem' };
              const dynamicScore  = { color:m.color, fontSize:'0.82rem', marginTop:'3px' };
              return (
                <div key={i} style={dynamicCard}>
                  {m.photo && <img src={m.photo} alt="" style={feedAvatar} />}
                  <div style={dynamicFlex}>
                    <div style={feedName}>{m.name}</div>
                    <div style={dynamicHandle}>@{m.username}</div>
                    <div style={dynamicScore}>Score: {m.score}/100</div>
                    <div style={feedTime}>{timeAgo(m.timestamp)}</div>
                    <div style={reactionsRow}>
  {['❤️','🤗','☕','🎵','💪'].map(emoji => {
    const key = m.userId + emoji;
    return (
      <button
        key={emoji}
        onClick={() => sendReaction(m.userId, emoji)}
        style={reactions[key] ? reactionSent : reactionBtn}
      >
        {emoji}
      </button>
    );
  })}
</div>
{Object.keys(feedReactions).length > 0 && m.userId === user.uid && (
  <div style={reactionCount}>
    Reactions received: {Object.entries(feedReactions).map(([e, c]) => e + ' x' + c + '  ')}
  </div>
)}
<button
  onClick={() => checkOnFriend(m)}
  style={checkOnBtnStyle}
>
  Check On Them
</button>
                  </div>
                  <div style={feedEmoji}>{m.emoji}</div>
                </div>
              );
            })
          )}
        </>
      )}

      {tab === 'friends' && (
        <>
          {friendRequests.length > 0 && (
            <>
              <p style={reqTitle}>
                Friend Requests ({friendRequests.length})
              </p>
              {friendRequests.map(req => (
                <div key={req.id} style={reqCard}>
                  <div>
                    <div style={reqFromName}>{req.fromName}</div>
                    <div style={reqFromHandle}>@{req.fromUsername}</div>
                  </div>
                  <button onClick={() => acceptFriendRequest(req)} style={acceptBtn}>
                    Accept
                  </button>
                </div>
              ))}
            </>
          )}

          <p style={addFriendTitle}>Friend Add Karo</p>
          <div style={addFriendRow}>
            <input
              style={inputStyle}
              placeholder="@username dhundho"
              value={friendInput}
              onChange={e => setFriendInput(e.target.value)}
            />
            <button onClick={sendFriendRequest} style={smallBtn}>
              Send Request
            </button>
          </div>
        </>
      )}
    </div>
  );
}