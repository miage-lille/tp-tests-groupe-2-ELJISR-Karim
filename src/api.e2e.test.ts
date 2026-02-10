import supertest from 'supertest';
import { TestServerFixture } from './tests/fixtures';

describe('Webinar Routes E2E', () => {
  let fixture: TestServerFixture;

  beforeAll(async () => {
    fixture = new TestServerFixture();
    await fixture.init();
  }, 60000); // Wait for container

  beforeEach(async () => {
    await fixture.reset();
  });

  afterAll(async () => {
    await fixture.stop();
  });

  describe('POST /webinars', () => {
    it('should organize a new webinar', async () => {

      const server = fixture.getServer();
      const prisma = fixture.getPrismaClient();
      const payload = {
        title: 'E2E Webinar',
        seats: 50,
        startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4).toISOString(),
        endDate: new Date(
          Date.now() + 1000 * 60 * 60 * 24 * 4 + 1000 * 60 * 60,
        ).toISOString(),
      };


      const response = await supertest(server)
        .post('/webinars')
        .send(payload)
        .expect(201);


      expect(response.body).toHaveProperty('id');
      const id = response.body.id;

      const createdWebinar = await prisma.webinar.findUnique({
        where: { id },
      });
      expect(createdWebinar).toBeDefined();
      expect(createdWebinar?.title).toBe(payload.title);
      expect(createdWebinar?.seats).toBe(payload.seats);
    });
  });

  describe('POST /webinars/:id/seats', () => {
    it('should update webinar seats', async () => {

      const prisma = fixture.getPrismaClient();
      const server = fixture.getServer();

      const webinar = await prisma.webinar.create({
        data: {
          id: 'test-webinar',
          title: 'Webinar Test',
          seats: 10,
          startDate: new Date(),
          endDate: new Date(),
          organizerId: 'test-user',
        },
      });


      const response = await supertest(server)
        .post(`/webinars/${webinar.id}/seats`)
        .send({ seats: '30' })
        .expect(200);


      expect(response.body).toEqual({ message: 'Seats updated' });

      const updatedWebinar = await prisma.webinar.findUnique({
        where: { id: webinar.id },
      });
      expect(updatedWebinar?.seats).toBe(30);
    });

    it('should fail if webinar does not exist', async () => {

      const server = fixture.getServer();


      await supertest(server)
        .post(`/webinars/unknown-webinar/seats`)
        .send({ seats: '30' })
        .expect(404);
    });

    it('should fail if user is not the organizer', async () => {

      const prisma = fixture.getPrismaClient();
      const server = fixture.getServer();

      const webinar = await prisma.webinar.create({
        data: {
          id: 'test-webinar-not-organizer',
          title: 'Webinar Test',
          seats: 10,
          startDate: new Date(),
          endDate: new Date(),
          organizerId: 'another-user', // The route hardcodes user id as 'test-user', so this should fail
        },
      });


      await supertest(server)
        .post(`/webinars/${webinar.id}/seats`)
        .send({ seats: '30' })
        .expect(401);
    });
  });
});
