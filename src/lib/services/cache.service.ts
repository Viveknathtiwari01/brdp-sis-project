import { Course, Session } from '@prisma/client';
import prisma from '@/lib/prisma/client';

// Simple in-memory cache for frequently accessed data
class CacheService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.TTL;
  }

  private set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  public get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached || this.isExpired(cached.timestamp)) {
      this.cache.delete(key);
      return null;
    }
    return cached.data;
  }

  // Course caching
  async getCourses(): Promise<Course[]> {
    const cacheKey = 'courses';
    const cached = this.get(cacheKey);
    if (cached) return cached;

    const courses = await prisma.course.findMany({
      where: { isDeleted: false },
      orderBy: { name: 'asc' },
    });

    this.set(cacheKey, courses);
    return courses;
  }

  // Session caching
  async getSessions(): Promise<Session[]> {
    const cacheKey = 'sessions';
    const cached = this.get(cacheKey);
    if (cached) return cached;

    const sessions = await prisma.session.findMany({
      where: { isDeleted: false },
      orderBy: { startDate: 'desc' },
    });

    this.set(cacheKey, sessions);
    return sessions;
  }

  // Cache invalidation
  invalidateCourses(): void {
    this.cache.delete('courses');
  }

  invalidateSessions(): void {
    this.cache.delete('sessions');
  }

  clear(): void {
    this.cache.clear();
  }
}

export const cacheService = new CacheService();
