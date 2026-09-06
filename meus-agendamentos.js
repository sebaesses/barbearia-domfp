// =========================================================
// BARBEARIA DOM FELIPE — meus-agendamentos.js
// Mostra os agendamentos ativos criados NESTE navegador (trava por
// "Dispositivo Confiável" — ver obterDeviceId() em data.js) e permite
// cancelar direto pelo site. O cancelamento libera o horário na hora
// (via mudança de status, a mesma convenção usada em todo o projeto)
// e só DEPOIS abre o WhatsApp com uma mensagem pronta, avisando a
// barbearia.
//
// IMPORTANTE (segurança): não existe mais busca manual por telefone.
// A lista é decidida só pelo id do dispositivo salvo no localStorage,
// então só quem agendou NESTE aparelho consegue ver/cancelar esses
// horários — evita que alguém digite um telefone alheio e mexa no
// agendamento de outra pessoa.
//
// Depende de já estarem carregados antes deste arquivo:
//   - data.js              (formatarMoeda, WHATSAPP_NUMERO, obterDeviceId)
//   - barbeiros-storage.js (obterBarbeiroPorId)
//   - agenda-storage.js    (obterAgendamentos, atualizarStatusAgendamento)
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('myBookingsToggleBtn');
  const panel = document.getElementById('myBookingsPanel');
  const note = document.getElementById('myBookingsNote');
  const lista = document.getElementById('myBookingsLista');

  if (!note || !lista) {
    console.error('[meus-agendamentos] Algum elemento da seção não foi encontrado no HTML — confira os ids.');
    return;
  }

  // -------- Painel recolhível: some por padrão, abre com o link
  // discreto abaixo do formulário de agendamento --------
  if (toggleBtn && panel) {
    toggleBtn.addEventListener('click', () => {
      const abrindo = panel.hidden;
      panel.hidden = !abrindo;
      toggleBtn.setAttribute('aria-expanded', String(abrindo));
      toggleBtn.classList.toggle('is-open', abrindo);
    });
  }

  // Escapa texto antes de inserir via innerHTML (nome do cliente e do
  // barbeiro podem ter vindo de um formulário, então não são texto
  // fixo confiável por padrão)
  function escapeHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto ?? '';
    return div.innerHTML;
  }

  function hojeISO() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  // Monta o card de UM agendamento (retorna a string HTML)
  function montarCardAgendamento(agendamento) {
    const barbeiro = obterBarbeiroPorId(agendamento.barbeiroId);
    const nomeBarbeiro = barbeiro ? barbeiro.nome : 'Barbeiro removido';

    const servicosTexto = (agendamento.servicosNomes && agendamento.servicosNomes.length)
      ? agendamento.servicosNomes.join(', ')
      : (agendamento.servico || 'Serviço não informado');

    const valorTexto = typeof agendamento.valorTotal === 'number'
      ? formatarMoeda(agendamento.valorTotal)
      : '';

    const dataExibida = agendamento.dataFormatada || agendamento.data;

    return `
      <article class="my-booking-card" data-id="${agendamento.id}">
        <div class="my-booking-info">
          <span class="my-booking-date">${escapeHtml(dataExibida)} às ${escapeHtml(agendamento.hora)}</span>
          <h3>${escapeHtml(nomeBarbeiro)}</h3>
          <p>${escapeHtml(servicosTexto)}${valorTexto ? ` · ${valorTexto}` : ''}</p>
        </div>
        <button type="button" class="btn btn-danger btn-sm" data-cancelar-agendamento="${agendamento.id}">
          <i class="ph ph-x-circle" aria-hidden="true"></i> Cancelar Agendamento
        </button>
      </article>
    `;
  }

  // Busca (sem input nenhum — é automático) todos os agendamentos
  // ATIVOS e futuros que foram criados NESTE dispositivo, e desenha
  // a lista + a nota de ajuda
  function carregarMeusAgendamentos() {
    try {
      const deviceId = obterDeviceId();
      const hoje = hojeISO();

      const meusAgendamentos = obterAgendamentos()
        .filter((agendamento) =>
          agendamento.deviceId === deviceId
          && agendamento.status === 'confirmado'
          && agendamento.data >= hoje
        )
        .sort((a, b) => (a.data === b.data ? a.hora.localeCompare(b.hora) : a.data.localeCompare(b.data)));

      if (meusAgendamentos.length === 0) {
        lista.innerHTML = '';
        note.classList.remove('form-note-error');
        note.innerHTML = 'Nenhum agendamento encontrado neste aparelho.<br>'
          + '<span class="my-bookings-help">Não encontrou seu agendamento? Entre em contato conosco '
          + `pelo <a href="https://wa.me/${WHATSAPP_NUMERO}" target="_blank" rel="noopener noreferrer">WhatsApp</a> `
          + 'para consultar ou cancelar.</span>';
        return;
      }

      note.textContent = '';
      lista.innerHTML = meusAgendamentos.map(montarCardAgendamento).join('');
    } catch (erro) {
      console.error('[meus-agendamentos] Erro ao carregar os agendamentos deste dispositivo.', erro);
      note.textContent = 'Ocorreu um erro ao carregar seus agendamentos. Tente novamente.';
      note.classList.add('form-note-error');
    }
  }

  // Carrega assim que a página abre — não depende de nenhuma busca
  // manual. Se o painel estiver escondido, a lista já fica pronta
  // pra quando o cliente clicar em "consultar ou cancelar".
  carregarMeusAgendamentos();

  // Delegação de evento: clique em "Cancelar Agendamento" em qualquer
  // card da lista
  lista.addEventListener('click', (event) => {
    const botao = event.target.closest('[data-cancelar-agendamento]');
    if (!botao) return;

    try {
      const id = botao.getAttribute('data-cancelar-agendamento');
      const agendamento = obterAgendamentos().find((a) => a.id === id);
      if (!agendamento) return;

      const dataExibida = agendamento.dataFormatada || agendamento.data;
      const confirmou = window.confirm(
        `Cancelar seu agendamento do dia ${dataExibida} às ${agendamento.hora}? Essa ação não pode ser desfeita.`
      );
      if (!confirmou) return;

      // 1) Cancela (muda o status; NÃO apaga o registro) — a mesma
      //    convenção usada no resto do sistema. Isso já libera o
      //    horário imediatamente pra outros clientes, porque
      //    horarioOcupado() só considera agendamentos com
      //    status === 'confirmado'.
      atualizarStatusAgendamento(
        id,
        'cancelado',
        'Cancelado pelo próprio cliente em "Meus Agendamentos".'
      );

      // 2) Monta a mensagem e abre o WhatsApp oficial da barbearia
      const barbeiro = obterBarbeiroPorId(agendamento.barbeiroId);
      const nomeBarbeiro = barbeiro ? barbeiro.nome : agendamento.barbeiroId;

      const mensagem = `Olá! Gostaria de cancelar meu agendamento do dia `
        + `${dataExibida} às ${agendamento.hora} com o barbeiro ${nomeBarbeiro}.`;

      window.open(
        `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`,
        '_blank',
        'noopener,noreferrer'
      );

      // 3) Remove o card da tela imediatamente e recarrega a lista
      // (que já cuida de mostrar a nota de ajuda se ficar vazia)
      const card = botao.closest('.my-booking-card');
      if (card) card.remove();

      if (!lista.querySelector('.my-booking-card')) {
        carregarMeusAgendamentos();
      }
    } catch (erro) {
      console.error('[meus-agendamentos] Erro ao cancelar agendamento.', erro);
      window.alert('❌ Ocorreu um erro ao cancelar. Veja o console (F12) para detalhes.');
    }
  });
});
