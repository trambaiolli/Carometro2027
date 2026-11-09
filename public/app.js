const grid = document.getElementById('grid');
const tabs = document.getElementById('tabs');
const busca = document.getElementById('busca');
let turmaAtual = '';
let timer;
let usuarioLogado = null;

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
  if (usuarioLogado?.perfil === 'admin') {
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
  }
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
  b.dataset.turmaId = id;
  b.onclick = () => {
    turmaAtual = id;
    document.getElementById('editarTurma').hidden =
      !id || usuarioLogado?.perfil !== 'admin';
    document.getElementById('excluirTurma').hidden =
      !id || usuarioLogado?.perfil !== 'admin';
    document.getElementById('imprimirTurma').hidden = !id;
    tabs
      .querySelectorAll('button')
      .forEach((x) => x.classList.toggle('ativo', x === b));
    carregarAlunos();
  };
  return b;
}

function atualizarTurmas(turmas) {
  form.turma_id.replaceChildren(
    ...turmas.map((t) => {
      const o = el('option', '', t.nome);
      o.value = t.id;
      return o;
    })
  );
  tabs.replaceChildren(
    aba('Todas', ''),
    ...turmas.map((t) => aba(t.nome, String(t.id)))
  );
  document.getElementById('editarTurma').hidden =
    !turmaAtual || usuarioLogado?.perfil !== 'admin';
  document.getElementById('excluirTurma').hidden =
    !turmaAtual || usuarioLogado?.perfil !== 'admin';
  document.getElementById('imprimirTurma').hidden = !turmaAtual;
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
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    erro.textContent =
      'A câmera exige conexão segura (HTTPS). Use o endereço HTTPS do servidor ou acesse por localhost.';
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
  } catch (error) {
    const mensagens = {
      NotAllowedError:
        'Permita o acesso à câmera nas configurações do navegador e do dispositivo.',
      NotFoundError: 'Nenhuma câmera foi encontrada neste dispositivo.',
      NotReadableError:
        'A câmera está em uso por outro aplicativo ou não pode ser iniciada.',
      SecurityError:
        'O navegador bloqueou a câmera. Acesse o servidor por uma conexão HTTPS.',
    };
    erro.textContent =
      mensagens[error.name] ||
      'Não foi possível iniciar a câmera neste navegador.';
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
  if (!a && turmaAtual) form.turma_id.value = turmaAtual;
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
document.getElementById('sair').onclick = async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.replace('/login');
};
document.getElementById('imprimirTurma').onclick = async () => {
  const turmaSelecionada = tabs.querySelector('button.ativo');
  if (!turmaAtual || !turmaSelecionada) return;
  const buscaAnterior = busca.value;
  busca.value = '';
  await carregarAlunos();
  const cabecalho = document.getElementById('cabecalhoImpressao');
  cabecalho.hidden = false;
  document.getElementById('tituloImpressao').textContent =
    turmaSelecionada.textContent;
  const total = grid.querySelectorAll('.card').length;
  document.getElementById('totalImpressao').textContent =
    `${total} ${total === 1 ? 'aluno' : 'alunos'}`;
  const data = new Date();
  document.getElementById('dataImpressao').textContent =
    `Impresso em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(data)}`;
  window.addEventListener(
    'afterprint',
    () => {
      cabecalho.hidden = true;
      busca.value = buscaAnterior;
      carregarAlunos();
    },
    { once: true }
  );
  window.print();
};
document.getElementById('novo').onclick = () => abrirForm(null);
document.getElementById('editarTurma').onclick = async (e) => {
  const id = turmaAtual;
  const botao = e.currentTarget;
  const abaAtual = tabs.querySelector('button.ativo');
  if (!id || !abaAtual) return;

  const nome = prompt('Novo nome da turma:', abaAtual.textContent);
  if (nome === null || !nome.trim()) return;

  botao.disabled = true;
  try {
    const resposta = await fetch('/api/turmas/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: nome.trim() }),
    });
    const resultado = await resposta.json();
    if (!resposta.ok)
      throw new Error(resultado.erro || 'Erro ao renomear turma');

    const turmas = await (await fetch('/api/turmas')).json();
    atualizarTurmas(turmas);
    carregarAlunos();
  } catch (err) {
    alert(err.message || 'Não foi possível renomear a turma.');
  } finally {
    botao.disabled = false;
  }
};
document.getElementById('excluirTurma').onclick = async (e) => {
  const id = turmaAtual;
  const botao = e.currentTarget;
  const nome = tabs.querySelector('button.ativo')?.textContent || 'esta turma';
  if (
    !id ||
    !confirm(
      `Excluir ${nome} e todos os alunos cadastrados nela? Esta ação não pode ser desfeita.`
    )
  )
    return;

  botao.disabled = true;
  try {
    const resposta = await fetch('/api/turmas/' + id, { method: 'DELETE' });
    if (!resposta.ok) {
      const resultado = await resposta.json();
      throw new Error(resultado.erro || 'Erro ao excluir turma');
    }

    turmaAtual = '';
    const turmas = await (await fetch('/api/turmas')).json();
    atualizarTurmas(turmas);
    carregarAlunos();
  } catch (err) {
    alert(err.message || 'Não foi possível excluir a turma.');
  } finally {
    botao.disabled = false;
  }
};
document.getElementById('gerarTurma').onclick = async (e) => {
  const botao = e.currentTarget;
  const nome = prompt('Nome da nova turma:');
  if (nome === null) return;
  if (!nome.trim()) {
    alert('Informe o nome da turma.');
    return;
  }

  botao.disabled = true;
  try {
    const resposta = await fetch('/api/turmas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: nome.trim() }),
    });
    const resultado = await resposta.json();
    if (!resposta.ok) throw new Error(resultado.erro || 'Erro ao gerar turma');

    const turmas = await (await fetch('/api/turmas')).json();
    turmaAtual = String(resultado.id);
    atualizarTurmas(turmas);
    carregarAlunos();
  } catch (err) {
    alert(err.message || 'Não foi possível gerar a turma.');
  } finally {
    botao.disabled = false;
  }
};

async function init() {
  const respostaSessao = await fetch('/api/auth/me');
  if (!respostaSessao.ok) {
    window.location.replace('/login');
    return;
  }
  const sessao = await respostaSessao.json();
  usuarioLogado = sessao.usuario;
  document.getElementById('usuarioAtual').textContent =
    usuarioLogado.perfil === 'admin'
      ? `${usuarioLogado.nome} · Administrador`
      : `${usuarioLogado.nome} · Visitante`;
  if (usuarioLogado.perfil !== 'admin') {
    ['gerarTurma', 'novo'].forEach((id) => {
      document.getElementById(id).hidden = true;
    });
  }

  const turmas = await (await fetch('/api/turmas')).json();
  atualizarTurmas(turmas);
  busca.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(carregarAlunos, 250);
  });
  carregarAlunos();
}

init();
