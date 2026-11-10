require('dotenv').config();
const https = require('https');
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const session = require('express-session');
const { rateLimit } = require('express-rate-limit');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'carometro',
  waitForConnections: true,
  connectionLimit: 10,
});

const app = express();
app.use(express.json({ limit: '5mb' }));

const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const usuarios = [
  {
    nome: process.env.ADMIN_USERNAME || 'adm',
    senha: process.env.ADMIN_PASSWORD || '',
    perfil: 'admin',
  },
  {
    nome: process.env.VISITOR_USERNAME || 'visitante',
    senha: process.env.VISITOR_PASSWORD || '',
    perfil: 'visitor',
  },
].filter((usuario) => usuario.senha);

app.use(
  session({
    name: 'carometro.sid',
    secret:
      process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      maxAge: 8 * 60 * 60 * 1000,
    },
  })
);

function exigirLogin(req, res, next) {
  if (req.session.usuario) return next();
  if (req.path.startsWith('/api/'))
    return res.status(401).json({ erro: 'Faça login para continuar' });
  res.redirect('/login');
}

function exigirAdmin(req, res, next) {
  if (req.session.usuario?.perfil === 'admin') return next();
  res.status(403).json({ erro: 'Apenas o administrador pode alterar dados' });
}

function compararSegredos(a, b) {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

const limitarLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

app.get('/login', (req, res) => {
  if (req.session.usuario) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/logo.svg', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'logo.svg'))
);
app.get('/students.svg', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'students.svg'))
);
app.get('/login.css', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'login.css'))
);
app.get('/login.js', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'login.js'))
);

app.get(['/', '/index.html'], exigirLogin, (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);
app.get('/app.js', exigirLogin, (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'app.js'))
);
app.get('/style.css', exigirLogin, (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'style.css'))
);
app.use('/uploads', exigirLogin, express.static(UPLOAD_DIR));

app.get('/api/auth/status', (req, res) => {
  res.json({ configurado: usuarios.length === 2 });
});

app.post('/api/auth/login', limitarLogin, async (req, res) => {
  if (usuarios.length !== 2)
    return res
      .status(503)
      .json({ erro: 'Configure as senhas dos usuários no .env' });

  const nome = String(req.body.usuario || '');
  const senha = String(req.body.senha || '');
  const usuario = usuarios.find(
    (item) =>
      compararSegredos(item.nome, nome) && compararSegredos(item.senha, senha)
  );
  if (!usuario)
    return res.status(401).json({ erro: 'Usuário ou senha inválidos' });

  try {
    await new Promise((resolve, reject) => {
      req.session.regenerate((err) => (err ? reject(err) : resolve()));
    });
    req.session.usuario = { nome: usuario.nome, perfil: usuario.perfil };
    res.json({ usuario: req.session.usuario });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Não foi possível iniciar a sessão' });
  }
});

app.get('/api/auth/me', exigirLogin, (req, res) => {
  res.json({ usuario: req.session.usuario });
});

app.post('/api/auth/logout', exigirLogin, (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ erro: 'Não foi possível sair' });
    res.clearCookie('carometro.sid', { httpOnly: true, sameSite: 'lax' });
    res.status(204).end();
  });
});

app.post('/api/fotos', exigirLogin, exigirAdmin, (req, res) => {
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(
    String(req.body.imagem || '')
  );
  if (!m) return res.status(400).json({ erro: 'Imagem inválida' });
  const nome = crypto.randomUUID() + '.jpg';
  fs.writeFile(
    path.join(UPLOAD_DIR, nome),
    Buffer.from(m[1], 'base64'),
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ erro: 'Erro ao salvar foto' });
      }
      res.status(201).json({ url: '/uploads/' + nome });
    }
  );
});

app.get('/api/turmas', exigirLogin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nome FROM turmas ORDER BY nome'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar turmas' });
  }
});

app.post('/api/turmas', exigirLogin, exigirAdmin, async (req, res) => {
  const nome = String(req.body.nome || '').trim();
  if (!nome || nome.length > 50)
    return res
      .status(400)
      .json({ erro: 'Informe um nome de até 50 caracteres' });

  try {
    const [result] = await pool.query('INSERT INTO turmas (nome) VALUES (?)', [
      nome,
    ]);
    res.status(201).json({ id: result.insertId, nome });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res
        .status(409)
        .json({ erro: 'Já existe uma turma com esse nome' });
    console.error(err);
    res.status(500).json({ erro: 'Erro ao gerar turma' });
  }
});

app.put('/api/turmas/:id', exigirLogin, exigirAdmin, async (req, res) => {
  const turmaId = Number(req.params.id);
  const nome = String(req.body.nome || '').trim();
  if (!Number.isInteger(turmaId) || turmaId <= 0)
    return res.status(400).json({ erro: 'Turma inválida' });
  if (!nome || nome.length > 50)
    return res
      .status(400)
      .json({ erro: 'Informe um nome de até 50 caracteres' });

  try {
    const [result] = await pool.query(
      'UPDATE turmas SET nome = ? WHERE id = ?',
      [nome, turmaId]
    );
    if (!result.affectedRows)
      return res.status(404).json({ erro: 'Turma não encontrada' });
    res.json({ id: turmaId, nome });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res
        .status(409)
        .json({ erro: 'Já existe uma turma com esse nome' });
    console.error(err);
    res.status(500).json({ erro: 'Erro ao renomear turma' });
  }
});

app.delete('/api/turmas/:id', exigirLogin, exigirAdmin, async (req, res) => {
  const turmaId = Number(req.params.id);
  if (!Number.isInteger(turmaId) || turmaId <= 0)
    return res.status(400).json({ erro: 'Turma inválida' });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [turmas] = await connection.query(
      'SELECT id FROM turmas WHERE id = ? FOR UPDATE',
      [turmaId]
    );
    if (!turmas.length) {
      await connection.rollback();
      return res.status(404).json({ erro: 'Turma não encontrada' });
    }

    await connection.query('DELETE FROM alunos WHERE turma_id = ?', [turmaId]);
    await connection.query('DELETE FROM turmas WHERE id = ?', [turmaId]);
    await connection.commit();
    res.status(204).end();
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    console.error(err);
    res.status(500).json({ erro: 'Erro ao excluir turma' });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/api/alunos', exigirLogin, async (req, res) => {
  try {
    const params = [];
    let sql = `SELECT a.id, a.nome, a.email, a.telefone, a.foto_url, a.turma_id, t.nome AS turma
               FROM alunos a JOIN turmas t ON t.id = a.turma_id WHERE 1=1`;
    if (req.query.turma) {
      sql += ' AND t.id = ?';
      params.push(Number(req.query.turma));
    }
    if (req.query.q) {
      sql += ' AND (a.nome LIKE ? OR a.email LIKE ? OR a.telefone LIKE ?)';
      const like = `%${req.query.q}%`;
      params.push(like, like, like);
    }
    sql += ' ORDER BY t.nome, a.nome';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar alunos' });
  }
});

const DEFAULT_FOTO = 'https://randomuser.me/api/portraits/lego/1.jpg';

function validar(body) {
  const nome = String(body.nome || '').trim();
  const email = String(body.email || '').trim();
  const telefone = String(body.telefone || '').trim();
  const foto_url = String(body.foto_url || '').trim() || DEFAULT_FOTO;
  const turma_id = Number(body.turma_id);
  if (!nome || !email || !telefone || !Number.isInteger(turma_id)) return null;
  if (!/^(https?:\/\/|\/uploads\/[\w-]+\.jpg$)/i.test(foto_url)) return null;
  return { nome, email, telefone, foto_url, turma_id };
}

function erroSql(err, res, msg) {
  if (err.code === 'ER_DUP_ENTRY')
    return res.status(409).json({ erro: 'Email já cadastrado' });
  if (err.code === 'ER_NO_REFERENCED_ROW_2')
    return res.status(400).json({ erro: 'Turma inválida' });
  console.error(err);
  res.status(500).json({ erro: msg });
}

app.post('/api/alunos', exigirLogin, exigirAdmin, async (req, res) => {
  const d = validar(req.body);
  if (!d) return res.status(400).json({ erro: 'Dados inválidos' });
  try {
    const [r] = await pool.query('INSERT INTO alunos SET ?', d);
    res.status(201).json({ id: r.insertId });
  } catch (err) {
    erroSql(err, res, 'Erro ao adicionar aluno');
  }
});

app.put('/api/alunos/:id', exigirLogin, exigirAdmin, async (req, res) => {
  const d = validar(req.body);
  if (!d) return res.status(400).json({ erro: 'Dados inválidos' });
  try {
    const [r] = await pool.query('UPDATE alunos SET ? WHERE id = ?', [
      d,
      Number(req.params.id),
    ]);
    if (!r.affectedRows)
      return res.status(404).json({ erro: 'Aluno não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    erroSql(err, res, 'Erro ao atualizar aluno');
  }
});

app.delete('/api/alunos/:id', exigirLogin, exigirAdmin, async (req, res) => {
  try {
    const [r] = await pool.query('DELETE FROM alunos WHERE id = ?', [
      Number(req.params.id),
    ]);
    if (!r.affectedRows)
      return res.status(404).json({ erro: 'Aluno não encontrado' });
    res.status(204).end();
  } catch (err) {
    erroSql(err, res, 'Erro ao excluir aluno');
  }
});

const port = process.env.PORT || 3000;
const pfxPath = path.resolve(
  __dirname,
  process.env.TLS_PFX_PATH || 'certs/localhost.pfx'
);
const tlsOptions = { pfx: fs.readFileSync(pfxPath) };
const localPassphrasePath = path.join(
  __dirname,
  'certs',
  'localhost.passphrase'
);
const passphrase =
  process.env.TLS_PFX_PASSPHRASE ||
  (fs.existsSync(localPassphrasePath)
    ? fs.readFileSync(localPassphrasePath, 'utf8').trim()
    : '');
if (passphrase) {
  tlsOptions.passphrase = passphrase;
}

https.createServer(tlsOptions, app).listen(port, () => {
  console.log(`Carômetro em https://localhost:${port}`);
});
