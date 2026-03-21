import { browser } from "$app/environment";

export type DailyRating = "good" | "neutral" | "bad";

export interface DailyReview {
    date: string; // Formato esperado "YYYY-MM-DD"
    rating: DailyRating;
    notes: string;
}

class DailyReviewsStore {
    reviews = $state<DailyReview[]>([]);

    constructor() {
        if (browser) {
            this.loadReviews();
        }
    }

    loadReviews() {
        if (!browser) return;
        try {
            const data = localStorage.getItem("traderlogpro_daily_reviews");
            if (data) {
                this.reviews = JSON.parse(data);
            }
        } catch (e) {
            console.error("[DailyReviewsStore] Failed to load daily reviews:", e);
        }
    }

    saveReviews() {
        if (!browser) return;
        try {
            localStorage.setItem("traderlogpro_daily_reviews", JSON.stringify(this.reviews));
        } catch (e) {
            console.error("[DailyReviewsStore] Failed to save daily reviews:", e);
        }
    }

    getReviewForDate(dateStr: string): DailyReview | undefined {
        // Assume dateStr is 'YYYY-MM-DD'
        return this.reviews.find(r => r.date === dateStr);
    }

    saveReview(date: string, rating: DailyRating, notes: string) {
        const existingIndex = this.reviews.findIndex(r => r.date === date);
        if (existingIndex >= 0) {
            this.reviews[existingIndex] = { date, rating, notes };
        } else {
            this.reviews.push({ date, rating, notes });
        }
        this.saveReviews();
    }
}

export const dailyReviewsStore = new DailyReviewsStore();
