require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

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
app.use(express.static(path.join(__dirname, 'public')));

const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.post('/api/fotos', (req, res) => {
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

app.get('/api/turmas', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.id, t.nome, COUNT(a.id) AS total_alunos
       FROM turmas t
       LEFT JOIN alunos a ON a.turma_id = t.id
       GROUP BY t.id, t.nome
       ORDER BY t.nome`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar turmas' });
  }
});

app.post('/api/turmas', async (req, res) => {
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

app.put('/api/turmas/:id', async (req, res) => {
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

app.delete('/api/turmas/:id', async (req, res) => {
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

app.get('/api/alunos', async (req, res) => {
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

app.post('/api/alunos', async (req, res) => {
  const d = validar(req.body);
  if (!d) return res.status(400).json({ erro: 'Dados inválidos' });
  try {
    const [r] = await pool.query('INSERT INTO alunos SET ?', d);
    res.status(201).json({ id: r.insertId });
  } catch (err) {
    erroSql(err, res, 'Erro ao adicionar aluno');
  }
});

app.put('/api/alunos/:id', async (req, res) => {
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

app.delete('/api/alunos/:id', async (req, res) => {
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
app.listen(port, () => console.log(`Carômetro em http://localhost:${port}`));
