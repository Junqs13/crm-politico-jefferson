import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DadosLideranca {
  name: string;
  role: string;
  party?: string | null;
  phone?: string | null;
  alignment: string;
  notes?: string | null;
  municipalityId: string;
}

const ALINHAMENTOS = ['ALTO', 'MEDIO', 'EM CONQUISTA'];

const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : undefined);

// Aceita só os campos conhecidos, para o corpo da requisição não gravar nada além disso
export function limparDados(body: any, parcial = false): Partial<DadosLideranca> {
  const dados: Partial<DadosLideranca> = {};
  const nome = texto(body?.name);
  const cargo = texto(body?.role);
  const alinhamento = texto(body?.alignment);
  const municipio = texto(body?.municipalityId);

  if (nome !== undefined) dados.name = nome;
  if (cargo !== undefined) dados.role = cargo;
  if (alinhamento !== undefined) dados.alignment = alinhamento;
  if (municipio !== undefined && !parcial) dados.municipalityId = municipio;
  if (body && 'party' in body) dados.party = texto(body.party) || null;
  if (body && 'phone' in body) dados.phone = texto(body.phone) || null;
  if (body && 'notes' in body) dados.notes = texto(body.notes) || null;

  return dados;
}

export function validar(dados: Partial<DadosLideranca>, parcial = false): string | null {
  if (!parcial || dados.name !== undefined) {
    if (!dados.name) return 'Informe o nome da liderança.';
  }
  if (!parcial || dados.role !== undefined) {
    if (!dados.role) return 'Informe o cargo.';
  }
  if (!parcial || dados.alignment !== undefined) {
    if (!dados.alignment || !ALINHAMENTOS.includes(dados.alignment)) return 'Alinhamento inválido.';
  }
  if (!parcial && !dados.municipalityId) return 'Município não informado.';
  return null;
}

export class LeadershipsService {
  async listarPorMunicipio(municipalityId: string) {
    return await prisma.leadership.findMany({
      where: { municipalityId },
      orderBy: { name: 'asc' }
    });
  }

  async criar(data: DadosLideranca) {
    return await prisma.leadership.create({
      data
    });
  }

  async atualizar(id: string, data: Partial<DadosLideranca>) {
    return await prisma.leadership.update({
      where: { id },
      data
    });
  }

  async remover(id: string) {
    return await prisma.leadership.delete({
      where: { id }
    });
  }
}
