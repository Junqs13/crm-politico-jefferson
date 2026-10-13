import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class LeadershipsService {
  async listarPorMunicipio(municipalityId: string) {
    return await prisma.leadership.findMany({
      where: { municipalityId },
      orderBy: { name: 'asc' }
    });
  }

  async criar(data: { name: string; role: string; party?: string; phone?: string; alignment: string; notes?: string; municipalityId: string }) {
    return await prisma.leadership.create({
      data
    });
  }

  async remover(id: string) {
    return await prisma.leadership.delete({
      where: { id }
    });
  }
}