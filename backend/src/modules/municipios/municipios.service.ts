import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const prisma = new PrismaClient();

// Crescimento sobre os votos de 2026 usado para a meta da eleição de 2030
const CRESCIMENTO_META_2030 = 0.2;

export class MunicipiosService {
  async obterMapaDobradas(ano: number) {
    const eleitoresPorCidade: Record<string, number> = {};
    const zonasPorCidade: Record<string, { zona: string; quantidade: string }[]> = {};

    try {
      // Tenta localizar o CSV em diferentes diretórios possíveis no ambiente local ou Render
      const possiveisCaminhos = [
        path.resolve(process.cwd(), 'quantidade_de_eleitores.csv'),
        path.resolve(process.cwd(), '..', 'quantidade_de_eleitores.csv'),
        path.resolve(process.cwd(), 'src', 'scripts', 'quantidade_de_eleitores.csv'),
      ];

      const csvPath = possiveisCaminhos.find((p) => fs.existsSync(p));

      if (csvPath) {
        const fileContent = fs.readFileSync(csvPath, 'latin1');
        const parsed = Papa.parse(fileContent, { header: true, delimiter: ';' });
        parsed.data.forEach((row: any) => {
          const mun = row['Município']?.trim().toUpperCase();
          const zona = row['Zona']?.trim();
          const qtdStr = row['Quantidade']?.toString().replace(/\./g, '').replace(',', '.');
          const qtd = parseFloat(qtdStr) || 0;

          if (mun) {
            eleitoresPorCidade[mun] = (eleitoresPorCidade[mun] || 0) + qtd;
            if (!zonasPorCidade[mun]) zonasPorCidade[mun] = [];
            if (zona) {
              zonasPorCidade[mun].push({ zona, quantidade: row['Quantidade'] });
            }
          }
        });
      } else {
        console.warn('⚠️ Arquivo quantidade_de_eleitores.csv não encontrado nos caminhos padrão.');
      }
    } catch (e) {
      console.error('Erro ao ler CSV de eleitores:', e);
    }

    // Busca todos os municípios de SP sem depender exclusivamente de o ID ser 35 ou 1
    const municipios = await prisma.municipality.findMany({
      include: {
        results: {
          include: {
            candidate: true,
            election: true,
          },
        },
        amendments: true,
      },
    });

    return municipios.map((mun) => {
      const resultadoAno = mun.results.filter((r) => r.election.year === ano);
      const votosJefferson =
        resultadoAno.find((r) => r.candidate.name.toUpperCase().includes('JEFFERSON CAMPOS'))?.votes || 0;

      const historicoJef: Record<number, number> = {};
      const historicoCandidatos: Record<string, Record<number, number>> = {};

      mun.results.forEach((r) => {
        const candName = r.candidate.name;
        const eleicaoAno = r.election.year;

        if (!historicoCandidatos[candName]) {
          historicoCandidatos[candName] = {};
        }
        historicoCandidatos[candName][eleicaoAno] = r.votes;

        if (candName.toUpperCase().includes('JEFFERSON CAMPOS')) {
          historicoJef[eleicaoAno] = r.votes;
        }
      });

      const emendas = mun.amendments.reduce((acc, curr) => {
        const cat = String(curr.categoryId);
        acc[cat] = (acc[cat] || 0) + Number(curr.amount);
        return acc;
      }, {} as Record<string, number>);

      Object.keys(emendas).forEach((cat) => {
        emendas[cat] = Math.round(emendas[cat] * 100) / 100;
      });

      const totalEmendas =
        Math.round(mun.amendments.reduce((sum, curr) => sum + Number(curr.amount), 0) * 100) / 100;

      const nomeLimpo = mun.name.trim().toUpperCase();
      const totalEleitores = eleitoresPorCidade[nomeLimpo] || 0;
      const penetracaoNum = totalEleitores > 0 ? (votosJefferson / totalEleitores) * 100 : 0;
      const penetracao = penetracaoNum.toFixed(2) + '%';

      const votos2026 = historicoJef[2026] || votosJefferson;
      // Próxima eleição federal: 2030. Meta = votos de 2026 + 20%
      const meta2030 = Math.round(votos2026 * (1 + CRESCIMENTO_META_2030));
      const potencialRestante = Math.max(0, Math.round(totalEleitores * 0.15) - votos2026);

      return {
        id: mun.id,
        municipio: mun.name,
        codigoIbge: mun.ibgeCode,
        votosJefferson,
        historicoJef,
        historicoCandidatos,
        emendas,
        totalEmendas,
        totalDestinacoes: mun.amendments.length,
        eleitorado: {
          totalEleitores,
          penetracao,
          zonas: zonasPorCidade[nomeLimpo] || [],
        },
        projecao2030: {
          metaVotos: meta2030,
          crescimentoMetaPct: Math.round(CRESCIMENTO_META_2030 * 100),
          potencialCrescimento: potencialRestante,
          prioridadeCampanha:
            penetracaoNum < 2 && totalEleitores > 20000
              ? 'ALTA OPORTUNIDADE'
              : penetracaoNum >= 5
              ? 'REDUTO CONSOLIDADO'
              : 'MANUTENÇÃO',
        },
      };
    });
  }
}