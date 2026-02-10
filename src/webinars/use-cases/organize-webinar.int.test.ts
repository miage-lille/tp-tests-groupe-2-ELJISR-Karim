import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { exec } from 'child_process';
import { RealDateGenerator } from 'src/core/adapters/real-date-generator';
import { RealIdGenerator } from 'src/core/adapters/real-id-generator';
import { PrismaWebinarRepository } from 'src/webinars/adapters/webinar-repository.prisma';
import { OrganizeWebinars } from 'src/webinars/use-cases/organize-webinar';
import { promisify } from 'util';
const asyncExec = promisify(exec);

describe('OrganizeWebinars Integration', () => {
  let container: StartedPostgreSqlContainer;
  let prismaClient: PrismaClient;
  let repository: PrismaWebinarRepository;
  let useCase: OrganizeWebinars;

  beforeAll(async () => {
    container = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .withUsername('user_test')
      .withPassword('password_test')
      .withExposedPorts(5432)
      .start();

    const dbUrl = container.getConnectionUri();
    prismaClient = new PrismaClient({
      datasources: {
        db: { url: dbUrl },
      },
    });

    await asyncExec(`set DATABASE_URL=${dbUrl} && npx prisma migrate deploy`);
    return prismaClient.$connect();
  }, 100000);

  beforeEach(async () => {
    repository = new PrismaWebinarRepository(prismaClient);
    useCase = new OrganizeWebinars(
      repository,
      new RealIdGenerator(),
      new RealDateGenerator(),
    );
    await prismaClient.webinar.deleteMany();
    await prismaClient.$executeRawUnsafe('DELETE FROM "Webinar" CASCADE');
  });

  afterAll(async () => {
    if (container) await container.stop({ timeout: 1000 });
    if (prismaClient) await prismaClient.$disconnect();
  });

  it('should organize a webinar and persist it', async () => {
    const payload = {
      userId: 'organizer-id',
      title: 'Integration Webinar',
      seats: 50,
      startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4), // 4 days from now
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4 + 1000 * 60 * 60),
    };

    const { id } = await useCase.execute(payload);

    const persistedWebinar = await prismaClient.webinar.findUnique({
      where: { id },
    });

    expect(persistedWebinar).toBeDefined();
    expect(persistedWebinar?.title).toBe(payload.title);
    expect(persistedWebinar?.seats).toBe(payload.seats);
  });
});
