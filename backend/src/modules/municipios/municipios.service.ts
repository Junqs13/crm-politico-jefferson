import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const prisma = new PrismaClient();

export class MunicipiosService {
  async obterMapaDobradas(ano: number) {
    let eleitoresPorCidade: Record<string, number> = {};
    let zonasPorCidade: Record<string, { zona: string; quantidade: string }[]> = {};

    try {
      const csvPath = path.resolve(process.cwd(), 'quantidade_de_eleitores.csv');
      if (fs.existsSync(csvPath)) {
        const fileContent = fs.readFileSync(csvPath, 'latin1');
        const parsed = Papa.parse(fileContent, { header: true, delimiter: ';' });
        parsed.data.forEach((row: any) => {
          const mun = row['Município']?.trim().toUpperCase();
          const zona = row['Zona']?.trim();
          const qtdStr = row['Quantidade']?.toString().replace('.', '').replace(',', '.');
          const qtd = parseFloat(qtdStr) || 0;

          if (mun) {
            eleitoresPorCidade[mun] = (eleitoresPorCidade[mun] || 0) + qtd;
            if (!zonasPorCidade[mun]) zonasPorCidade[mun] = [];
            if (zona) {
              zonasPorCidade[mun].push({ zona, quantidade: row['Quantidade'] });
            }
          }
        });
      }
    } catch (e) {
      console.error('Erro ao ler CSV de eleitores:', e);
    }

    const municipios = await prisma.municipality.findMany({
      where: { stateId: 35 },
      include: {
        results: {
          include: { 
            candidate: true,
            election: true 
          }
        },
        amendments: true
      }
    });

    return municipios.map(mun => {
      const resultadoAno = mun.results.filter(r => r.election.year === ano);
      const votosJefferson = resultadoAno.find(r => r.candidate.name === 'Jefferson Campos')?.votes || 0;
      
      const historicoJef: Record<number, number> = {};
      const historicoCandidatos: Record<string, Record<number, number>> = {};

      mun.results.forEach(r => {
        const candName = r.candidate.name;
        const eleicaoAno = r.election.year;
        
        if (!historicoCandidatos[candName]) {
          historicoCandidatos[candName] = {};
        }
        historicoCandidatos[candName][eleicaoAno] = r.votes;

        if (candName === 'Jefferson Campos') {
          historicoJef[eleicaoAno] = r.votes;
        }
      });

      const emendas = mun.amendments.reduce((acc, curr) => {
        const cat = curr.categoryId;
        acc[cat] = (acc[cat] || 0) + curr.amount;
        return acc;
      }, {} as Record<string, number>);

      const totalEmendas = mun.amendments.reduce((sum, curr) => sum + curr.amount, 0);

      const nomeLimpo = mun.name.toUpperCase();
      const totalEleitores = eleitoresPorCidade[nomeLimpo] || 0;
      const penetracaoNum = totalEleitores > 0 ? (votosJefferson / totalEleitores) * 100 : 0;
      const penetracao = penetracaoNum.toFixed(2) + '%';

      // Cálculo de Projeção / Meta para 2028 (Baseado em 2026 + crescimento estratégico de 20%)
      const votos2026 = historicoJef[2026] || votosJefferson;
      const meta2028 = Math.round(votos2026 * 1.20); // Meta de crescimento de 20% sobre 2026
      const potencialRestante = Math.max(0, Math.round(totalEleitores * 0.15) - votos2026); // Meta de atingir 15% do eleitorado

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
          zonas: zonasPorCidade[nomeLimpo] || []
        },
        projecao2028: {
          metaVotos: meta2028,
          potencialCrescimento: potencialRestante,
          prioridadeCampanha: penetracaoNum < 2 && totalEleitores > 20000 ? 'ALTA OPORTUNIDADE' : penetracaoNum >= 5 ? 'REDUTO CONSOLIDADO' : 'MANUTENÇÃO'
        }
      };
    });
  }
}