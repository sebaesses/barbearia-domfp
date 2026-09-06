// =========================================================
// BARBEARIA DOM FELIPE — auth.js
// =========================================================

const AUTH_STORAGE_KEY = 'domfelipe_sessao';

const PERFIL_LABELS = {
  dono: 'Dono — acesso total',
  recepcionista: 'Recepcionista — vê e cancela tudo',
  barbeiro: 'Barbeiro — vê e cancela apenas sua agenda'
};

function obterTodosUsuarios() {
  // 1. Diretoria Fixa (Nunca é apagada)
  const adminsFixos = [
    { id: 'dono', nome: 'Felipe (Dono)', email: 'dono@domfelipe.com', senha: '123', perfil: 'dono' },
    { id: 'recepcao', nome: 'Recepção', email: 'recepcao@domfelipe.com', senha: '123', perfil: 'recepcionista' }
  ];

  // 2. Busca a lista oficial de barbeiros ativos
  let barbeirosAtivos = [];
  try {
    if (typeof obterListaBarbeiros === 'function') {
      barbeirosAtivos = obterListaBarbeiros();
    }
  } catch (e) {
    console.error('Erro ao ler barbeiros para autenticação', e);
  }

  // 3. Converte a equipe em perfis de acesso dinamicamente
  const barbeirosAuth = barbeirosAtivos.map(b => {
    // Formata o nome para e-mail (Ex: João Silva -> joao-silva@domfelipe.com)
    const emailAmigavel = b.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-') + '@domfelipe.com';
    return {
      id: b.id,
      nome: b.nome,
      email: emailAmigavel,
      senha: '123',
      perfil: 'barbeiro'
    };
  });

  return [...adminsFixos, ...barbeirosAuth];
}

function autenticar(email, senha) {
  const emailNormalizado = (email || '').trim().toLowerCase();
  const senhaNormalizada = (senha || '').trim();
  const todosUsuarios = obterTodosUsuarios();

  const usuario = todosUsuarios.find((u) => u.email === emailNormalizado && u.senha === senhaNormalizada);

  if (!usuario) return null;

  const sessao = {
    logado: true,
    email: usuario.email,
    nome: usuario.nome,
    perfil: usuario.perfil,
    barbeiroId: usuario.id,
    em: new Date().toISOString()
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessao));
  return sessao;
}

function obterSessao() {
  try {
    const dados = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!dados) return null;
    const sessao = JSON.parse(dados);
    if (!sessao?.logado) return null;

    // Se é barbeiro, checa se ele ainda está na vitrine. Se não estiver, derruba a sessão!
    if (sessao.perfil === 'barbeiro') {
      const todosUsuarios = obterTodosUsuarios();
      const aindaExiste = todosUsuarios.some(u => u.email === sessao.email);
      if (!aindaExiste) {
        encerrarSessao();
        return null;
      }
    }
    return sessao;
  } catch (erro) {
    return null;
  }
}

function estaAutenticado() { return Boolean(obterSessao()); }
function encerrarSessao() { localStorage.removeItem(AUTH_STORAGE_KEY); }

function obterPermissoes(sessao) {
  if (!sessao) return { podeVerTodos: false, podeCancelarTodos: false, podeBloquearDia: false, podeGerenciarEquipe: false, barbeiroFixo: null };
  switch (sessao.perfil) {
    case 'dono': return { podeVerTodos: true, podeCancelarTodos: true, podeBloquearDia: true, podeGerenciarEquipe: true, barbeiroFixo: null };
    case 'recepcionista': return { podeVerTodos: true, podeCancelarTodos: true, podeBloquearDia: true, podeGerenciarEquipe: false, barbeiroFixo: null };
    case 'barbeiro': return { podeVerTodos: false, podeCancelarTodos: false, podeBloquearDia: true, podeGerenciarEquipe: false, barbeiroFixo: sessao.barbeiroId };
    default: return { podeVerTodos: false, podeCancelarTodos: false, podeBloquearDia: false, podeGerenciarEquipe: false, barbeiroFixo: null };
  }
}