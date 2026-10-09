const express = require('express');
const fs = require('fs');
const app = express();
app.use(express.json());

const DB = 'keys.json';

function loadKeys() {
    if (!fs.existsSync(DB)) fs.writeFileSync(DB, '{}');
    return JSON.parse(fs.readFileSync(DB));
}

function saveKeys(data) {
    fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

// App valida key
app.post('/validate', (req, res) => {
    const { key, device_id } = req.body;
    if (!key || !device_id) return res.json({ valid: false, msg: 'Dados inválidos' });

    const keys = loadKeys();
    const k = keys[key];

    if (!k) return res.json({ valid: false, msg: 'Key não encontrada' });
    if (new Date() > new Date(k.expires)) return res.json({ valid: false, msg: 'Key expirada' });
    if (k.device_id && k.device_id !== device_id) return res.json({ valid: false, msg: 'Key em outro dispositivo' });

    // Vincula dispositivo na primeira vez
    if (!k.device_id) {
        keys[key].device_id = device_id;
        saveKeys(keys);
    }

    res.json({ valid: true, msg: 'OK' });
});

// Painel — criar key
app.post('/admin/create', (req, res) => {
    const { password, days } = req.body;
    if (password !== process.env.ADMIN_PASS) return res.status(403).json({ msg: 'Negado' });

    const keys = loadKeys();
    const code = 'DUD0-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    const expires = new Date();
    expires.setDate(expires.getDate() + (days || 30));

    keys[code] = { expires: expires.toISOString(), device_id: null };
    saveKeys(keys);

    res.json({ key: code, expires });
});

// Painel — listar keys
app.get('/admin/keys', (req, res) => {
    const { password } = req.query;
    if (password !== process.env.ADMIN_PASS) return res.status(403).json({ msg: 'Negado' });
    res.json(loadKeys());
});

// Painel — deletar key
app.delete('/admin/delete/:key', (req, res) => {
    const { password } = req.body;
    if (password !== process.env.ADMIN_PASS) return res.status(403).json({ msg: 'Negado' });
    const keys = loadKeys();
    delete keys[req.params.key];
    saveKeys(keys);
    res.json({ msg: 'Deletada' });
});

app.listen(3000, () => console.log('Rodando'));
