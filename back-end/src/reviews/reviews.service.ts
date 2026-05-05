import { Injectable, NotFoundException } from '@nestjs/common';
import { reviews, Review } from '../data';
import { CreateReviewDto } from './dto';

@Injectable()
export class ReviewsService {
  findAll(): Review[] { return reviews; }

  findOne(id: number): Review {
    const r = reviews.find((r) => r.reviewId === id);
    if (!r) throw new NotFoundException(`Review with ID ${id} not found`);
    return r;
  }

  findByTrip(tripId: number): Review[] {
    return reviews.filter((r) => r.tripId === tripId);
  }

  create(dto: CreateReviewDto): Review {
    const maxId = reviews.length > 0 ? Math.max(...reviews.map((r) => r.reviewId)) : 0;
    const item: Review = {
      reviewId: maxId + 1,
      tripId: dto.tripId,
      travelerId: dto.travelerId,
      guideId: dto.guideId,
      tripRating: dto.tripRating,
      guideRating: dto.guideRating,
      comment: dto.comment,
      createdAt: dto.createdAt || new Date().toISOString().slice(0, 10),
    };
    reviews.push(item);
    return item;
  }

  remove(id: number): { message: string } {
    const idx = reviews.findIndex((r) => r.reviewId === id);
    if (idx === -1) throw new NotFoundException(`Review with ID ${id} not found`);
    reviews.splice(idx, 1);
    return { message: `Review with ID ${id} deleted successfully` };
  }
}
