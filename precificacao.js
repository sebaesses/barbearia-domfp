// =========================================================
// BARBEARIA DOM FELIPE — precificacao.js
// =========================================================

function calcularPrecoMinimoDoServico(servicoId) {
  const barbeiros = obterListaBarbeiros();

  if (!barbeiros || barbeiros.length === 0) {
    return null;
  }

  const servicoAtual = obterServicoPorId(servicoId);
  const nomeServico = servicoAtual?.nome?.toLowerCase().trim() || '';

  const precos = [];

  barbeiros.forEach((barbeiro) => {
    if (!barbeiro.precos) return;

    // Procura por correspondência direta de chave ou aproximação por nome
    let valor = null;

    // 1. Tenta chave exata
    if (barbeiro.precos[servicoId] !== undefined) {
      valor = Number(barbeiro.precos[servicoId]);
    } 
    // 2. Tenta encontrar chave semelhante (ex: 'corte' vs 'corte-cabelo')
    else {
      const chaveEncontrada = Object.keys(barbeiro.precos).find(chave => {
        return servicoId.includes(chave) || chave.includes(servicoId) || 
               (nomeServico && chave.toLowerCase().includes(nomeServico.split(' ')[0]));
      });
      if (chaveEncontrada) {
        valor = Number(barbeiro.precos[chaveEncontrada]);
      }
    }

    if (typeof valor === 'number' && Number.isFinite(valor) && valor > 0) {
      precos.push(valor);
    }
  });

  if (precos.length === 0) {
    return servicoAtual ? servicoAtual.preco : null;
  }

  return Math.min(...precos);
}

function atualizarPrecosNaHome() {
  const elementosDePreco = document.querySelectorAll('[data-price-service]');

  elementosDePreco.forEach((elemento) => {
    const servicoId = elemento.dataset.priceService;
    const precoMinimo = calcularPrecoMinimoDoServico(servicoId);

    if (precoMinimo === null) return; 

    elemento.textContent = `A partir de ${formatarMoeda(precoMinimo)}`;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  atualizarPrecosNaHome();
});