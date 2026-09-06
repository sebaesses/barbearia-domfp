// =========================================================
// BARBEARIA DOM FELIPE — barbeiros-storage.js
// "Banco de dados" dinâmico da equipe (CRUD completo) no localStorage.
// Transforma a barbearia num mini-SaaS: o Dono cadastra/edita/remove
// barbeiros pelo painel, e tanto o site quanto o painel passam a ler
// esses dados em vez de uma lista fixa no código.
//
// IMPORTANTE — ORDEM DE CARREGAMENTO: este arquivo deve ser incluído
// DEPOIS de data.js e ANTES de script.js/painel.js. Ele redefine
// (sobrescreve) as funções obterBarbeiroPorId(), obterPreco() e
// obterPrecoAPartirDe() originalmente criadas em data.js, para que
// TODO o resto do código (script.js, painel.js) continue funcionando
// sem precisar mudar nenhuma chamada existente — elas simplesmente
// passam a consultar o localStorage por baixo dos panos.
// =========================================================

const BARBEIROS_STORAGE_KEY = 'domfelipe_lista_barbeiros';

// Gera a lista inicial ("semente") a partir dos dados estáticos que
// já existiam em data.js — assim o sistema nasce funcional na primeira
// visita, sem o Dono precisar cadastrar os 3 barbeiros na mão.
// Cada barbeiro agora carrega a PRÓPRIA tabela de preços dentro de si
// (objeto "precos"), em vez de uma TABELA_PRECOS separada.
function gerarBarbeirosSemente() {
  return BARBEIROS.map((barbeiro) => ({
    id: barbeiro.id,
    nome: barbeiro.nome,
    especialidade: barbeiro.especialidade,
    foto: barbeiro.foto,
    precos: { ...(TABELA_PRECOS[barbeiro.id] || {}) }
  }));
}

// Lê a lista de barbeiros do localStorage. Se ainda não existir
// (primeira visita ao site), semeia com os 3 barbeiros originais.
function obterListaBarbeiros() {
  try {
    const dados = localStorage.getItem(BARBEIROS_STORAGE_KEY);
    if (dados) return JSON.parse(dados);

    const semente = gerarBarbeirosSemente();
    salvarListaBarbeiros(semente);
    return semente;
  } catch (erro) {
    console.error('Erro ao ler a lista de barbeiros do localStorage:', erro);
    return [];
  }
}

function salvarListaBarbeiros(lista) {
  try {
    localStorage.setItem(BARBEIROS_STORAGE_KEY, JSON.stringify(lista));
    return true;
  } catch (erro) {
    console.error('Erro ao salvar a lista de barbeiros no localStorage:', erro);
    return false;
  }
}

// =========================================================
// CRUD — usado pela aba "Gerenciar Equipe" do painel (Dono)
// =========================================================

// Adiciona um novo barbeiro. "dados.precos" deve ser um objeto com um
// preço numérico para cada id de SERVICOS (ver data.js) — ex:
// { corte: 45, sobrancelha: 20, barba: 40, reflexo: 70, luzes: 90, nevou: 120 }
function adicionarBarbeiro(dados) {
  const lista = obterListaBarbeiros();

  const novoBarbeiro = {
    id: `barb_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    nome: (dados.nome || '').trim(),
    especialidade: (dados.especialidade || '').trim(),
    foto: (dados.foto || '').trim(),
    precos: normalizarPrecos(dados.precos)
  };

  lista.push(novoBarbeiro);
  salvarListaBarbeiros(lista);
  return novoBarbeiro;
}

// Atualiza um barbeiro existente (edição parcial: só sobrescreve os
// campos passados em "dados")
function atualizarBarbeiro(id, dados) {
  const lista = obterListaBarbeiros();
  const indice = lista.findIndex((barbeiro) => barbeiro.id === id);
  if (indice === -1) return null;

  lista[indice] = {
    ...lista[indice],
    ...dados,
    id, // o id nunca muda, mesmo que "dados" tente sobrescrever
    precos: dados.precos ? normalizarPrecos(dados.precos) : lista[indice].precos
  };

  salvarListaBarbeiros(lista);
  return lista[indice];
}

// Remove um barbeiro definitivamente da equipe.
// OBS: isto NÃO apaga o histórico de agendamentos já feitos com ele
// (eles continuam no localStorage de agendamentos, só não será mais
// possível marcar NOVOS horários com esse barbeiro).
function removerBarbeiro(id) {
  const lista = obterListaBarbeiros().filter((barbeiro) => barbeiro.id !== id);
  salvarListaBarbeiros(lista);
  return lista;
}

// Garante que todo serviço de SERVICOS (data.js) tenha um preço
// numérico válido — serviços não informados viram 0 em vez de
// quebrarem os cálculos de preço total mais adiante.
function normalizarPrecos(precosParciais) {
  const precos = {};
  SERVICOS.forEach((servico) => {
    const valor = Number(precosParciais?.[servico.id]);
    precos[servico.id] = Number.isFinite(valor) && valor >= 0 ? valor : 0;
  });
  return precos;
}

// =========================================================
// SUBSTITUI (override) os helpers estáticos de data.js pelos
// equivalentes dinâmicos — mesma assinatura, mesmo nome de função,
// então script.js e painel.js não precisam mudar nenhuma chamada.
// =========================================================

// Sobrescreve obterBarbeiroPorId() de data.js
function obterBarbeiroPorId(id) {
  return obterListaBarbeiros().find((barbeiro) => barbeiro.id === id) || null;
}

// Sobrescreve obterPreco() de data.js
function obterPreco(barbeiroId, servicoId) {
  const barbeiro = obterBarbeiroPorId(barbeiroId);
  return barbeiro?.precos?.[servicoId] ?? 0;
}

// Sobrescreve obterPrecoAPartirDe() de data.js
function obterPrecoAPartirDe(servicoId) {
  const precos = obterListaBarbeiros()
    .map((barbeiro) => barbeiro.precos?.[servicoId])
    .filter((preco) => typeof preco === 'number');

  return precos.length ? Math.min(...precos) : 0;
}
