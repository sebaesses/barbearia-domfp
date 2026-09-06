// =========================================================
// BARBEARIA DOM FELIPE — agenda-storage.js
// Camada de persistência local (localStorage), compartilhada
// entre o site (index.html) e o Painel do Barbeiro (painel.html).
//
// IMPORTANTE: isto é um protótipo (MVP). O localStorage é local
// a cada navegador/dispositivo — não existe sincronização real
// entre o site e o painel se forem abertos em aparelhos diferentes.
// Para produção, troque esta camada por uma API/backend real.
// =========================================================

const AGENDA_STORAGE_KEY = 'domfelipe_agendamentos';

// Retorna todos os agendamentos salvos (array de objetos)
function obterAgendamentos() {
  try {
    const dados = localStorage.getItem(AGENDA_STORAGE_KEY);
    return dados ? JSON.parse(dados) : [];
  } catch (erro) {
    console.error('Erro ao ler agendamentos do localStorage:', erro);
    return [];
  }
}

// Sobrescreve a lista completa de agendamentos
function salvarAgendamentos(lista) {
  try {
    localStorage.setItem(AGENDA_STORAGE_KEY, JSON.stringify(lista));
    return true;
  } catch (erro) {
    console.error('Erro ao salvar agendamentos no localStorage:', erro);
    return false;
  }
}

// Adiciona um novo agendamento já confirmado (regra de negócio:
// todo agendamento validado no site é confirmado automaticamente)
function adicionarAgendamento(dadosAgendamento) {
  const lista = obterAgendamentos();

  const novoAgendamento = {
    id: `ag_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    status: 'confirmado',
    criadoEm: new Date().toISOString(),
    ...dadosAgendamento
  };

  lista.push(novoAgendamento);
  salvarAgendamentos(lista);
  return novoAgendamento;
}

// Remove um agendamento pelo id (usado pelo botão Cancelar do painel)
function removerAgendamento(id) {
  const lista = obterAgendamentos().filter((item) => item.id !== id);
  salvarAgendamentos(lista);
  return lista;
}

// Verifica se já existe um agendamento CONFIRMADO para o mesmo
// barbeiro, na mesma data e horário — usado para prevenir overbooking
// (dois clientes marcando o mesmo horário com o mesmo barbeiro).
function horarioOcupado(barbeiroId, data, hora) {
  return obterAgendamentos().some((agendamento) =>
    agendamento.barbeiroId === barbeiroId
    && agendamento.data === data
    && agendamento.hora === hora
    && agendamento.status === 'confirmado'
  );
}

// Atualiza o status de um agendamento (usado pelo painel para
// cancelar um horário pontual, mantendo o registro no histórico
// em vez de apagá-lo)
function atualizarStatusAgendamento(id, novoStatus, motivo) {
  const lista = obterAgendamentos();
  const indice = lista.findIndex((agendamento) => agendamento.id === id);
  if (indice === -1) return null;

  lista[indice].status = novoStatus;
  lista[indice].motivoCancelamento = motivo || null;
  lista[indice].atualizadoEm = new Date().toISOString();

  salvarAgendamentos(lista);
  return lista[indice];
}

// =========================================================
// DIAS BLOQUEADOS (ausências) — "banco" separado dos agendamentos
// =========================================================
const BLOQUEIOS_STORAGE_KEY = 'domfelipe_dias_bloqueados';

function obterDiasBloqueados() {
  try {
    const dados = localStorage.getItem(BLOQUEIOS_STORAGE_KEY);
    return dados ? JSON.parse(dados) : [];
  } catch (erro) {
    console.error('Erro ao ler dias bloqueados do localStorage:', erro);
    return [];
  }
}

function salvarDiasBloqueados(lista) {
  try {
    localStorage.setItem(BLOQUEIOS_STORAGE_KEY, JSON.stringify(lista));
    return true;
  } catch (erro) {
    console.error('Erro ao salvar dias bloqueados no localStorage:', erro);
    return false;
  }
}

// Usado pelo site (index.html) para impedir a seleção da data no
// calendário — SÓ bloqueia para o barbeiro afetado, os outros dois
// continuam disponíveis normalmente nesse mesmo dia.
function diaEstaBloqueado(barbeiroId, data) {
  return obterDiasBloqueados().some((bloqueio) =>
    bloqueio.barbeiroId === barbeiroId && bloqueio.data === data
  );
}

// Bloqueia um dia inteiro para um barbeiro (ausência). Isso:
//   1) cancela em cascata os agendamentos CONFIRMADOS daquele
//      barbeiro naquela data (mantendo o registro no painel, com o
//      motivo, para a recepção avisar o cliente pelo WhatsApp);
//   2) registra o bloqueio, que o site consulta antes de liberar
//      a data no formulário de agendamento.
function bloquearDia(barbeiroId, data, motivo) {
  const motivoFinal = motivo || 'Dia bloqueado pelo profissional (ausência).';

  const agendamentos = obterAgendamentos();
  let algumCancelado = false;

  agendamentos.forEach((agendamento) => {
    if (
      agendamento.barbeiroId === barbeiroId
      && agendamento.data === data
      && agendamento.status === 'confirmado'
    ) {
      agendamento.status = 'cancelado';
      agendamento.motivoCancelamento = motivoFinal;
      agendamento.atualizadoEm = new Date().toISOString();
      algumCancelado = true;
    }
  });

  if (algumCancelado) {
    salvarAgendamentos(agendamentos);
  }

  const bloqueios = obterDiasBloqueados();
  const novoBloqueio = {
    id: `bl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    barbeiroId,
    data,
    motivo: motivoFinal,
    criadoEm: new Date().toISOString()
  };

  bloqueios.push(novoBloqueio);
  salvarDiasBloqueados(bloqueios);

  return { bloqueio: novoBloqueio, agendamentosCancelados: algumCancelado };
}

// Remove um bloqueio (o barbeiro/dono decidiu voltar a atender no dia)
function desbloquearDia(id) {
  const lista = obterDiasBloqueados().filter((bloqueio) => bloqueio.id !== id);
  salvarDiasBloqueados(lista);
  return lista;
}
