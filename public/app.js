const grid = document.getElementById('grid');
const tabs = document.getElementById('tabs');
const busca = document.getElementById('busca');
let turmaAtual = '';
let timer;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function card(a) {
  const c = el('article', 'card');
  const foto = el('div', 'foto');
  const img = el('img');
  img.src = a.foto_url;
  img.alt = a.nome;
  img.loading = 'lazy';
  foto.append(img, el('span', 'badge', a.turma));
  const info = el('div', 'info');
  info.append(
    el('h3', '', a.nome),
    el('div', '', '📞 ' + a.telefone),
    el('div', '', '✉ ' + a.email)
  );
  const acoes = el('div', 'acoesCard');
  const ed = el('button', '', 'Editar');
  ed.onclick = () => abrirForm(a);
  const ex = el('button', 'excluir', 'Excluir');
  ex.onclick = async () => {
    if (!confirm(`Excluir ${a.nome}?`)) return;
    await fetch('/api/alunos/' + a.id, { method: 'DELETE' });
    carregarAlunos();
  };
  acoes.append(ed, ex);
  info.append(acoes);
  c.append(foto, info);
  return c;
}

async function carregarAlunos() {
  const p = new URLSearchParams();
  if (turmaAtual) p.set('turma', turmaAtual);
  if (busca.value.trim()) p.set('q', busca.value.trim());
  const alunos = await (await fetch('/api/alunos?' + p)).json();
  grid.replaceChildren(
    ...(alunos.length
      ? alunos.map(card)
      : [el('p', 'vazio', 'Nenhum aluno encontrado.')])
  );
}

function aba(label, id) {
  const b = el('button', id === turmaAtual ? 'ativo' : '', label);
  b.onclick = () => {
    turmaAtual = id;
    tabs
      .querySelectorAll('button')
      .forEach((x) => x.classList.toggle('ativo', x === b));
    carregarAlunos();
  };
  return b;
}

const dlg = document.getElementById('dlg');
const form = document.getElementById('form');
const erro = document.getElementById('erro');
let editandoId = null;

const video = document.getElementById('video');
const preview = document.getElementById('preview');
const btnCapturar = document.getElementById('capturar');
let stream = null;

function pararCamera() {
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null;
  video.hidden = true;
  btnCapturar.hidden = true;
}

function mostrarPreview(url) {
  preview.hidden = !url;
  if (url) preview.src = url;
}

document.getElementById('abrirCam').onclick = async () => {
  erro.textContent = '';
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
  } catch {
    erro.textContent = 'Não foi possível acessar a câmera.';
    return;
  }
  video.srcObject = stream;
  video.hidden = false;
  preview.hidden = true;
  btnCapturar.hidden = false;
};

btnCapturar.onclick = async () => {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  const imagem = canvas.toDataURL('image/jpeg', 0.85);
  pararCamera();
  const r = await fetch('/api/fotos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imagem }),
  });
  if (!r.ok) {
    erro.textContent = 'Erro ao enviar a foto.';
    return;
  }
  const { url } = await r.json();
  form.foto_url.value = url;
  mostrarPreview(url);
};

form.foto_url.addEventListener('input', () =>
  mostrarPreview(form.foto_url.value.trim())
);
dlg.addEventListener('close', pararCamera);

function abrirForm(a) {
  pararCamera();
  mostrarPreview('');
  editandoId = a ? a.id : null;
  document.getElementById('dlgTitulo').textContent = a
    ? 'Editar aluno'
    : 'Novo aluno';
  form.reset();
  erro.textContent = '';
  if (a) {
    form.nome.value = a.nome;
    form.email.value = a.email;
    form.telefone.value = a.telefone;
    form.foto_url.value = a.foto_url;
    mostrarPreview(a.foto_url);
    form.turma_id.value = a.turma_id;
  }
  dlg.showModal();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const dados = Object.fromEntries(new FormData(form));
  const r = await fetch(
    editandoId ? '/api/alunos/' + editandoId : '/api/alunos',
    {
      method: editandoId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    }
  );
  if (!r.ok) {
    erro.textContent = (await r.json()).erro || 'Erro ao salvar';
    return;
  }
  dlg.close();
  carregarAlunos();
});

document.getElementById('cancelar').onclick = () => dlg.close();
document.getElementById('novo').onclick = () => abrirForm(null);

async function init() {
  const turmas = await (await fetch('/api/turmas')).json();
  form.turma_id.replaceChildren(
    ...turmas.map((t) => {
      const o = el('option', '', t.nome);
      o.value = t.id;
      return o;
    })
  );
  tabs.append(
    aba('Todas', ''),
    ...turmas.map((t) => aba(t.nome, String(t.id)))
  );
  busca.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(carregarAlunos, 250);
  });
  carregarAlunos();
}

init();
