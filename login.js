// =========================================================
// BARBEARIA DOM FELIPE — login.js
// Lógica da tela de login fictícia do Painel do Barbeiro.
// Depende de auth.js estar carregado antes deste arquivo.
// =========================================================

// Se já existe uma "sessão" ativa, pula direto para o painel
if (estaAutenticado()) {
  window.location.replace('painel.html');
}

const loginForm = document.getElementById('loginForm');
const loginNote = document.getElementById('loginNote');

if (loginForm) {
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const senha = document.getElementById('loginSenha').value;

    const sucesso = autenticar(email, senha);

    if (!sucesso) {
      loginNote.textContent = 'E-mail ou senha incorretos. Tente novamente.';
      loginNote.classList.add('form-note-error');
      return;
    }

    loginNote.classList.remove('form-note-error');
    loginNote.textContent = 'Login realizado! Redirecionando...';

    window.location.href = 'painel.html';
  });
}

const anoLogin = document.getElementById('anoLogin');
if (anoLogin) {
  anoLogin.textContent = new Date().getFullYear();
}
