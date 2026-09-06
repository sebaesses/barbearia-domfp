// =========================================================
// BARBEARIA DOM FELIPE — calendario.js
// Responsabilidade única: seleção de DATA e HORÁRIO no formulário
// de agendamento. Cobre:
//   1) Bloqueio de domingos, segundas, datas passadas e datas além
//      da janela de antecedência.
//   2) Bloqueio de dias específicos por barbeiro (lido do localStorage,
//      gravado pelo Painel via "Bloquear Dia").
//   3) Horário renderizado como CHIPS clicáveis (não mais <select>),
//      com estado de seleção visível e valor sempre correto — corrige
//      o bug de seleção de horário.
//   4) Prevenção de overbooking: horários já ocupados pelo barbeiro
//      escolhido nessa data somem da lista de chips.
//
// Depende de já estarem carregados antes deste arquivo:
//   - data.js              (DIAS_FECHADOS, LIMITE_DIAS_ANTECEDENCIA, gerarHorariosPadrao)
//   - barbeiros-storage.js (obterBarbeiroPorId)
//   - agenda-storage.js    (diaEstaBloqueado, horarioOcupado)
//
// Expõe globalmente (para script.js usar no cálculo de preço e no
// envio do formulário):
//   - obterBarbeiroSelecionado()
//   - obterHoraSelecionada()
//   - validarData(valorISO, barbeiroId)
//   - obterHorariosDisponiveis(barbeiroId, dataISO)
//   - atualizarDisponibilidade()
// =========================================================

const dataInput = document.getElementById('data');
const horaChips = document.getElementById('horaChips');

// ---------------------------------------------------------
// Helpers de data
// ---------------------------------------------------------

// Formata um objeto Date para yyyy-mm-dd (fuso local, não UTC)
function formatarDataISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function obterHoje() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return hoje;
}

function obterDataLimite() {
  const limite = obterHoje();
  limite.setDate(limite.getDate() + LIMITE_DIAS_ANTECEDENCIA);
  return limite;
}

// Bloqueia datas passadas e além da janela de antecedência diretamente
// no seletor nativo do navegador. Envolvido em try/catch de propósito:
// se data.js (LIMITE_DIAS_ANTECEDENCIA) não tiver carregado ANTES
// deste arquivo, um erro aqui não pode impedir os event listeners lá
// embaixo de serem registrados — sem eles, nenhuma validação de data
// roda nunca, mesmo que a função validarData() exista.
if (dataInput) {
  try {
    dataInput.min = formatarDataISO(obterHoje());
    dataInput.max = formatarDataISO(obterDataLimite());
  } catch (erro) {
    console.error(
      '[calendario] Falha ao configurar min/max da data. Verifique se '
      + 'data.js está carregado ANTES de calendario.js no index.html.',
      erro
    );
  }
}

// ---------------------------------------------------------
// Seleção de barbeiro (lida aqui porque a validação de data
// depende de saber qual barbeiro está selecionado)
// ---------------------------------------------------------
function obterBarbeiroSelecionado() {
  const input = document.querySelector('input[name="barbeiro"]:checked');
  return input ? input.value : null;
}

// ---------------------------------------------------------
// Validação de data: passado, limite de 14 dias, dias fechados
// (domingo/segunda) e bloqueio específico do barbeiro selecionado
// ---------------------------------------------------------
function validarData(valorISO, barbeiroId) {
  if (!valorISO) {
    return { valido: false, motivo: 'Selecione uma data.' };
  }

  const [ano, mes, dia] = valorISO.split('-').map(Number);
  const dataSelecionada = new Date(ano, mes - 1, dia);

  const hoje = obterHoje();
  const dataLimite = obterDataLimite();

  if (dataSelecionada < hoje) {
    return { valido: false, motivo: 'Não é possível agendar em uma data passada.' };
  }

  if (dataSelecionada > dataLimite) {
    return {
      valido: false,
      motivo: `Agendamentos podem ser feitos com no máximo ${LIMITE_DIAS_ANTECEDENCIA} dias de antecedência.`
    };
  }

  // Bloqueio 1: domingo (0) e segunda (1) — fechado pra todo mundo
  if (DIAS_FECHADOS.includes(dataSelecionada.getDay())) {
    return { valido: false, motivo: 'Fechado aos domingos e segundas-feiras. Escolha de terça a sábado.' };
  }

  // Bloqueio 2: dia bloqueado especificamente para ESSE barbeiro
  // (ausência registrada no Painel) — os outros barbeiros continuam
  // disponíveis normalmente na mesma data.
  if (barbeiroId && diaEstaBloqueado(barbeiroId, valorISO)) {
    const barbeiro = obterBarbeiroPorId(barbeiroId);
    return {
      valido: false,
      motivo: `${barbeiro ? barbeiro.nome : 'Esse barbeiro'} está indisponível nesta data. Escolha outro dia ou outro barbeiro.`
    };
  }

  return { valido: true };
}

// ---------------------------------------------------------
// Horários disponíveis
// ---------------------------------------------------------

// Verifica se um horário (string "HH:MM") já passou, comparado ao
// relógio atual do dispositivo
function horaJaPassou(horaStr) {
  const agora = new Date();
  const [hora, minuto] = horaStr.split(':').map(Number);
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const minutosHorario = hora * 60 + minuto;
  return minutosHorario <= minutosAgora;
}

// Monta TODOS os horários do expediente numa data, cada um já marcado
// se está ocupado ou não pelo barbeiro escolhido — usada pra
// RENDERIZAR os chips (inclusive os indisponíveis, que agora aparecem
// desabilitados em vez de sumirem da tela). Horários já passados (se
// a data for hoje) continuam sendo removidos por completo, já que
// esses não fazem sentido nem como opção desabilitada.
function obterHorariosComStatus(barbeiroId, dataISO) {
  let horarios = gerarHorariosPadrao();

  if (dataISO === formatarDataISO(obterHoje())) {
    horarios = horarios.filter((horario) => !horaJaPassou(horario));
  }

  return horarios.map((horario) => ({
    hora: horario,
    ocupado: Boolean(barbeiroId) && horarioOcupado(barbeiroId, dataISO, horario)
  }));
}

// Só os horários REALMENTE livres — usada pra revalidar no momento do
// envio do formulário (protege contra o cliente burlar um chip
// desabilitado via DevTools e tentar enviar um horário ocupado).
function obterHorariosDisponiveis(barbeiroId, dataISO) {
  return obterHorariosComStatus(barbeiroId, dataISO)
    .filter((item) => !item.ocupado)
    .map((item) => item.hora);
}

// ---------------------------------------------------------
// Chips de horário — substituem o antigo <select>. Cada chip é um
// radio real (name="hora"), então a seleção sempre tem um valor
// concreto e visualmente marcado — sem depender de nenhum estado
// "escondido" que possa dessincronizar.
// ---------------------------------------------------------

// Mostra uma mensagem no lugar dos chips (sem nenhum horário clicável)
function resetHoraChips(mensagem) {
  if (!horaChips) return;
  horaChips.innerHTML = `<p class="chip-group-empty">${mensagem}</p>`;
}

// Preenche os chips de horário com TODOS os horários do dia — os
// ocupados continuam visíveis, só que com o <input> desabilitado e a
// classe chip-time-ocupado (estilizada em style.css), em vez de
// desaparecerem da lista.
function popularHoraChips(listaHorariosComStatus) {
  if (!horaChips) return;

  if (!listaHorariosComStatus || listaHorariosComStatus.length === 0) {
    resetHoraChips('Nenhum horário disponível nesta data');
    return;
  }

  horaChips.innerHTML = listaHorariosComStatus.map(({ hora, ocupado }) => `
    <label class="chip chip-time${ocupado ? ' chip-time-ocupado' : ''}">
      <input type="radio" name="hora" value="${hora}"${ocupado ? ' disabled' : ''}>
      <span>${hora}</span>
    </label>
  `).join('');
}

// Retorna o horário atualmente selecionado (ou null se nenhum)
function obterHoraSelecionada() {
  const input = document.querySelector('input[name="hora"]:checked');
  return input ? input.value : null;
}

// ---------------------------------------------------------
// Função central: reavalia data + barbeiro sempre que qualquer um
// dos dois muda, e repopula os chips de horário de acordo
// ---------------------------------------------------------
function atualizarDisponibilidade() {
  const formNoteEl = document.getElementById('formNote');

  if (!dataInput.value) {
    resetHoraChips('Escolha o barbeiro e a data primeiro');
    return;
  }

  const barbeiroId = obterBarbeiroSelecionado();
  const resultadoData = validarData(dataInput.value, barbeiroId);

  if (!resultadoData.valido) {
    if (formNoteEl) {
      formNoteEl.textContent = resultadoData.motivo;
      formNoteEl.classList.add('form-note-error');
    }
    dataInput.classList.add('input-error');
    dataInput.value = '';
    resetHoraChips('Selecione uma data válida primeiro');
    return;
  }

  dataInput.classList.remove('input-error');
  if (formNoteEl) {
    formNoteEl.textContent = '';
    formNoteEl.classList.remove('form-note-error');
  }

  if (!barbeiroId) {
    resetHoraChips('Escolha um barbeiro primeiro');
    return;
  }

  popularHoraChips(obterHorariosComStatus(barbeiroId, dataInput.value));
}

// ---------------------------------------------------------
// Event listeners
// (também blindados: são o coração da integração — sem eles, nada
// do que está definido acima chega a ser executado quando o cliente
// interage com o formulário)
// ---------------------------------------------------------
try {
  if (dataInput) {
    // 'input' reage assim que o navegador confirma uma data completa
    // (ex.: ao fechar o calendário nativo); 'change' cobre os demais casos.
    dataInput.addEventListener('input', atualizarDisponibilidade);
    dataInput.addEventListener('change', atualizarDisponibilidade);
  }

  // Delegado no document (não no formulário) para funcionar não importa
  // se o chip de barbeiro foi clicado direto ou marcado via JS pelos
  // cards "Agendar com [Nome]" da Home (que disparam um evento 'change'
  // sintético no radio correspondente).
  document.addEventListener('change', (event) => {
    if (event.target.name === 'barbeiro') {
      atualizarDisponibilidade();
    }
  });

  // Estado inicial: nenhum barbeiro/data escolhidos ainda
  resetHoraChips('Escolha o barbeiro e a data primeiro');
} catch (erro) {
  console.error('[calendario] Falha ao inicializar os listeners de data/horário.', erro);
}
