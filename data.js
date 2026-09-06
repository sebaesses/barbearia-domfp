// =========================================================
// BARBEARIA DOM FELIPE — data.js
// Dados estáticos e dinâmicos compartilhados entre o site (index.html) e o
// painel administrativo (painel.html).
// =========================================================

const BARBEIROS = [
  {
    id: 'dom',
    nome: 'Dom',
    especialidade: 'Cortes clássicos e acabamento na navalha',
    foto: 'assets/barbeiros/dom.jpg'
  },
  {
    id: 'felipe',
    nome: 'Felipe',
    especialidade: 'Fundador da casa — cortes modernos e coloração',
    foto: 'assets/barbeiros/felipe.jpg',
    dono: true
  },
  {
    id: 'lucas',
    nome: 'Lucas',
    especialidade: 'Barba, sobrancelha e acabamento fino',
    foto: 'assets/barbeiros/lucas.jpg'
  }
];

// Serviços padrão caso o localStorage esteja vazio
const SERVICOS_PADRAO = [
  { id: 'corte', nome: 'Corte', descricao: 'Corte na tesoura ou máquina, com acabamento na navalha.', icone: '<i class="ph ph-scissors" aria-hidden="true"></i>', preco: 40 },
  { id: 'sobrancelha', nome: 'Sobrancelha', descricao: 'Design de sobrancelha e acabamento fino com navalha.', icone: '<i class="ph ph-eye" aria-hidden="true"></i>', preco: 18 },
  { id: 'barba', nome: 'Barba', descricao: 'Barba tradicional com toalha quente e produtos premium.', icone: '<svg class="chip-icon-svg" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="0" y="17.5" width="14" height="5" rx="2.5" transform="rotate(35 14 20)" fill="currentColor"/><rect x="14" y="18.4" width="22" height="3.2" rx="1.6" transform="rotate(-25 14 20)" fill="currentColor"/><circle cx="14" cy="20" r="1.8" fill="currentColor"/></svg>', preco: 35 },
  { id: 'reflexo', nome: 'Reflexo', descricao: 'Reflexos para realçar o corte com um brilho natural.', icone: '<i class="ph ph-sparkle" aria-hidden="true"></i>', preco: 65 },
  { id: 'luzes', nome: 'Luzes', descricao: 'Mechas e luzes para dar um novo brilho ao visual.', icone: '<i class="ph ph-paint-brush" aria-hidden="true"></i>', preco: 85 },
  { id: 'nevou', nome: 'Nevou', descricao: 'Clareamento gradual nas pontas, efeito nevado nos fios.', icone: '<i class="ph ph-snowflake" aria-hidden="true"></i>', preco: 110 }
];

function obterListaServicos() {
  try {
    const salvos = localStorage.getItem('domfelipe_servicos');
    if (salvos) return JSON.parse(salvos);
    localStorage.setItem('domfelipe_servicos', JSON.stringify(SERVICOS_PADRAO));
    return SERVICOS_PADRAO;
  } catch (erro) {
    return SERVICOS_PADRAO;
  }
}

function salvarListaServicos(lista) {
  localStorage.setItem('domfelipe_servicos', JSON.stringify(lista));
}

// Proxy transparente: faz o barbeiros-storage.js achar que SERVICOS ainda é 
// um array estático, mas na verdade ele lê do localStorage dinamicamente.
const SERVICOS = new Proxy([], {
  get: function(target, prop) {
    const lista = obterListaServicos();
    if (prop === 'length') return lista.length;
    if (typeof lista[prop] === 'function') return lista[prop].bind(lista);
    return lista[prop];
  }
});

// Tabela de preços base
const TABELA_PRECOS = {
  dom:    { corte: 45, sobrancelha: 20, barba: 40, reflexo: 70, luzes: 90,  nevou: 120 },
  felipe: { corte: 60, sobrancelha: 25, barba: 50, reflexo: 90, luzes: 110, nevou: 150 },
  lucas:  { corte: 40, sobrancelha: 18, barba: 35, reflexo: 65, luzes: 85,  nevou: 110 }
};

// Regras de funcionamento
const DIAS_FECHADOS = [0, 1]; // 0 = Domingo, 1 = Segunda
const HORA_ABERTURA = 9;      // 09:00
const HORA_FECHAMENTO = 19;   // 19:00
const LIMITE_DIAS_ANTECEDENCIA = 14;
const WHATSAPP_NUMERO = '5585999729651';

// ---------------------------------------------------------
// Helpers de dados
// ---------------------------------------------------------
function obterBarbeiroPorId(id) {
  return BARBEIROS.find((b) => b.id === id) || null;
}

function obterServicoPorId(id) {
  return obterListaServicos().find((s) => s.id === id) || null;
}

function obterPreco(barbeiroId, servicoId) {
  return TABELA_PRECOS[barbeiroId]?.[servicoId] ?? 0;
}

function obterPrecoAPartirDe(servicoId) {
  const precos = Object.values(TABELA_PRECOS).map((tabela) => tabela[servicoId] ?? Infinity);
  return Math.min(...precos);
}

function formatarMoeda(valor) {
  return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function gerarHorariosPadrao() {
  const horarios = [];
  for (let hora = HORA_ABERTURA; hora <= HORA_FECHAMENTO; hora++) {
    horarios.push(`${String(hora).padStart(2, '0')}:00`);
    if (hora < HORA_FECHAMENTO) {
      horarios.push(`${String(hora).padStart(2, '0')}:30`);
    }
  }
  return horarios;
}

// =========================================================
// DISPOSITIVO CONFIÁVEL
// =========================================================
const DEVICE_ID_STORAGE_KEY = 'domfelipe_device_id';

function obterDeviceId() {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (!deviceId) {
      deviceId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `dev_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
    }
    return deviceId;
  } catch (erro) {
    console.error('[data] Falha ao ler/gravar o id do dispositivo.', erro);
    return `dev_sessao_${Date.now()}`;
  }
}