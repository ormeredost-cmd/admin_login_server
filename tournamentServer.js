const express = require('express');
const cors = require('cors');
const { db, initDb } = require('./database');

const app = express();
const PORT = process.env.TOURNAMENT_PORT || 5001;

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

let slotCache = {};

initDb().then(() => {
  console.log('✅ BGMI Tournament Server Ready');
});

// 🔥 CHECK JOIN
app.get('/api/check-join/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { bgmiId } = req.query;

    if (!bgmiId) {
      return res.json({ joined: false });
    }

    await db.read();
    const joined = db.data.tournamentJoins?.some(
      j => j.tournament_id === tournamentId && j.bgmiId === bgmiId
    ) || false;

    res.json({ joined });
  } catch (error) {
    res.status(500).json({ joined: false });
  }
});

// 🔥 SLOTS COUNT
app.get('/api/tournament-slots-count/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    await db.read();
    const count = db.data.tournamentJoins?.filter(j => j.tournament_id === tournamentId).length || 0;
    res.json({ registered: count, maxSlots: 2 });
  } catch (error) {
    res.status(500).json({ registered: 0, maxSlots: 2 });
  }
});

// 🔥 MY MATCHES
app.get('/api/my-matches', async (req, res) => {
  try {
    const { bgmiId } = req.query;
    await db.read();
    const matches = (db.data.tournamentJoins || []).filter(j => j.bgmiId === bgmiId);
    res.json({ matches });
  } catch (error) {
    res.json({ matches: [] });
  }
});

// 🔥 JOIN TOURNAMENT - REAL DATE/TIME FROM FRONTEND
app.post('/api/join-tournament', async (req, res) => {
  const { 
    tournamentId, tournamentName, mode, rules, date, time, map, 
    entryFee, prizePool, slots, playerName, bgmiId, status, joinedAt 
  } = req.body;

  console.log('📥 RAW DATA:', { date, time, entryFee, prizePool });

  // ✅ NO HARDCODE - USE FRONTEND REAL DATA
  const entryFeeFinal = parseInt(entryFee) || 50;
  const prizePoolFinal = parseInt(prizePool) || 80;
  const dateFinal = date || new Date().toLocaleDateString('en-IN');
  const timeFinal = time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  console.log('📅 FINAL DATA:', { dateFinal, timeFinal, entryFeeFinal, prizePoolFinal });

  if (!playerName || !bgmiId || !tournamentId) {
    return res.status(400).json({ success: false, message: 'Missing player data' });
  }

  try {
    await db.read();

    const joins = db.data.tournamentJoins?.filter(j => j.tournament_id === tournamentId) || [];
    if (joins.length >= 2) {
      return res.json({ success: false, message: 'Tournament Full! (2/2)' });
    }

    const alreadyJoined = db.data.tournamentJoins?.some(
      j => j.tournament_id === tournamentId && j.bgmiId === bgmiId
    );
    if (alreadyJoined) {
      return res.json({ success: false, message: 'You already joined!' });
    }

    const joinData = {
      id: Date.now().toString(),
      tournament_id: tournamentId,
      tournamentName: tournamentName || 'TDM Match',
      playerName,
      bgmiId,
      mode: mode || 'TDM',
      rules: rules || 'Classic TDM',
      entryFee: entryFeeFinal,     // ✅ ₹50 SAVED
      prizePool: prizePoolFinal,   // ✅ ₹80 SAVED
      date: dateFinal,            // ✅ REAL DATE FROM TOURNAMENT
      time: timeFinal,            // ✅ REAL TIME FROM TOURNAMENT
      map: map || 'Erangel',
      slots: slots || 0,
      status: 'Registered',
      joinedAt: joinedAt || new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    if (!db.data.tournamentJoins) db.data.tournamentJoins = [];
    db.data.tournamentJoins.push(joinData);
    await db.write();

    console.log('✅ SAVED:', { playerName, date: dateFinal, time: timeFinal });
    res.json({ success: true, joinData });
  } catch (error) {
    console.error('❌ SAVE ERROR:', error);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// 🔥 ADMIN PANEL
app.get('/api/admin/joins', async (req, res) => {
  try {
    await db.read();
    const tournamentJoins = db.data.tournamentJoins || [];
    const sortedJoins = tournamentJoins.sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt));
    
    res.json({
      tournamentJoins: sortedJoins,
      totalEntries: sortedJoins.length,
      totalPrize: sortedJoins.reduce((sum, j) => sum + (j.entryFee || 0), 0)
    });
  } catch (error) {
    res.status(500).json({ tournamentJoins: [], totalEntries: 0 });
  }
});

// 🔥 DELETE ENTRY
app.delete('/api/admin/tournament/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.read();
    
    const index = db.data.tournamentJoins?.findIndex(j => j.id === id);
    if (index !== -1) {
      const deleted = db.data.tournamentJoins.splice(index, 1)[0];
      await db.write();
      console.log('🗑️ DELETED:', deleted.playerName);
      return res.json({ success: true, message: `Deleted: ${deleted.playerName}` });
    }
    
    res.status(404).json({ error: 'Entry not found' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🎮 BGMI SERVER: http://localhost:${PORT}`);
  console.log(`✅ APIs: /api/join-tournament, /api/admin/joins`);
});
