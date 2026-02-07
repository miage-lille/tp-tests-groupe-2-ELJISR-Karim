import { ChangeSeats } from './change-seats';
import { InMemoryWebinarRepository } from '../adapters/webinar-repository.in-memory';
import { Webinar } from '../entities/webinar.entity';
import { testUser } from 'src/users/tests/user-seeds';
import { WebinarNotFoundException } from 'src/webinars/exceptions/webinar-not-found';
import { WebinarNotOrganizerException } from 'src/webinars/exceptions/webinar-not-organizer';
import { WebinarReduceSeatsException } from 'src/webinars/exceptions/webinar-reduce-seats';
import { WebinarTooManySeatsException } from 'src/webinars/exceptions/webinar-too-many-seats';

describe('Feature : Change seats', () => {
  let webinarRepository: InMemoryWebinarRepository;
  let useCase: ChangeSeats;

  const webinar = new Webinar({
    id: 'webinar-id',
    organizerId: testUser.alice.props.id,
    title: 'Webinar title',
    startDate: new Date('2024-01-01T00:00:00Z'),
    endDate: new Date('2024-01-01T01:00:00Z'),
    seats: 100,
  });

  beforeEach(() => {
    webinarRepository = new InMemoryWebinarRepository([webinar]);
    useCase = new ChangeSeats(webinarRepository);
  });

  async function whenUserChangeSeatsWith(payload: any) {
    await useCase.execute(payload);
  }

  async function thenUpdatedWebinarSeatsShouldBe(seats: number) {
    const updatedWebinar = await webinarRepository.findById('webinar-id');
    expect(updatedWebinar?.props.seats).toEqual(seats);
  }

  function expectWebinarToRemainUnchanged() {
    const webinar = webinarRepository.findByIdSync('webinar-id');
    expect(webinar?.props.seats).toEqual(100);
  }

  describe('Scenario: Happy path', () => {
    it('should change the number of seats for a webinar', async () => {
      const payload = {
        user: testUser.alice,
        webinarId: 'webinar-id',
        seats: 200,
      };

      await whenUserChangeSeatsWith(payload);
      await thenUpdatedWebinarSeatsShouldBe(200);
    });
  });

  describe('Scenario: webinar does not exist', () => {
    it('should fail', async () => {
      const payload = {
        user: testUser.alice,
        webinarId: 'unknown-webinar-id',
        seats: 200,
      };
      await expect(whenUserChangeSeatsWith(payload)).rejects.toThrow(
        WebinarNotFoundException,
      );
      expectWebinarToRemainUnchanged();
    });
  });

  describe('Scenario: update the webinar of someone else', () => {
    it('should fail', async () => {
      const payload = {
        user: testUser.bob,
        webinarId: 'webinar-id',
        seats: 200,
      };
      await expect(whenUserChangeSeatsWith(payload)).rejects.toThrow(
        WebinarNotOrganizerException,
      );
      expectWebinarToRemainUnchanged();
    });
  });

  describe('Scenario: change seat to an inferior number', () => {
    it('should fail', async () => {
      const payload = {
        user: testUser.alice,
        webinarId: 'webinar-id',
        seats: 50,
      };
      await expect(whenUserChangeSeatsWith(payload)).rejects.toThrow(
        WebinarReduceSeatsException,
      );
      expectWebinarToRemainUnchanged();
    });
  });

  describe('Scenario: change seat to a number > 1000', () => {
    it('should fail', async () => {
      const payload = {
        user: testUser.alice,
        webinarId: 'webinar-id',
        seats: 1001,
      };
      await expect(whenUserChangeSeatsWith(payload)).rejects.toThrow(
        WebinarTooManySeatsException,
      );
      expectWebinarToRemainUnchanged();
    });
  });
});