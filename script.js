// =========================================================
// BARBEARIA DOM FELIPE — script.js
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  // -------- Menu mobile (abrir/fechar) --------
  const menuToggle = document.getElementById('menuToggle');
  const mainNav = document.getElementById('mainNav');

  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      const isOpen = mainNav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    mainNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        mainNav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function escapeHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto ?? '';
    return div.innerHTML;
  }

  function montarBarbeirosGrid(barbeiros) {
    const grid = document.getElementById('barbersGrid');
    if (!grid) return;

    if (!barbeiros || barbeiros.length === 0) {
      grid.innerHTML = '<p class="painel-empty">Nenhum barbeiro cadastrado no momento.</p>';
      return;
    }

    grid.innerHTML = barbeiros.map((barbeiro) => `
      <article class="barber-card">
        <div class="barber-photo">
          <img src="${escapeHtml(barbeiro.foto || '')}" alt="${escapeHtml(barbeiro.nome)}, barbeiro da Barbearia Dom Felipe" loading="lazy" onerror="this.classList.add('img-missing')">
          <i class="ph ph-user-circle barber-photo-fallback" aria-hidden="true"></i>
        </div>
        <h3>${escapeHtml(barbeiro.nome)}</h3>
        <p>${escapeHtml(barbeiro.especialidade || '')}</p>
        <a href="#agendamento" class="btn btn-outline btn-block" data-agendar-barbeiro="${barbeiro.id}">Agendar com ${escapeHtml(barbeiro.nome)}</a>
      </article>
    `).join('');
  }

  function montarChipsBarbeiro(barbeiros) {
    const container = document.getElementById('barbeiroChips');
    if (!container) return;

    if (!barbeiros || barbeiros.length === 0) {
      container.innerHTML = '<p class="chip-group-empty">Nenhum barbeiro disponível no momento.</p>';
      return;
    }

    container.innerHTML = barbeiros.map((barbeiro, indice) => `
      <label class="chip chip-lg">
        <input type="radio" name="barbeiro" value="${barbeiro.id}" ${indice === 0 ? 'required' : ''}>
        <span>${escapeHtml(barbeiro.nome)}</span>
      </label>
    `).join('');
  }

  try {
    const listaBarbeiros = obterListaBarbeiros();
    montarBarbeirosGrid(listaBarbeiros);
    montarChipsBarbeiro(listaBarbeiros);
  } catch (erro) {
    console.error('[script] Falha ao montar equipe.', erro);
  }

  // =========================================================
  // RENDERIZAÇÃO DINÂMICA DE SERVIÇOS (NOVA UI SOFT)
  // =========================================================
  function renderizarServicos() {
    const servicos = obterListaServicos(); // Vem do data.js agora
    
    // 1. Gera a Lista Elegante (Vitrine)
    const grid = document.getElementById('servicesGrid');
if (grid) {
  // 1. ORDENA OS SERVIÇOS PELA PROPRIEDADE 'ORDEM' ANTES DE EXIBIR NA HOME
  const servicosOrdenados = [...servicos].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  grid.innerHTML = servicosOrdenados.map(s => {
    
    // Calcula o menor preço da equipe para este serviço específico
    let precoMinimo = s.preco;
    if (typeof calcularPrecoMinimoDoServico === 'function') {
      const precoCalculado = calcularPrecoMinimoDoServico(s.id);
      if (precoCalculado !== null) {
        precoMinimo = precoCalculado;
      }
    }

    return `
    <div class="service-menu-item" data-service="${s.id}" role="button" tabindex="0" aria-label="Agendar ${s.nome}">
      <div class="service-menu-left">
        <div class="service-menu-icon">${s.icone}</div>
        <div class="service-menu-info">
          <h3>${escapeHtml(s.nome)}</h3>
          <p>${escapeHtml(s.descricao)}</p>
        </div>
      </div>
      <div class="service-menu-price">A partir de R$ ${precoMinimo}</div>
    </div>
    `;
  }).join('');
}

    // 2. Gera o Scroll Horizontal (Formulário)
    const chips = document.getElementById('servicoChips');
    if (chips) {
      chips.innerHTML = servicos.map(s => `
        <label class="chip">
          <input type="checkbox" name="servicos" value="${s.id}">
          <span>${s.icone} ${escapeHtml(s.nome)}</span>
        </label>
      `).join('');
    }
  }

  renderizarServicos();

  // =========================================================
  // REFERÊNCIAS DO FORMULÁRIO
  // =========================================================
  const bookingForm = document.getElementById('bookingForm');
  const formNote = document.getElementById('formNote');
  const nomeInput = document.getElementById('nome');
  const nomeErro = document.getElementById('nomeErro');
  const telefoneInput = document.getElementById('telefone');
  const telefoneErro = document.getElementById('telefoneErro');
  const servicosErro = document.getElementById('servicosErro');
  const observacoesInput = document.getElementById('observacoes');
  const priceTotalValue = document.getElementById('priceTotalValue');
  const secaoAgendamento = document.getElementById('agendamento');

  function irParaAgendamento() {
    secaoAgendamento?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // -------- Delegação de evento para os serviços e barbeiros --------
  document.addEventListener('click', (event) => {
    const cardServico = event.target.closest('[data-service]');
    if (cardServico) {
      const checkbox = document.querySelector(`input[name="servicos"][value="${cardServico.dataset.service}"]`);
      if (checkbox) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
      irParaAgendamento();
      return;
    }

    const botaoBarbeiro = event.target.closest('[data-agendar-barbeiro]');
    if (botaoBarbeiro) {
      const radio = document.querySelector(`input[name="barbeiro"][value="${botaoBarbeiro.dataset.agendarBarbeiro}"]`);
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      const card = event.target.closest('[data-service]');
      if (card) {
        event.preventDefault();
        card.click();
      }
    }
  });

  // =========================================================
  // MÁSCARA E VALIDAÇÃO DE TELEFONE
  // =========================================================
  function aplicarMascaraTelefone(valor) {
    const digitos = valor.replace(/\D/g, '').slice(0, 11);
    let formatado = digitos;

    if (digitos.length > 2) {
      formatado = `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
    }
    if (digitos.length > 7) {
      formatado = `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
    }
    return formatado;
  }

  if (telefoneInput) {
    const validarTelefoneAoDigitar = () => {
      telefoneInput.value = aplicarMascaraTelefone(telefoneInput.value);
      const digitos = telefoneInput.value.replace(/\D/g, '');

      if (digitos.length === 0) {
        telefoneInput.classList.remove('input-error');
        telefoneErro.hidden = true;
        return;
      }

      if (digitos.length < 11) {
        telefoneInput.classList.add('input-error');
        telefoneErro.hidden = false;
      } else {
        telefoneInput.classList.remove('input-error');
        telefoneErro.hidden = true;
      }
    };

    telefoneInput.addEventListener('input', validarTelefoneAoDigitar);
    telefoneInput.addEventListener('blur', validarTelefoneAoDigitar);
  }

  // =========================================================
  // VALIDAÇÃO DE NOME
  // =========================================================
  if (nomeInput) {
    const validarNomeAoDigitar = () => {
      const valor = nomeInput.value.trim();

      if (valor.length === 0) {
        nomeInput.classList.remove('input-error');
        nomeErro.hidden = true;
        return;
      }

      if (valor.length < 2) {
        nomeInput.classList.add('input-error');
        nomeErro.hidden = false;
      } else {
        nomeInput.classList.remove('input-error');
        nomeErro.hidden = true;
      }
    };

    nomeInput.addEventListener('input', validarNomeAoDigitar);
    nomeInput.addEventListener('blur', validarNomeAoDigitar);
  }

  // =========================================================
  // PREÇO TOTAL E ENVIO
  // =========================================================
  function obterServicosSelecionados() {
    return Array.from(document.querySelectorAll('input[name="servicos"]:checked')).map((i) => i.value);
  }

  function calcularPrecoTotal() {
    const barbeiroId = obterBarbeiroSelecionado();
    const servicosIds = obterServicosSelecionados();

    if (!barbeiroId || servicosIds.length === 0) {
      priceTotalValue.textContent = formatarMoeda(0);
      return 0;
    }

    const total = servicosIds.reduce((soma, servicoId) => soma + obterPreco(barbeiroId, servicoId), 0);
    priceTotalValue.textContent = formatarMoeda(total);
    return total;
  }

  if (bookingForm) {
    bookingForm.addEventListener('change', (event) => {
      if (event.target.name === 'barbeiro') calcularPrecoTotal();
      if (event.target.name === 'servicos') {
        servicosErro.hidden = true;
        calcularPrecoTotal();
      }
    });

    bookingForm.addEventListener('submit', (event) => {
      event.preventDefault();
      formNote.classList.remove('form-note-error');

      let formularioValido = true;
      const nome = nomeInput.value.trim();
      const telefoneDigitos = telefoneInput.value.replace(/\D/g, '');
      const barbeiroId = obterBarbeiroSelecionado();
      const servicosIds = obterServicosSelecionados();
      const hora = obterHoraSelecionada();
      const observacoes = observacoesInput.value.trim();

      if (nome.length < 2) {
        nomeInput.classList.add('input-error');
        nomeErro.hidden = false;
        formularioValido = false;
      } else {
        nomeInput.classList.remove('input-error');
        nomeErro.hidden = true;
      }

      if (telefoneDigitos.length !== 11) {
        telefoneInput.classList.add('input-error');
        telefoneErro.hidden = false;
        formularioValido = false;
      } else {
        telefoneInput.classList.remove('input-error');
        telefoneErro.hidden = true;
      }

      if (!barbeiroId) {
        formNote.textContent = 'Escolha um barbeiro para continuar.';
        formNote.classList.add('form-note-error');
        formularioValido = false;
      }

      if (servicosIds.length === 0) {
        servicosErro.hidden = false;
        formularioValido = false;
      } else {
        servicosErro.hidden = true;
      }

      const resultadoData = validarData(dataInput.value, barbeiroId);
      if (!resultadoData.valido) {
        formNote.textContent = resultadoData.motivo;
        formNote.classList.add('form-note-error');
        formularioValido = false;
      }

      if (!hora) {
        formNote.textContent = 'Escolha um horário.';
        formNote.classList.add('form-note-error');
        formularioValido = false;
      }

      if (!formularioValido) return;

      const horariosAgora = obterHorariosDisponiveis(barbeiroId, dataInput.value);
      if (!horariosAgora.includes(hora)) {
        formNote.textContent = 'Esse horário acabou de ficar indisponível. Escolha outro horário.';
        formNote.classList.add('form-note-error');
        popularHoraChips(obterHorariosComStatus(barbeiroId, dataInput.value));
        return;
      }

      const barbeiro = obterBarbeiroPorId(barbeiroId);
      const servicosNomes = servicosIds.map((id) => obterServicoPorId(id)?.nome || id);
      const valorTotal = servicosIds.reduce((soma, id) => soma + obterPreco(barbeiroId, id), 0);
      const [ano, mes, dia] = dataInput.value.split('-');
      const dataFormatada = `${dia}/${mes}/${ano}`;

      adicionarAgendamento({
        nome,
        telefone: telefoneInput.value,
        barbeiroId,
        barbeiroNome: barbeiro ? barbeiro.nome : barbeiroId,
        servicos: servicosIds,
        servicosNomes,
        valorTotal,
        data: dataInput.value,
        dataFormatada,
        hora,
        observacoes,
        deviceId: obterDeviceId()
      });

      let mensagem = `Olá! Me chamo ${nome}. Meu agendamento com `
        + `${barbeiro ? barbeiro.nome : barbeiroId} está confirmado para o dia `
        + `${dataFormatada} às ${hora}. `
        + `Serviços: ${servicosNomes.join(', ')}. `
        + `Valor total: ${formatarMoeda(valorTotal)}.`;

      if (observacoes) mensagem += ` Observações: ${observacoes}.`;
      mensagem += ` Meu telefone: ${telefoneInput.value}.`;

      window.open(
        `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`,
        '_blank',
        'noopener,noreferrer'
      );

      formNote.classList.remove('form-note-error');
      formNote.textContent = 'Agendamento confirmado! Redirecionando para o WhatsApp...';

      bookingForm.reset();
      resetHoraChips('Escolha o barbeiro e a data primeiro');
      calcularPrecoTotal();
    });
  }

  const anoEl = document.getElementById('ano');
  if (anoEl) anoEl.textContent = new Date().getFullYear();
});