import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { reviews, Review, bookings, trips } from '../data';
import { CreateReviewDto } from './dto';
import { PaginationQueryDto, PaginatedResult } from '../common/dto/pagination-query.dto';
import { paginateCollection } from '../common/utils/pagination.util';

export interface GuideReviewStats {
  guideId: number;
  count: number;
  avg: number;
  starBreakdown: Record<number, number>;
  recommendPercentage: number;
}

@Injectable()
export class ReviewsService {
  findAll(): Review[];
  findAll(query: PaginationQueryDto): Review[] | PaginatedResult<Review>;
  findAll(query?: PaginationQueryDto): any {
    return paginateCollection(reviews, query, ['comment']);
  }

  findOne(id: number): Review {
    const r = reviews.find((r) => r.reviewId === id);
    if (!r) throw new NotFoundException(`Review with ID ${id} not found`);
    return r;
  }

  findByTrip(tripId: number): Review[];
  findByTrip(tripId: number, query: PaginationQueryDto): Review[] | PaginatedResult<Review>;
  findByTrip(tripId: number, query?: PaginationQueryDto): any {
    const tripReviews = reviews.filter((r) => r.tripId === tripId);
    return paginateCollection(tripReviews, query, ['comment']);
  }

  findByGuide(guideId: number): Review[];
  findByGuide(guideId: number, query: PaginationQueryDto): Review[] | PaginatedResult<Review>;
  findByGuide(guideId: number, query?: PaginationQueryDto): any {
    const guideReviews = reviews.filter((r) => r.guideId === guideId);
    return paginateCollection(guideReviews, query, ['comment']);
  }

  /**
   * Reviews Hub Stats computed from genuine records aggregation (never stored/faked).
   * Returns zeros if there are no reviews for this guide.
   */
  getGuideStats(guideId: number): GuideReviewStats {
    const guideReviews = reviews.filter((r) => r.guideId === guideId);
    const count = guideReviews.length;

    const starBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    if (count === 0) {
      return {
        guideId,
        count: 0,
        avg: 0,
        starBreakdown,
        recommendPercentage: 0,
      };
    }

    let sum = 0;
    let recommendCount = 0;

    for (const r of guideReviews) {
      const rating = Math.min(5, Math.max(1, Math.round(r.guideRating || r.tripRating || 5)));
      starBreakdown[rating] = (starBreakdown[rating] || 0) + 1;
      sum += r.guideRating;
      if (r.guideRating >= 4) {
        recommendCount++;
      }
    }

    const avg = Math.round((sum / count) * 10) / 10;
    const recommendPercentage = Math.round((recommendCount / count) * 100);

    return {
      guideId,
      count,
      avg,
      starBreakdown,
      recommendPercentage,
    };
  }

  /**
   * Create a review.
   * Enforces:
   * 1. Reviews are allowed ONLY after a booking is COMPLETED.
   * 2. Exactly once per booking.
   */
  create(dto: CreateReviewDto): Review {
    let targetBookingId = dto.bookingId;
    let targetTripId = dto.tripId;

    // Resolve booking and trip references
    if (targetBookingId) {
      const booking = bookings.find((b) => b.bookingId === targetBookingId);
      if (!booking) {
        throw new NotFoundException(`Booking with ID ${targetBookingId} not found`);
      }
      if (booking.status.toUpperCase() !== 'COMPLETED') {
        throw new BadRequestException('Reviews are only allowed after a booking is COMPLETED.');
      }
      if (!targetTripId && booking.tripId) {
        targetTripId = booking.tripId;
      }
    } else if (targetTripId) {
      // Find booking for this trip if bookingId not directly supplied
      const booking = bookings.find((b) => b.tripId === targetTripId);
      if (booking) {
        targetBookingId = booking.bookingId;
        if (booking.status.toUpperCase() !== 'COMPLETED') {
          throw new BadRequestException('Reviews are only allowed after a booking is COMPLETED.');
        }
      } else {
        // If no booking in memory, check trip status
        const trip = trips.find((t) => t.tripId === targetTripId);
        if (trip && trip.status !== 'Completed') {
          throw new BadRequestException('Reviews are only allowed after a booking is COMPLETED.');
        }
      }
    } else {
      throw new BadRequestException('Either bookingId or tripId must be provided.');
    }

    // Enforce once per booking constraint
    if (targetBookingId) {
      const existing = reviews.find((r) => r.bookingId === targetBookingId);
      if (existing) {
        throw new ConflictException('A review has already been submitted for this booking.');
      }
    } else if (targetTripId) {
      const existing = reviews.find(
        (r) => r.tripId === targetTripId && r.travelerId === dto.travelerId,
      );
      if (existing) {
        throw new ConflictException('A review has already been submitted for this booking.');
      }
    }

    // The reviewed guide is whoever was assigned to (and accepted) the trip, never
    // a guide id chosen by the client.
    const reviewedTrip = targetTripId ? trips.find((t) => t.tripId === targetTripId) : undefined;
    const reviewedGuideId =
      reviewedTrip?.guideId && reviewedTrip.guideStatus === 'Accepted' ? reviewedTrip.guideId : undefined;
    if (dto.guideId && reviewedTrip && dto.guideId !== reviewedGuideId) {
      throw new BadRequestException('You can only rate the guide who accompanied this trip.');
    }

    const maxId = reviews.length > 0 ? Math.max(...reviews.map((r) => r.reviewId)) : 0;
    const item: Review = {
      reviewId: maxId + 1,
      tripId: targetTripId || 0,
      bookingId: targetBookingId,
      travelerId: dto.travelerId,
      guideId: reviewedGuideId ?? (reviewedTrip ? undefined : dto.guideId),
      tripRating: dto.tripRating,
      guideRating: dto.guideRating,
      comment: dto.comment,
      createdAt: dto.createdAt || new Date().toISOString().slice(0, 10),
    };
    reviews.push(item);
    return item;
  }

  /**
   * Guide response to a review
   */
  respondToReview(reviewId: number, guideId: number, responseText: string): Review {
    const review = this.findOne(reviewId);
    if (review.guideId !== guideId) {
      throw new ForbiddenException('You can only respond to reviews submitted for your services.');
    }
    review.guideResponse = responseText;
    review.guideResponseAt = new Date().toISOString();
    return review;
  }

  remove(id: number): { message: string } {
    const idx = reviews.findIndex((r) => r.reviewId === id);
    if (idx === -1) throw new NotFoundException(`Review with ID ${id} not found`);
    reviews.splice(idx, 1);
    return { message: `Review with ID ${id} deleted successfully` };
  }
}
