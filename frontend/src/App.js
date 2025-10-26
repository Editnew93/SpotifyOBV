import React, { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [token, setToken] = useState('');

  const handleLogin = () => {
    window.location.href = 'http://localhost:3000/login';
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      axios.get(`http://localhost:3000/callback?code=${code}`)
        .then(res => setToken(res.data.access_token))
        .catch(console.error);
    }
  }, []);

  return (
    <div>
      <h1>Spotify Linker</h1>
      {!token ? <button onClick={handleLogin}>Login with Spotify</button> :
        <p>Logged in! You can now play music.</p>}
    </div>
  );
}

export default App;