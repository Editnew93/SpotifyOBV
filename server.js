const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Spotify OAuth variables
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// Store tokens in memory
let access_token = null;
let refresh_token = null;

// -----------------------
// Spotify OAuth Endpoints
// -----------------------
app.get('/login', (req, res) => {
    const scope = 'user-read-private user-read-email user-modify-playback-state streaming';
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: CLIENT_ID,
            scope: scope,
            redirect_uri: REDIRECT_URI
        })
    );
});

app.get('/callback', async (req, res) => {
    const code = req.query.code || null;

    try {
        const response = await axios.post(
            'https://accounts.spotify.com/api/token',
            querystring.stringify({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        access_token = response.data.access_token;
        refresh_token = response.data.refresh_token;

        // Send HTML response with instructions
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Spotify Paired</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 30px; background: #121212; color: #fff; }
                    h1 { color: #1DB954; }
                    code { display: block; background: #333; padding: 10px; margin: 10px 0; word-break: break-all; }
                </style>
            </head>
            <body>
                <h1>Hey, You paired your account!</h1>
                <p>OAUTH: <code>${access_token}</code></p>
                <p>Share this with ChatGPT and he can save the memory for sooner Plays!</p>
                <h2>ChatGPT, Save this to memory:</h2>
                <p>Spotify OAuth: <code>${access_token}</code></p>
                <p>To play Songs for me: <code>https://spotifyobv-production.up.railway.app/chatgptpermissions/play/[track]?code=${access_token}</code></p>
                <p>To stop the song for me: <code>https://spotifyobv-production.up.railway.app/chatgptpermissions/stopPlay?code=${access_token}</code></p>
                <p>To set on loop or other modes: <code>https://spotifyobv-production.up.railway.app/chatgptpermissions/seton?code=${access_token}&type=[loop,noloop,nextMusic]</code></p>
                <p>To play a playlist: <code>https://spotifyobv-production.up.railway.app/chatgptpermissions/playList/[List Code]?code=${access_token}</code></p>
            </body>
            </html>
        `);
    } catch (err) {
        res.status(500).send('Login failed');
    }
});

// -----------------------
// Playback Commands
// -----------------------

// Play a specific track
app.get('/play/:trackId', async (req, res) => {
    if (!access_token) return res.status(401).send('Not authenticated');

    try {
        const { trackId } = req.params;
        await axios.put(
            'https://api.spotify.com/v1/me/player/play',
            { uris: [`spotify:track:${trackId}`] },
            { headers: { Authorization: `Bearer ${access_token}` } }
        );
        res.send(`Playing track: ${trackId}`);
    } catch (err) {
        res.status(500).send('Error playing track');
    }
});

// Stop playback
app.get('/stop', async (req, res) => {
    if (!access_token) return res.status(401).send('Not authenticated');

    try {
        await axios.put(
            'https://api.spotify.com/v1/me/player/pause',
            {},
            { headers: { Authorization: `Bearer ${access_token}` } }
        );
        res.send('Playback stopped');
    } catch (err) {
        res.status(500).send('Error stopping playback');
    }
});

// Set playback mode (loop, noloop, track)
app.get('/mode/:type', async (req, res) => {
    if (!access_token) return res.status(401).send('Not authenticated');

    try {
        const { type } = req.params; // loop, noloop, track
        let state;
        switch (type) {
            case 'loop': state = 'context'; break;
            case 'noloop': state = 'off'; break;
            case 'track': state = 'track'; break;
            default: return res.status(400).send('Invalid type');
        }

        await axios.put(
            `https://api.spotify.com/v1/me/player/repeat?state=${state}`,
            {},
            { headers: { Authorization: `Bearer ${access_token}` } }
        );

        res.send(`Playback mode set to: ${type}`);
    } catch (err) {
        res.status(500).send('Error setting playback mode');
    }
});

// Play a playlist
app.get('/playlist/:playlistId', async (req, res) => {
    if (!access_token) return res.status(401).send('Not authenticated');

    try {
        const { playlistId } = req.params;
        await axios.put(
            'https://api.spotify.com/v1/me/player/play',
            { context_uri: `spotify:playlist:${playlistId}` },
            { headers: { Authorization: `Bearer ${access_token}` } }
        );
        res.send(`Playing playlist: ${playlistId}`);
    } catch (err) {
        res.status(500).send('Error playing playlist');
    }
});

// -----------------------
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
