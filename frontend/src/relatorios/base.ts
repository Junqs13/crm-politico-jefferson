import jsPDF from 'jspdf';
import { BarlowRegular, BarlowSemiBold, BarlowCondBold, BarlowCondSemi } from './fontes';

/*
  Motor dos relatórios em PDF da API Cidadania 360.
  Tudo é desenhado em vetor (texto selecionável, impressão nítida).
  Todo texto passa por quebra de linha medida na fonte real, então nada é cortado.
*/

export type RGB = readonly [number, number, number];

export const COR = {
  navy: [13, 22, 40],
  navy2: [22, 35, 58],
  amarelo: [245, 197, 24],
  amareloEscuro: [161, 120, 0],
  azul: [37, 99, 235],
  azulClaro: [147, 197, 253],
  texto: [22, 30, 46],
  cinza: [96, 108, 128],
  cinzaClaro: [226, 232, 240],
  linha: [214, 221, 232],
  fundo: [243, 246, 250],
  branco: [255, 255, 255],
  ganho: [13, 148, 136],
  perda: [234, 88, 12],
  vermelho: [185, 28, 28],
} as const satisfies Record<string, RGB>;

export const CORES_SERIE: RGB[] = [
  [37, 99, 235],
  [13, 148, 136],
  [234, 88, 12],
  [124, 58, 237],
  [219, 39, 119],
  [202, 138, 4],
  [71, 85, 105],
];

const PAG = { w: 210, h: 297, m: 14 };
const LARGURA_UTIL = PAG.w - PAG.m * 2;
const TOPO_PAGINA = 22;
const LIMITE_INFERIOR = PAG.h - 16;

/* ---------- formatação ---------- */
export const fmtInt = (v: number) => Math.round(v || 0).toLocaleString('pt-BR');
export const fmtMoeda = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const fmtMoedaCurta = (v: number) => {
  const a = Math.abs(v || 0);
  if (a >= 1e6) return `R$ ${(v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (a >= 1e3) return `R$ ${(v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
  return fmtMoeda(v);
};
export const fmtPct = (v: number, casas = 1, sinal = false) =>
  `${sinal && v > 0 ? '+' : ''}${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
export const fmtCompacto = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1e6) return `${(v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (a >= 1e3) return `${(v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
  return fmtInt(v);
};
export const fmtSinal = (v: number) => `${v > 0 ? '+' : ''}${fmtInt(v)}`;
export const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');
export const nomeArquivo = (t: string) => semAcento(t).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');

type Familia = 'Barlow' | 'BarlowCond';
type Estilo = 'normal' | 'bold';

export interface Cartao {
  rotulo: string;
  valor: string;
  detalhe?: string;
  cor?: RGB;
}

export interface Coluna {
  titulo: string;
  largura: number; // proporção
  alinhar?: 'left' | 'right' | 'center';
}

export class Relatorio {
  pdf: jsPDF;
  y = 0;
  private titulo: string;
  private subtitulo: string;
  private sobretitulo: string;
  private tituloCurto: string;

  constructor(titulo: string, subtitulo: string, sobretitulo: string) {
    this.titulo = titulo;
    this.subtitulo = subtitulo;
    this.sobretitulo = sobretitulo;
    this.tituloCurto = titulo;
    this.pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    this.pdf.addFileToVFS('Barlow-Regular.ttf', BarlowRegular);
    this.pdf.addFont('Barlow-Regular.ttf', 'Barlow', 'normal');
    this.pdf.addFileToVFS('Barlow-SemiBold.ttf', BarlowSemiBold);
    this.pdf.addFont('Barlow-SemiBold.ttf', 'Barlow', 'bold');
    this.pdf.addFileToVFS('BarlowCond-Bold.ttf', BarlowCondBold);
    this.pdf.addFont('BarlowCond-Bold.ttf', 'BarlowCond', 'bold');
    this.pdf.addFileToVFS('BarlowCond-SemiBold.ttf', BarlowCondSemi);
    this.pdf.addFont('BarlowCond-SemiBold.ttf', 'BarlowCond', 'normal');
    this.pdf.setProperties({ title: `${titulo} - ${subtitulo}`, author: 'API Cidadania 360', creator: 'API Cidadania 360' });
    this.capa();
  }

  /* ---------- primitivas ---------- */
  fonte(familia: Familia, estilo: Estilo, tamanho: number, cor: RGB = COR.texto) {
    this.pdf.setFont(familia, estilo);
    this.pdf.setFontSize(tamanho);
    this.pdf.setTextColor(cor[0], cor[1], cor[2]);
  }
  preencher(c: RGB) {
    this.pdf.setFillColor(c[0], c[1], c[2]);
  }
  tracar(c: RGB, espessura = 0.2) {
    this.pdf.setDrawColor(c[0], c[1], c[2]);
    this.pdf.setLineWidth(espessura);
  }
  quebrar(texto: string, largura: number): string[] {
    return this.pdf.splitTextToSize(texto, largura) as string[];
  }
  /* Reduz o tamanho até o texto caber numa linha */
  caber(texto: string, largura: number, tamanho: number, minimo = 7) {
    let t = tamanho;
    this.pdf.setFontSize(t);
    while (t > minimo && this.pdf.getTextWidth(texto) > largura) {
      t -= 0.5;
      this.pdf.setFontSize(t);
    }
    return t;
  }

  /* Anel da marca: 360° com uma abertura e o ponto de chegada */
  private marca(cx: number, cy: number, r: number) {
    const ini = (-40 * Math.PI) / 180;
    const fim = ini - (325 * Math.PI) / 180;
    const passos = 60;
    const pts: [number, number][] = [];
    for (let i = 0; i <= passos; i++) {
      const a = ini + ((fim - ini) * i) / passos;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    this.tracar(COR.amarelo, r * 0.2);
    this.pdf.setLineCap('round');
    for (let i = 1; i < pts.length; i++) this.pdf.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
    this.preencher(COR.amarelo);
    const fimPt = pts[pts.length - 1];
    this.pdf.circle(fimPt[0], fimPt[1], r * 0.18, 'F');
    this.fonte('BarlowCond', 'bold', r * 2.3, COR.branco);
    this.pdf.text('360', cx, cy + r * 0.3, { align: 'center' });
  }

  private capa() {
    const altura = 50;
    this.preencher(COR.navy);
    this.pdf.rect(0, 0, PAG.w, altura, 'F');
    this.preencher(COR.amarelo);
    this.pdf.rect(0, altura, PAG.w, 1.2, 'F');

    this.marca(PAG.m + 6, 14, 5.2);
    this.fonte('BarlowCond', 'normal', 10, COR.branco);
    this.pdf.text('API Cidadania 360', PAG.m + 14, 15.6);

    this.fonte('Barlow', 'normal', 8.5, [180, 192, 210]);
    this.pdf.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, PAG.w - PAG.m, 15.6, { align: 'right' });

    this.fonte('Barlow', 'bold', 9, COR.amarelo);
    this.pdf.text(this.sobretitulo, PAG.m, 29);
    this.fonte('BarlowCond', 'bold', 24, COR.branco);
    const tam = this.caber(this.titulo, LARGURA_UTIL, 24, 14);
    this.pdf.setFontSize(tam);
    this.pdf.text(this.titulo, PAG.m, 38.5);
    this.fonte('Barlow', 'normal', 10, [205, 215, 230]);
    this.pdf.text(this.quebrar(this.subtitulo, LARGURA_UTIL)[0], PAG.m, 45.5);
    this.y = altura + 9;
  }

  private cabecalhoContinuacao() {
    this.preencher(COR.navy);
    this.pdf.rect(0, 0, PAG.w, 12, 'F');
    this.marca(PAG.m + 3, 6, 2.6);
    this.fonte('BarlowCond', 'normal', 9, COR.branco);
    this.pdf.text(`${this.tituloCurto}`, PAG.m + 8, 7.4);
    this.fonte('Barlow', 'normal', 8, [180, 192, 210]);
    this.pdf.text(this.sobretitulo, PAG.w - PAG.m, 7.4, { align: 'right' });
  }

  novaPagina() {
    this.pdf.addPage();
    this.cabecalhoContinuacao();
    this.y = TOPO_PAGINA;
  }

  /* Garante espaço; se não couber, começa nova página */
  garantir(altura: number) {
    if (this.y + altura > LIMITE_INFERIOR) this.novaPagina();
  }

  espaco(mm: number) {
    this.y += mm;
  }

  /* ---------- blocos ---------- */
  secao(titulo: string, descricao?: string) {
    const linhasDesc = descricao ? (this.fonte('Barlow', 'normal', 9), this.quebrar(descricao, LARGURA_UTIL)) : [];
    if (this.y > TOPO_PAGINA + 2) this.y += 5;
    this.garantir(14 + linhasDesc.length * 4 + 20);
    this.preencher(COR.amarelo);
    this.pdf.rect(PAG.m, this.y - 3.6, 1.2, 5, 'F');
    this.fonte('BarlowCond', 'bold', 13.5, COR.texto);
    this.pdf.text(titulo, PAG.m + 3.5, this.y);
    this.y += 5;
    if (linhasDesc.length) {
      this.fonte('Barlow', 'normal', 9, COR.cinza);
      this.pdf.text(linhasDesc, PAG.m, this.y);
      this.y += linhasDesc.length * 4;
    }
    this.y += 2.5;
  }

  paragrafo(texto: string, tamanho = 9.5, cor: RGB = COR.texto) {
    this.fonte('Barlow', 'normal', tamanho, cor);
    const linhas = this.quebrar(texto, LARGURA_UTIL);
    const alt = linhas.length * tamanho * 0.45;
    this.garantir(alt + 2);
    this.pdf.text(linhas, PAG.m, this.y + tamanho * 0.3);
    this.y += alt + 2;
  }

  /* Lista de pontos principais com marcador de cor */
  pontos(itens: { texto: string; cor?: RGB }[]) {
    this.fonte('Barlow', 'normal', 9.5);
    for (const it of itens) {
      const linhas = this.quebrar(it.texto, LARGURA_UTIL - 6);
      const alt = linhas.length * 4.3 + 1.6;
      this.garantir(alt);
      const c = it.cor ?? COR.azul;
      this.preencher(c);
      this.pdf.circle(PAG.m + 1.3, this.y + 1.6, 1, 'F');
      this.fonte('Barlow', 'normal', 9.5, COR.texto);
      this.pdf.text(linhas, PAG.m + 5, this.y + 2.6);
      this.y += alt;
    }
    this.y += 2;
  }

  /* Caixa de aviso, para estados vazios */
  aviso(texto: string, cor: RGB = COR.cinza) {
    this.fonte('Barlow', 'normal', 9.5, COR.texto);
    const linhas = this.quebrar(texto, LARGURA_UTIL - 10);
    const alt = linhas.length * 4.3 + 7;
    this.garantir(alt);
    this.preencher(COR.fundo);
    this.pdf.roundedRect(PAG.m, this.y, LARGURA_UTIL, alt, 2, 2, 'F');
    this.preencher(cor);
    this.pdf.rect(PAG.m, this.y, 1.2, alt, 'F');
    this.pdf.text(linhas, PAG.m + 5, this.y + 5.4);
    this.y += alt + 4;
  }

  cartoes(itens: Cartao[], colunas = 4) {
    const gap = 3;
    const larg = (LARGURA_UTIL - gap * (colunas - 1)) / colunas;
    const linhasPorCartao = itens.map((c) => {
      this.fonte('Barlow', 'normal', 7.5);
      return c.detalhe ? this.quebrar(c.detalhe, larg - 7) : [];
    });
    const rotulosPorCartao = itens.map((c) => {
      this.fonte('Barlow', 'normal', 7.8);
      return this.quebrar(c.rotulo, larg - 7);
    });
    for (let i = 0; i < itens.length; i += colunas) {
      const grupo = itens.slice(i, i + colunas);
      const maxDet = Math.max(0, ...linhasPorCartao.slice(i, i + colunas).map((l) => l.length));
      const maxRot = Math.max(1, ...rotulosPorCartao.slice(i, i + colunas).map((l) => l.length));
      const extraRot = (maxRot - 1) * 3.3;
      const alt = 19 + maxDet * 3.3 + extraRot;
      this.garantir(alt + gap);
      grupo.forEach((c, j) => {
        const x = PAG.m + j * (larg + gap);
        this.preencher(COR.fundo);
        this.pdf.roundedRect(x, this.y, larg, alt, 2, 2, 'F');
        this.preencher(c.cor ?? COR.azul);
        this.pdf.rect(x, this.y + 3, 0.9, 7, 'F');
        this.fonte('Barlow', 'normal', 7.8, COR.cinza);
        this.pdf.text(rotulosPorCartao[i + j], x + 3.5, this.y + 5.6);
        this.fonte('BarlowCond', 'bold', 15, c.cor ?? COR.texto);
        const t = this.caber(c.valor, larg - 7, 15, 8.5);
        this.pdf.setFontSize(t);
        this.pdf.text(c.valor, x + 3.5, this.y + 13 + extraRot);
        if (c.detalhe) {
          this.fonte('Barlow', 'normal', 7.5, COR.cinza);
          this.pdf.text(linhasPorCartao[i + j], x + 3.5, this.y + 17.6 + extraRot);
        }
      });
      this.y += alt + gap;
    }
    this.y += 2;
  }

  /* Barras verticais com rótulo de valor em cima de cada barra */
  barrasVerticais(rotulos: string[], valores: number[], opcoes: { altura?: number; destaque?: number; cor?: RGB; formatar?: (v: number) => string } = {}) {
    const altura = opcoes.altura ?? 52;
    const formatar = opcoes.formatar ?? fmtInt;
    this.garantir(altura + 12);
    const x0 = PAG.m + 12;
    const largura = LARGURA_UTIL - 12;
    const base = this.y + altura;
    const max = Math.max(1, ...valores);
    // passo da grade arredondado (1, 2, 2,5 ou 5 vezes uma potência de 10)
    const bruto = (max * 1.12) / 4;
    const pot = Math.pow(10, Math.floor(Math.log10(bruto)));
    const passoGrade = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((v) => v >= bruto) ?? 10 * pot;
    const teto = passoGrade * 4;

    // linhas de grade
    for (let g = 0; g <= 4; g++) {
      const v = passoGrade * g;
      const yy = base - (v / teto) * (altura - 6);
      this.tracar(g === 0 ? COR.cinza : COR.cinzaClaro, g === 0 ? 0.3 : 0.15);
      this.pdf.line(x0, yy, x0 + largura, yy);
      this.fonte('Barlow', 'normal', 6.8, COR.cinza);
      this.pdf.text(fmtCompacto(v), x0 - 1.5, yy + 1, { align: 'right' });
    }

    const n = valores.length;
    const slot = largura / n;
    const larg = Math.min(16, slot * 0.62);
    valores.forEach((v, i) => {
      const h = (v / teto) * (altura - 6);
      const x = x0 + slot * i + (slot - larg) / 2;
      const destacada = opcoes.destaque === i;
      this.preencher(destacada ? COR.amarelo : opcoes.cor ?? COR.azul);
      if (h > 0) this.pdf.rect(x, base - h, larg, h, 'F');
      this.fonte('BarlowCond', 'bold', 8, destacada ? COR.amareloEscuro : COR.texto);
      this.pdf.text(v ? formatar(v) : '0', x + larg / 2, base - h - 1.5, { align: 'center' });
      this.fonte('Barlow', destacada ? 'bold' : 'normal', 8, COR.cinza);
      this.pdf.text(rotulos[i], x + larg / 2, base + 4.5, { align: 'center' });
    });
    this.y = base + 10;
  }

  /* Barras horizontais com rótulo à esquerda e valor à direita */
  barrasHorizontais(itens: { rotulo: string; valor: number; texto: string; cor?: RGB }[], opcoes: { largRotulo?: number; largValor?: number; cor?: RGB } = {}) {
    const largRotulo = opcoes.largRotulo ?? 52;
    const largValor = opcoes.largValor ?? 40;
    const largBarra = LARGURA_UTIL - largRotulo - largValor - 4;
    const max = Math.max(1, ...itens.map((i) => i.valor));
    for (const it of itens) {
      this.fonte('Barlow', 'normal', 8.8);
      const linhas = this.quebrar(it.rotulo, largRotulo - 2);
      const alt = Math.max(7, linhas.length * 3.8 + 3);
      this.garantir(alt);
      this.fonte('Barlow', 'normal', 8.8, COR.texto);
      this.pdf.text(linhas, PAG.m, this.y + 4.4 - (linhas.length - 1) * 1.6);
      const xb = PAG.m + largRotulo;
      this.preencher(COR.cinzaClaro);
      this.pdf.roundedRect(xb, this.y + 2, largBarra, 3.4, 1.2, 1.2, 'F');
      this.preencher(it.cor ?? opcoes.cor ?? COR.azul);
      const w = Math.max(1.2, (it.valor / max) * largBarra);
      this.pdf.roundedRect(xb, this.y + 2, w, 3.4, 1.2, 1.2, 'F');
      this.fonte('BarlowCond', 'bold', 9, COR.texto);
      this.pdf.text(it.texto, PAG.w - PAG.m, this.y + 4.8, { align: 'right' });
      this.y += alt;
    }
    this.y += 3;
  }

  /* Barra única dividida em partes, com legenda */
  barraEmpilhada(partes: { rotulo: string; valor: number; cor: RGB }[]) {
    const total = partes.reduce((a, p) => a + p.valor, 0) || 1;
    this.garantir(20);
    let x = PAG.m;
    partes.forEach((p) => {
      const w = (p.valor / total) * LARGURA_UTIL;
      if (w <= 0) return;
      this.preencher(p.cor);
      this.pdf.rect(x, this.y, w, 6, 'F');
      x += w;
    });
    this.y += 10;
    let lx = PAG.m;
    partes.forEach((p) => {
      const texto = `${p.rotulo}: ${fmtInt(p.valor)} (${fmtPct((p.valor / total) * 100, 0)})`;
      this.fonte('Barlow', 'normal', 8.5, COR.texto);
      const w = this.pdf.getTextWidth(texto) + 9;
      if (lx + w > PAG.w - PAG.m) {
        lx = PAG.m;
        this.y += 5;
      }
      this.preencher(p.cor);
      this.pdf.rect(lx, this.y - 2.6, 3, 3, 'F');
      this.pdf.text(texto, lx + 4.5, this.y);
      lx += w;
    });
    this.y += 7;
  }

  /* Tabela com quebra de linha nas células e cabeçalho repetido em cada página */
  tabela(colunas: Coluna[], linhas: string[][], opcoes: { destacar?: (i: number) => boolean; corColuna?: (lin: number, col: number) => RGB | undefined; tamanho?: number } = {}) {
    const tamanho = opcoes.tamanho ?? 8.3;
    const soma = colunas.reduce((a, c) => a + c.largura, 0);
    const larguras = colunas.map((c) => (c.largura / soma) * LARGURA_UTIL);
    const pad = 1.8;
    const alturaLinha = tamanho * 0.42;

    const desenharCabecalho = () => {
      this.fonte('Barlow', 'bold', tamanho - 0.5, COR.branco);
      const cab = colunas.map((c, i) => this.quebrar(c.titulo, larguras[i] - pad * 2));
      const alt = Math.max(...cab.map((l) => l.length)) * alturaLinha + pad * 2 + 0.6;
      this.preencher(COR.navy2);
      this.pdf.rect(PAG.m, this.y, LARGURA_UTIL, alt, 'F');
      let x = PAG.m;
      cab.forEach((l, i) => {
        const al = colunas[i].alinhar ?? 'left';
        const tx = al === 'right' ? x + larguras[i] - pad : al === 'center' ? x + larguras[i] / 2 : x + pad;
        this.pdf.text(l, tx, this.y + pad + alturaLinha * 0.85, { align: al });
        x += larguras[i];
      });
      this.y += alt;
    };

    // Não deixa o cabeçalho sozinho no pé da página: precisa caber com a primeira linha
    this.fonte('Barlow', 'normal', tamanho);
    const primeira = linhas[0] ? Math.max(...linhas[0].map((v, i) => this.quebrar(v ?? '', larguras[i] - pad * 2).length)) : 1;
    this.garantir(12 + primeira * alturaLinha + pad * 2);
    desenharCabecalho();

    linhas.forEach((linha, li) => {
      this.fonte('Barlow', 'normal', tamanho);
      const celulas = linha.map((v, i) => this.quebrar(v ?? '', larguras[i] - pad * 2));
      const alt = Math.max(...celulas.map((l) => l.length)) * alturaLinha + pad * 2;
      if (this.y + alt > LIMITE_INFERIOR) {
        this.novaPagina();
        desenharCabecalho();
      }
      const destaque = opcoes.destacar?.(li);
      if (destaque) {
        this.preencher([254, 243, 199]);
        this.pdf.rect(PAG.m, this.y, LARGURA_UTIL, alt, 'F');
      } else if (li % 2 === 1) {
        this.preencher(COR.fundo);
        this.pdf.rect(PAG.m, this.y, LARGURA_UTIL, alt, 'F');
      }
      let x = PAG.m;
      celulas.forEach((l, i) => {
        const al = colunas[i].alinhar ?? 'left';
        const cor = opcoes.corColuna?.(li, i) ?? COR.texto;
        this.fonte('Barlow', i === 0 || destaque ? 'bold' : 'normal', tamanho, cor);
        const tx = al === 'right' ? x + larguras[i] - pad : al === 'center' ? x + larguras[i] / 2 : x + pad;
        this.pdf.text(l, tx, this.y + pad + alturaLinha * 0.85, { align: al });
        x += larguras[i];
      });
      this.tracar(COR.linha, 0.1);
      this.pdf.line(PAG.m, this.y + alt, PAG.m + LARGURA_UTIL, this.y + alt);
      this.y += alt;
    });
    this.y += 6;
  }

  nota(texto: string) {
    this.fonte('Barlow', 'normal', 7.8, COR.cinza);
    const linhas = this.quebrar(texto, LARGURA_UTIL);
    this.garantir(linhas.length * 3.4 + 2);
    this.pdf.text(linhas, PAG.m, this.y);
    this.y += linhas.length * 3.4 + 3;
  }

  /* Rodapé com número de página em todas as páginas, e salva */
  salvar(arquivo: string) {
    const total = this.pdf.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      this.pdf.setPage(i);
      this.tracar(COR.linha, 0.2);
      this.pdf.line(PAG.m, PAG.h - 11, PAG.w - PAG.m, PAG.h - 11);
      this.fonte('Barlow', 'normal', 7.5, COR.cinza);
      this.pdf.text(`API Cidadania 360  |  ${this.tituloCurto}  |  Gabinete do Deputado Federal Jefferson Campos`, PAG.m, PAG.h - 7);
      this.pdf.text(`Página ${i} de ${total}`, PAG.w - PAG.m, PAG.h - 7, { align: 'right' });
    }
    this.pdf.save(arquivo);
  }
}
