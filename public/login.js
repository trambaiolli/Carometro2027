const form = document.getElementById('loginForm');
const erro = document.getElementById('erroLogin');
const entrar = document.getElementById('entrar');

async function verificarConfiguracao() {
  try {
    const resposta = await fetch('/api/auth/status');
    const status = await resposta.json();
    if (!status.configurado) {
      erro.textContent =
        'Configure ADMIN_PASSWORD e VISITOR_PASSWORD no arquivo .env para liberar o acesso.';
      entrar.disabled = true;
    }
  } catch {
    erro.textContent = 'Não foi possível verificar a configuração do acesso.';
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  erro.textContent = '';
  entrar.disabled = true;

  try {
    const resposta = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: form.elements.namedItem('usuario').value.trim(),
        senha: form.elements.namedItem('senha').value,
      }),
    });
    const resultado = await resposta.json();
    if (!resposta.ok) throw new Error(resultado.erro || 'Falha ao entrar');
    window.location.replace('/');
  } catch (error) {
    erro.textContent = error.message || 'Não foi possível entrar.';
    entrar.disabled = false;
    form.elements.namedItem('senha').value = '';
    form.elements.namedItem('senha').focus();
  }
});

verificarConfiguracao();
