// =========================================================
// BARBEARIA DOM FELIPE — painel.js
// =========================================================

const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const logoutBtn = document.getElementById('logoutBtn');
const loginForm = document.getElementById('loginForm');
const loginNote = document.getElementById('loginNote');

const painelWelcome = document.getElementById('painelWelcome');
const painelData = document.getElementById('painelData');
const painelHojeBtn = document.getElementById('painelHojeBtn');
const painelTodosBtn = document.getElementById('painelTodosBtn');
const painelVerCanceladosBtn = document.getElementById('painelVerCanceladosBtn');
const painelBarbeiroFiltroWrap = document.getElementById('painelBarbeiroFiltroWrap');
const painelBarbeiroSelect = document.getElementById('painelBarbeiroSelect');
const painelCount = document.getElementById('painelCount');
const painelLista = document.getElementById('painelLista');
const painelEmpty = document.getElementById('painelEmpty');

const painelBlockDayWrap = document.getElementById('painelBlockDayWrap');
const bloqueioData = document.getElementById('bloqueioData');
const bloqueioBarbeiroWrap = document.getElementById('bloqueioBarbeiroWrap');
const bloqueioBarbeiroSelect = document.getElementById('bloqueioBarbeiroSelect');
const bloqueioHorariosChips = document.getElementById('bloqueioHorariosChips');
const bloqueioBtn = document.getElementById('bloqueioBtn');
const bloqueioNote = document.getElementById('bloqueioNote');
const bloqueiosList = document.getElementById('bloqueiosList');

// -------- Abas --------
const painelTabs = document.getElementById('painelTabs');
const agendamentosTab = document.getElementById('agendamentosTab');
const equipeTab = document.getElementById('equipeTab');
const servicosTab = document.getElementById('servicosTab');

// -------- Gerenciar Equipe --------
const barbeiroForm = document.getElementById('barbeiroForm');
const barbeiroEditId = document.getElementById('barbeiroEditId');
const barbeiroNomeInput = document.getElementById('barbeiroNomeInput');
const barbeiroEspecialidadeInput = document.getElementById('barbeiroEspecialidadeInput');
const barbeiroFotoInput = document.getElementById('barbeiroFotoInput');
const barbeiroFormTitle = document.getElementById('equipeFormTitle');
const barbeiroSalvarBtn = document.getElementById('barbeiroSalvarBtn');
const barbeiroCancelarBtn = document.getElementById('barbeiroCancelarBtn');
const barbeiroFormNote = document.getElementById('barbeiroFormNote');
const precosGrid = document.getElementById('precosGrid');
const equipeLista = document.getElementById('equipeLista');

// -------- Gerenciar Serviços --------
const servicoForm = document.getElementById('servicoForm');
const servicoEditId = document.getElementById('servicoEditId');
const servicoNomeInput = document.getElementById('servicoNomeInput');
const servicoPrecoInput = document.getElementById('servicoPrecoInput');
const servicoDescInput = document.getElementById('servicoDescInput');
const servicoFormTitle = document.getElementById('servicoFormTitle');
const servicoSalvarBtn = document.getElementById('servicoSalvarBtn');
const servicoCancelarBtn = document.getElementById('servicoCancelarBtn');
const servicoFormNote = document.getElementById('servicoFormNote');
const servicosLista = document.getElementById('servicosLista');

if (servicoPrecoInput) {
  servicoPrecoInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9,.]/g, '');
  });
}

let sessaoAtual = null;
let permissoesAtuais = null;
let mostrarCancelados = false;

function hojeISO() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function telefoneParaWhatsApp(telefone) {
  const digitos = (telefone || '').replace(/\D/g, '');
  if (digitos.startsWith('55') && digitos.length >= 12) return digitos;
  return `55${digitos}`;
}

function escapeHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}

function obterRotuloStatus(agendamento) {
  if (agendamento.status !== 'cancelado') return 'Confirmado';
  if (agendamento.motivoCancelamento?.startsWith('Cancelado por Indisponibilidade')) {
    return 'Cancelado por Indisponibilidade';
  }
  return 'Cancelado';
}

// =========================================================
// LOGIN
// =========================================================

if (loginForm) {
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      const email = document.getElementById('loginEmail').value;
      const senha = document.getElementById('loginSenha').value;
      const sessao = autenticar(email, senha);

      if (!sessao) {
        loginNote.textContent = 'E-mail ou senha incorretos.';
        loginNote.classList.add('form-note-error');
        return;
      }

      loginNote.classList.remove('form-note-error');
      loginNote.textContent = '';
      entrarNoPainel(sessao);
    } catch (erro) {
      console.error(erro);
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    encerrarSessao();
    sessaoAtual = null;
    permissoesAtuais = null;
    dashboardView.hidden = true;
    logoutBtn.hidden = true;
    loginView.hidden = false;
    loginForm.reset();
  });
}

function montarChipsDeHorario() {
  if (!bloqueioHorariosChips) return;
  
  const horariosOficiais = gerarHorariosPadrao();
  
  bloqueioHorariosChips.style.display = 'flex';
  bloqueioHorariosChips.style.flexWrap = 'wrap';
  bloqueioHorariosChips.style.gap = '8px';
  bloqueioHorariosChips.style.display = 'flex'; 

  bloqueioHorariosChips.innerHTML = horariosOficiais.map(hora => `
    <label class="chip">
      <input type="checkbox" name="horario_bloqueio" value="${hora}">
      <span>${hora}</span>
    </label>
  `).join('');
}

function entrarNoPainel(sessao) {
  sessaoAtual = sessao;
  permissoesAtuais = obterPermissoes(sessao);

  loginView.hidden = true;
  dashboardView.hidden = false;
  logoutBtn.hidden = false;

  painelWelcome.textContent = `Olá, ${sessao.nome} — ${PERFIL_LABELS[sessao.perfil] || sessao.perfil}`;

  limparCanceladosAntigos();
  montarFiltroBarbeiro();
  montarBloqueioDia();
  montarChipsDeHorario();
  montarTabs();
  renderizarLista();
  renderizarBloqueios();
}

// =========================================================
// FILTRO DE BARBEIROS
// =========================================================

function montarFiltroBarbeiro() {
  if (!permissoesAtuais.podeVerTodos) {
    painelBarbeiroFiltroWrap.hidden = true;
    return;
  }
  painelBarbeiroFiltroWrap.hidden = false;
  painelBarbeiroSelect.innerHTML = '<option value="todos">Todos os barbeiros</option>';
  
  obterListaBarbeiros().forEach((barbeiro) => {
    const opcao = document.createElement('option');
    opcao.value = barbeiro.id;
    opcao.textContent = barbeiro.nome;
    painelBarbeiroSelect.appendChild(opcao);
  });
}

// =========================================================
// BLOQUEIO DE DIA
// =========================================================

function montarBloqueioDia() {
  if (!permissoesAtuais.podeBloquearDia) {
    painelBlockDayWrap.hidden = true;
    return;
  }

  painelBlockDayWrap.hidden = false;
  bloqueioData.min = hojeISO();
  bloqueioNote.textContent = '';
  bloqueioNote.classList.remove('form-note-error');

  if (permissoesAtuais.barbeiroFixo) {
    bloqueioBarbeiroWrap.hidden = true;
  } else {
    bloqueioBarbeiroWrap.hidden = false;
    bloqueioBarbeiroSelect.innerHTML = '';
    
    const listaBarbeiros = obterListaBarbeiros();
    listaBarbeiros.forEach((barbeiro) => {
      const opcao = document.createElement('option');
      opcao.value = barbeiro.id;
      opcao.textContent = barbeiro.nome;
      bloqueioBarbeiroSelect.appendChild(opcao);
    });
  }

  montarChipsDeHorario();
}

function obterBarbeiroAlvoDoBloqueio() {
  return permissoesAtuais.barbeiroFixo || bloqueioBarbeiroSelect.value;
}

if (bloqueioBtn) {
  bloqueioBtn.addEventListener('click', () => {
    try {
      bloqueioNote.classList.remove('form-note-error');
      const dataSelecionada = bloqueioData.value;
      const barbeiroId = obterBarbeiroAlvoDoBloqueio();

      if (!dataSelecionada || !barbeiroId) {
        bloqueioNote.textContent = 'Escolha a data e o barbeiro.';
        bloqueioNote.classList.add('form-note-error');
        return;
      }

      if (diaEstaBloqueado(barbeiroId, dataSelecionada)) {
        bloqueioNote.textContent = 'Esse dia já está bloqueado para esse barbeiro.';
        bloqueioNote.classList.add('form-note-error');
        return;
      }

      const agendamentosAfetados = obterAgendamentos().filter(
        (a) => a.barbeiroId === barbeiroId && a.data === dataSelecionada && a.status === 'confirmado'
      );

      if (agendamentosAfetados.length > 0) {
        if (!window.confirm(`Remover e cancelar ${agendamentosAfetados.length} agendamentos?`)) return;
      }

      agendamentosAfetados.forEach((agendamento) => {
        cancelarAgendamento(agendamento.id, `Cancelado por Indisponibilidade. Ausência registrada por ${sessaoAtual?.nome || 'usuário do painel'}.`);
        const [anoAg, mesAg, diaAg] = (agendamento.data || '').split('-');
        const dataExibida = agendamento.dataFormatada || (diaAg ? `${diaAg}/${mesAg}/${anoAg}` : agendamento.data);
        const mensagem = `Olá, ${agendamento.nome}! Infelizmente precisamos cancelar o seu agendamento do dia ${dataExibida} às ${agendamento.hora} por motivo de força maior.`;
        window.open(`https://wa.me/${telefoneParaWhatsApp(agendamento.telefone)}?text=${encodeURIComponent(mensagem)}`, '_blank');
      });

      const bloqueios = obterDiasBloqueados();
      bloqueios.push({
        id: `bl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        barbeiroId,
        data: dataSelecionada,
        motivo: `Ausência registrada por ${sessaoAtual.nome}.`,
        criadoEm: new Date().toISOString()
      });

      salvarDiasBloqueados(bloqueios);
      bloqueioData.value = '';
      renderizarBloqueios();
      renderizarLista();
    } catch (erro) {
      console.error(erro);
    }
  });
}

function renderizarBloqueios() {
  const todosBloqueios = obterDiasBloqueados();
  const bloqueiosVisiveis = permissoesAtuais.podeVerTodos
    ? todosBloqueios
    : todosBloqueios.filter((b) => b.barbeiroId === permissoesAtuais.barbeiroFixo);

  if (bloqueiosVisiveis.length === 0) {
    bloqueiosList.innerHTML = '<p class="bloqueios-empty">Nenhum dia bloqueado no momento.</p>';
    return;
  }

  const ordenados = [...bloqueiosVisiveis].sort((a, b) => a.data.localeCompare(b.data));

  bloqueiosList.innerHTML = ordenados.map((bloqueio) => {
    const barbeiro = obterBarbeiroPorId(bloqueio.barbeiroId);
    const [ano, mes, dia] = bloqueio.data.split('-');
    return `
      <div class="bloqueio-item">
        <span>
          <i class="ph ph-calendar-x" aria-hidden="true"></i>
          ${dia}/${mes}/${ano} — ${escapeHtml(barbeiro ? barbeiro.nome : bloqueio.barbeiroId)}
        </span>
        <button type="button" class="btn btn-outline btn-sm" data-desbloquear="${bloqueio.id}">Desbloquear</button>
      </div>
    `;
  }).join('');
}

if (bloqueiosList) {
  bloqueiosList.addEventListener('click', (event) => {
    const botao = event.target.closest('[data-desbloquear]');
    if (!botao) return;
    desbloquearDia(botao.getAttribute('data-desbloquear'));
    renderizarBloqueios();
  });
}

// =========================================================
// AGENDAMENTOS
// =========================================================

function renderizarLista() {
  const dataFiltro = painelData.value;
  const hoje = hojeISO();

  let agendamentos = obterAgendamentos().filter((a) => dataFiltro ? a.data === dataFiltro : a.data >= hoje);
  if (!mostrarCancelados) agendamentos = agendamentos.filter((a) => a.status === 'confirmado');

  if (permissoesAtuais.podeVerTodos) {
    const barbeiroFiltro = painelBarbeiroSelect.value || 'todos';
    if (barbeiroFiltro !== 'todos') agendamentos = agendamentos.filter((a) => a.barbeiroId === barbeiroFiltro);
  } else {
    agendamentos = agendamentos.filter((a) => a.barbeiroId === permissoesAtuais.barbeiroFixo);
  }

  agendamentos.sort((a, b) => a.data === b.data ? a.hora.localeCompare(b.hora) : a.data.localeCompare(b.data));

  painelLista.innerHTML = '';
  painelCount.textContent = `${agendamentos.length} agendamento(s)`;

  if (agendamentos.length === 0) {
    painelEmpty.hidden = false;
    return;
  }
  painelEmpty.hidden = true;
  agendamentos.forEach((agendamento) => {
    painelLista.appendChild(criarCardAgendamento(agendamento));
  });
}

function criarCardAgendamento(agendamento) {
  const numeroWhatsApp = telefoneParaWhatsApp(agendamento.telefone);
  const barbeiro = obterBarbeiroPorId(agendamento.barbeiroId);
  const servicosTexto = agendamento.servicosNomes?.length ? agendamento.servicosNomes.join(', ') : 'Serviço não informado';
  const valorTexto = typeof agendamento.valorTotal === 'number' ? formatarMoeda(agendamento.valorTotal) : '—';
  const [, mes, dia] = (agendamento.data || '').split('-');
  const dataCurta = dia && mes ? `${dia}/${mes}` : '';
  const cancelado = agendamento.status === 'cancelado';
  const podeGerenciar = permissoesAtuais.podeCancelarTodos || permissoesAtuais.barbeiroFixo === agendamento.barbeiroId;
  const podeCancelar = !cancelado && podeGerenciar;

  const card = document.createElement('article');
  card.className = `painel-card${cancelado ? ' painel-card-cancelado' : ''}`;
  card.dataset.id = agendamento.id;

  card.innerHTML = `
    <div class="painel-card-main">
      <div class="painel-card-time">
        ${dataCurta ? `<span class="painel-card-date">${escapeHtml(dataCurta)}</span>` : ''}
        ${escapeHtml(agendamento.hora)}
      </div>
      <div class="painel-card-info">
        <h3>
          ${escapeHtml(agendamento.nome)}
          <span class="status-badge ${cancelado ? 'status-cancelado' : 'status-confirmado'}">${obterRotuloStatus(agendamento)}</span>
        </h3>
        <p>
          ${permissoesAtuais.podeVerTodos ? `${escapeHtml(barbeiro ? barbeiro.nome : 'Removido')} · ` : ''}
          ${escapeHtml(servicosTexto)} · <strong>${valorTexto}</strong>
        </p>
        <p>${escapeHtml(agendamento.telefone)}</p>
      </div>
    </div>
    <div class="painel-card-actions">
      <a class="btn btn-outline btn-sm" href="https://wa.me/${numeroWhatsApp}" target="_blank" rel="noopener noreferrer"><i class="ph ph-whatsapp-logo"></i> WhatsApp</a>
      ${podeCancelar ? `<button type="button" class="btn btn-danger btn-sm" data-cancelar="${agendamento.id}"><i class="ph ph-x-circle"></i> Cancelar</button>` : ''}
      ${podeGerenciar ? `<button type="button" class="btn btn-outline btn-sm btn-excluir" data-excluir="${agendamento.id}"><i class="ph ph-trash"></i> Excluir</button>` : ''}
    </div>
  `;
  return card;
}

if (painelLista) {
  painelLista.addEventListener('click', (event) => {
    const botaoCancelar = event.target.closest('[data-cancelar]');
    if (botaoCancelar) {
      const id = botaoCancelar.getAttribute('data-cancelar');
      const agendamento = obterAgendamentos().find((a) => a.id === id);
      if (!agendamento || !window.confirm(`Cancelar o agendamento de ${agendamento.nome}?`)) return;

      cancelarAgendamento(id, 'Cancelado pelo responsável do painel.');
      const mensagem = `Olá, ${agendamento.nome}! Infelizmente precisamos cancelar o seu agendamento do dia ${agendamento.dataFormatada} às ${agendamento.hora}.`;
      window.open(`https://wa.me/${telefoneParaWhatsApp(agendamento.telefone)}?text=${encodeURIComponent(mensagem)}`, '_blank');
      renderizarLista();
      return;
    }

    const botaoExcluir = event.target.closest('[data-excluir]');
    if (botaoExcluir) {
      if (!window.confirm('Excluir definitivamente?')) return;
      removerAgendamento(botaoExcluir.dataset.excluir);
      renderizarLista();
    }
  });
}

// =========================================================
// FILTROS
// =========================================================

if (painelData) painelData.addEventListener('change', renderizarLista);
if (painelHojeBtn) painelHojeBtn.addEventListener('click', () => { painelData.value = hojeISO(); renderizarLista(); });
if (painelTodosBtn) painelTodosBtn.addEventListener('click', () => { painelData.value = ''; renderizarLista(); });
if (painelBarbeiroSelect) painelBarbeiroSelect.addEventListener('change', renderizarLista);

if (painelVerCanceladosBtn) {
  painelVerCanceladosBtn.addEventListener('click', () => {
    mostrarCancelados = !mostrarCancelados;
    painelVerCanceladosBtn.innerHTML = mostrarCancelados ? '<i class="ph ph-eye-slash"></i> Ocultar Cancelados' : '<i class="ph ph-eye"></i> Ver Cancelados';
    renderizarLista();
  });
}

// =========================================================
// ABAS
// =========================================================

function montarTabs() {
  if (!permissoesAtuais.podeGerenciarEquipe) {
    painelTabs.hidden = true;
    agendamentosTab.hidden = false;
    equipeTab.hidden = true;
    if (servicosTab) servicosTab.hidden = true;
    return;
  }
  painelTabs.hidden = false;
  ativarTab('agendamentos');
}

function ativarTab(nomeTab) {
  agendamentosTab.hidden = nomeTab !== 'agendamentos';
  equipeTab.hidden = nomeTab !== 'equipe';
  if (servicosTab) servicosTab.hidden = nomeTab !== 'servicos';

  painelTabs.querySelectorAll('.painel-tab').forEach((botao) => {
    botao.classList.toggle('active', botao.dataset.tab === nomeTab);
  });

  if (nomeTab === 'equipe') montarAbaEquipe();
  if (nomeTab === 'servicos') renderizarServicosPainel();
}

if (painelTabs) {
  painelTabs.addEventListener('click', (event) => {
    const botao = event.target.closest('.painel-tab');
    if (botao) ativarTab(botao.dataset.tab);
  });
}

// =========================================================
// GERENCIAR EQUIPE
// =========================================================

function montarAbaEquipe() {
  montarCamposDePreco();
  renderizarEquipeLista();
}

function montarCamposDePreco(precosExistentes) {
  precosGrid.innerHTML = obterListaServicos().map((servico) => `
    <div class="form-group">
      <label for="preco-${servico.id}">${escapeHtml(servico.nome)}</label>
      <input type="number" id="preco-${servico.id}" min="0" step="1" value="${precosExistentes?.[servico.id] ?? ''}" placeholder="0">
    </div>
  `).join('');
}

function renderizarEquipeLista() {
  const barbeiros = obterListaBarbeiros();
  if (barbeiros.length === 0) {
    equipeLista.innerHTML = '<p class="painel-empty">Nenhum barbeiro cadastrado ainda.</p>';
    return;
  }

  equipeLista.innerHTML = barbeiros.map((barbeiro) => `
    <article class="equipe-card">
      <div class="equipe-card-info">
        <h3>${escapeHtml(barbeiro.nome)}</h3>
        <p>${escapeHtml(barbeiro.especialidade || 'Sem especialidade')}</p>
        <p class="equipe-card-precos">
          ${obterListaServicos().map((s) => `${escapeHtml(s.nome)}: ${formatarMoeda(barbeiro.precos?.[s.id] ?? 0)}`).join(' · ')}
        </p>
      </div>
      <div class="equipe-card-actions">
        <button type="button" class="btn btn-outline btn-sm" data-editar-barbeiro="${barbeiro.id}">Editar</button>
        <button type="button" class="btn btn-danger btn-sm" data-remover-barbeiro="${barbeiro.id}">Remover</button>
      </div>
    </article>
  `).join('');
}

function iniciarEdicaoBarbeiro(id) {
  const barbeiro = obterBarbeiroPorId(id);
  if (!barbeiro) return;

  barbeiroEditId.value = barbeiro.id;
  barbeiroNomeInput.value = barbeiro.nome || '';
  barbeiroEspecialidadeInput.value = barbeiro.especialidade || '';
  barbeiroFotoInput.value = barbeiro.foto || '';
  montarCamposDePreco(barbeiro.precos);

  barbeiroFormTitle.innerHTML = '<i class="ph ph-pencil-simple"></i> Editar barbeiro';
  barbeiroSalvarBtn.textContent = 'Salvar edição';
  barbeiroCancelarBtn.hidden = false;
  barbeiroForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetarFormularioBarbeiro() {
  barbeiroForm.reset();
  barbeiroEditId.value = '';
  montarCamposDePreco();
  barbeiroFormTitle.innerHTML = '<i class="ph ph-user-plus"></i> Adicionar barbeiro';
  barbeiroSalvarBtn.textContent = 'Salvar barbeiro';
  barbeiroCancelarBtn.hidden = true;
}

if (barbeiroCancelarBtn) barbeiroCancelarBtn.addEventListener('click', resetarFormularioBarbeiro);

if (barbeiroForm) {
  barbeiroForm.addEventListener('submit', (event) => {
    event.preventDefault();
    barbeiroFormNote.classList.remove('form-note-error');

    const nome = barbeiroNomeInput.value.trim();
    if (nome.length < 2) return;

    const precos = {};
    obterListaServicos().forEach((servico) => {
      const input = document.getElementById(`preco-${servico.id}`);
      const valor = Number(input?.value);
      precos[servico.id] = Number.isFinite(valor) && valor >= 0 ? valor : 0;
    });

    const dados = { nome, especialidade: barbeiroEspecialidadeInput.value, foto: barbeiroFotoInput.value, precos };
    const idEmEdicao = barbeiroEditId.value;

    if (idEmEdicao) {
      atualizarBarbeiro(idEmEdicao, dados);
    } else {
      const novoId = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-');
      dados.id = novoId;
      adicionarBarbeiro(dados);

      const emailGerado = `${novoId}@domfelipe.com`;
      alert(`Barbeiro ${nome} adicionado com sucesso!\n\nCredenciais de acesso:\nLogin: ${emailGerado}\nSenha: 123`);
    }
    resetarFormularioBarbeiro();
    renderizarEquipeLista();
    montarFiltroBarbeiro();
  });
}

if (equipeLista) {
  equipeLista.addEventListener('click', (event) => {
    const btnEditar = event.target.closest('[data-editar-barbeiro]');
    if (btnEditar) return iniciarEdicaoBarbeiro(btnEditar.dataset.editarBarbeiro);

    const btnRemover = event.target.closest('[data-remover-barbeiro]');
    if (btnRemover) {
      if (!window.confirm('Remover este barbeiro da equipe e revogar seu acesso?')) return;
      
      const barbeiroId = btnRemover.dataset.removerBarbeiro;
      const hoje = hojeISO();
      
      const agendamentosAfetados = obterAgendamentos().filter(
        (a) => a.barbeiroId === barbeiroId && a.status === 'confirmado' && a.data >= hoje
      );

      if (agendamentosAfetados.length > 0) {
        if (!window.confirm(`ATENÇÃO: Este barbeiro tem ${agendamentosAfetados.length} agendamento(s) futuro(s). Deseja cancelar todos e gerar os links de WhatsApp para avisar os clientes?`)) {
          return; 
        }

        agendamentosAfetados.forEach((agendamento) => {
          cancelarAgendamento(agendamento.id, 'Cancelado por desligamento do profissional.');
          
          const [ano, mes, dia] = agendamento.data.split('-');
          const dataExibida = `${dia}/${mes}/${ano}`;
          const mensagem = `Olá, ${agendamento.nome}. Infelizmente precisamos cancelar o seu agendamento do dia ${dataExibida} às ${agendamento.hora} devido ao desligamento do profissional. Por favor, acesse nosso site para reagendar com outro membro da nossa equipe!`;
          
          window.open(`https://wa.me/${telefoneParaWhatsApp(agendamento.telefone)}?text=${encodeURIComponent(mensagem)}`, '_blank');
        });
      }

      removerBarbeiro(barbeiroId);
      
      renderizarEquipeLista();
      montarFiltroBarbeiro();
      renderizarLista();
    }
    }); 
}

// =========================================================
// GERENCIAR SERVIÇOS
// =========================================================

function renderizarServicosPainel() {
  const servicos = obterListaServicos();
  if (servicos.length === 0) {
    servicosLista.innerHTML = '<p class="painel-empty">Nenhum serviço cadastrado.</p>';
    return;
  }

  const servicosOrdenados = [...servicos].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  servicosLista.innerHTML = servicosOrdenados.map((s, index) => {
    const isFirst = index === 0;
    const isLast = index === servicosOrdenados.length - 1;

    return `
      <article class="equipe-card">
        <div class="equipe-card-info">
          <h3>${s.icone} ${escapeHtml(s.nome)}</h3>
          <p>${escapeHtml(s.descricao)}</p>
          <p class="equipe-card-precos text-accent">Preço Base: ${formatarMoeda(Number(s.preco) || 0)}</p>
        </div>
        <div class="equipe-card-actions">
          <button type="button" class="btn btn-outline btn-sm" data-mover-servico="${s.id}" data-direcao="subir" ${isFirst ? 'disabled' : ''} title="Mover para cima"><i class="ph ph-arrow-up"></i></button>
          <button type="button" class="btn btn-outline btn-sm" data-mover-servico="${s.id}" data-direcao="descer" ${isLast ? 'disabled' : ''} title="Mover para baixo"><i class="ph ph-arrow-down"></i></button>
          <button type="button" class="btn btn-outline btn-sm" data-editar-servico="${s.id}"><i class="ph ph-pencil-simple"></i> Editar</button>
          <button type="button" class="btn btn-danger btn-sm" data-remover-servico="${s.id}"><i class="ph ph-trash"></i> Remover</button>
        </div>
      </article>
    `;
  }).join('');
}

function iniciarEdicaoServico(id) {
  const servico = obterServicoPorId(id);
  if (!servico) return;

  servicoEditId.value = servico.id;
  servicoNomeInput.value = servico.nome || '';
  servicoPrecoInput.value = servico.preco || '';
  servicoDescInput.value = servico.descricao || '';
  
  const classeIcone = servico.icone?.match(/ph-[a-z-]+/)?.[0] || 'ph-scissors';
  const radioIcone = document.querySelector(`input[name="icone_picker"][value="${classeIcone}"]`);
  if (radioIcone) radioIcone.checked = true;

  servicoFormTitle.innerHTML = '<i class="ph ph-pencil-simple"></i> Editar serviço';
  servicoSalvarBtn.textContent = 'Salvar edição';
  servicoCancelarBtn.hidden = false;
  servicoFormNote.textContent = '';
  servicoForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetarFormularioServico() {
  servicoForm.reset();
  servicoEditId.value = '';
  servicoFormTitle.innerHTML = '<i class="ph ph-plus-circle"></i> Adicionar Serviço';
  servicoSalvarBtn.textContent = 'Salvar serviço';
  servicoCancelarBtn.hidden = true;
}

if (servicoCancelarBtn) servicoCancelarBtn.addEventListener('click', resetarFormularioServico);

if (servicoForm) {
  servicoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = servicoNomeInput.value.trim();
    const precoTexto = servicoPrecoInput.value.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
    const preco = Number(precoTexto) || 0;
    const descricao = servicoDescInput.value.trim();
    const iconeValor = document.querySelector('input[name="icone_picker"]:checked')?.value || 'ph-scissors';
    const icone = `<i class="ph ${iconeValor}" aria-hidden="true"></i>`;

    let servicos = obterListaServicos();
    const idEmEdicao = servicoEditId.value;
    const novoId = idEmEdicao || `servico_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    
    const dadosServico = {
      id: novoId,
      nome,
      descricao,
      icone,
      preco,
      ordem: idEmEdicao ? servicos.find((s) => s.id === idEmEdicao)?.ordem || 0 : servicos.length + 1
    };

    if (idEmEdicao) {
      const index = servicos.findIndex((s) => s.id === idEmEdicao);
      if (index !== -1) servicos[index] = dadosServico;
    } else {
      servicos.push(dadosServico);
    }

    salvarListaServicos(servicos);
    resetarFormularioServico();
    renderizarServicosPainel();
    montarCamposDePreco();
  });
}

if (servicosLista) {
  servicosLista.addEventListener('click', (event) => {
    const btnMover = event.target.closest('[data-mover-servico]');
    if (btnMover) {
      moverServicoPainel(btnMover.dataset.moverServico, btnMover.dataset.direcao);
      return;
    }

    const btnEditar = event.target.closest('[data-editar-servico]');
    if (btnEditar) return iniciarEdicaoServico(btnEditar.dataset.editarServico);

    const btnRemover = event.target.closest('[data-remover-servico]');
    if (btnRemover) {
      if (!confirm('Tem certeza que deseja remover este serviço? Ele sairá da tela de agendamento no mesmo instante.')) return;

      const servicoId = btnRemover.dataset.removerServico;
      let servicos = obterListaServicos();
      servicos = servicos.filter((s) => s.id !== servicoId);
      salvarListaServicos(servicos);

      const barbeiros = obterListaBarbeiros();
      barbeiros.forEach((barbeiro) => {
        if (!barbeiro.precos || !(servicoId in barbeiro.precos)) return;
        const precosAtualizados = { ...barbeiro.precos };
        delete precosAtualizados[servicoId];
        atualizarBarbeiro(barbeiro.id, {
          nome: barbeiro.nome,
          especialidade: barbeiro.especialidade || '',
          foto: barbeiro.foto || '',
          precos: precosAtualizados
        });
      });

      renderizarServicosPainel();
      montarCamposDePreco();
    }
  });
}

function moverServicoPainel(idServico, direcao) {
  let servicos = obterListaServicos();
  servicos.forEach((s, idx) => { if (s.ordem === undefined) s.ordem = idx + 1; });
  servicos.sort((a, b) => a.ordem - b.ordem);

  const index = servicos.findIndex((s) => s.id === idServico);
  if (index === -1) return;
  const novoIndex = direcao === 'subir' ? index - 1 : index + 1;

  if (novoIndex >= 0 && novoIndex < servicos.length) {
    const temp = servicos[index];
    servicos[index] = servicos[novoIndex];
    servicos[novoIndex] = temp;
    servicos.forEach((s, idx) => { s.ordem = idx + 1; });
    salvarListaServicos(servicos);
    renderizarServicosPainel();
  }
}

// =========================================================
// INICIALIZAÇÃO E LIMPEZA
// =========================================================

const sessaoExistente = obterSessao();
if (sessaoExistente) {
  entrarNoPainel(sessaoExistente);
} else {
  loginView.hidden = false;
  dashboardView.hidden = true;
}

const anoPainel = document.getElementById('anoPainel');
if (anoPainel) anoPainel.textContent = new Date().getFullYear();

function limparCanceladosAntigos() {
  try {
    let agendamentos = JSON.parse(localStorage.getItem('domfelipe_agendamentos')) || [];
    if (agendamentos.length === 0) return;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const agendamentosAtualizados = agendamentos.filter((agendamento) => {
      if (agendamento.status !== 'cancelado') return true;
      if (!agendamento.data) return false;
      
      const [ano, mes, dia] = agendamento.data.split('-').map(Number);
      const dataAgendamento = new Date(ano, mes - 1, dia);
      const diferencaTempo = hoje.getTime() - dataAgendamento.getTime();
      return (diferencaTempo / (1000 * 3600 * 24)) < 7;
    });

    if (agendamentosAtualizados.length < agendamentos.length) {
      localStorage.setItem('domfelipe_agendamentos', JSON.stringify(agendamentosAtualizados));
    }
  } catch (erro) {
    console.error('Erro ao limpar agendamentos cancelados antigos:', erro);
  }
}

window.cancelarAgendamento = function(id, motivo) {
    let agendamentos = JSON.parse(localStorage.getItem('domfelipe_agendamentos')) || [];
    
    let index = agendamentos.findIndex((a) => String(a.id) === String(id));
    
    if (index !== -1) {
        agendamentos[index].status = 'cancelado';
        agendamentos[index].motivoCancelamento = motivo || 'Cancelado pelo painel.';
        
        localStorage.setItem('domfelipe_agendamentos', JSON.stringify(agendamentos));
    }
};