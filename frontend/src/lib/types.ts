// Типы ответов TurMax API (соответствуют DTO backend).

export type Photo = { url: string; alt: string; author?: string | null; license?: string | null; sourceUrl?: string | null };
export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };
export type Region = { id: number; name: string; slug: string; center?: string | null };
export type Category = {
  id: number; name: string; slug: string; tagline: string; description: string;
  imageUrl?: string | null; imageCredit?: string | null; toursCount: number; destinationsCount: number;
};

export type PoiKind = "City" | "Lake" | "Gorge" | "Pass" | "Peak" | "Monument" | "Museum" | "Nature" | "YurtCamp" | "HotSpring" | "Waterfall";
export type RoadType = "Asphalt" | "Gravel" | "Dirt";
export type Difficulty = "Easy" | "Moderate" | "Hard" | "Expert";
export type TourStatus = "Draft" | "Pending" | "Published" | "Rejected" | "Hidden";
export type VehicleType = "Sedan" | "Minivan" | "Bus";
export type BookingStatus = "New" | "InReview" | "PriceChanged" | "Confirmed" | "Rejected" | "Cancelled" | "Completed";
export type OperatorKind = "TourOperator" | "Guide" | "GuestHouse" | "Cbt";
export type Verification = "Pending" | "Verified" | "Blocked";
export type ServiceType = "Transport" | "Lodging" | "Meals" | "Guide";
export type Role = "Tourist" | "Operator" | "Admin";

export type DestinationCard = {
  id: string; slug: string; name: string; tagline: string; summary: string; region: string;
  latitude: number; longitude: number; cover?: Photo | null; categories: string[];
};
export type PoiCard = {
  id: string; slug: string; name: string; kind: PoiKind; summary: string; region: string;
  latitude: number; longitude: number; altitudeM?: number | null; cover?: Photo | null; destinationSlug?: string | null;
};
export type TourCard = {
  id: string; slug: string; title: string; summary: string; region: string; category: string; categorySlug: string;
  days: number; difficulty: Difficulty; seasonFromMonth: number; seasonToMonth: number; priceFrom: number;
  rating: number; reviewsCount: number; operatorName: string; cover?: Photo | null; maxAltitudeM?: number | null;
  distanceKm?: number | null; guideLanguages: string; keyLatitude?: number | null; keyLongitude?: number | null;
};
export type ArticleCard = { id: string; slug: string; title: string; lead: string; topic: string; readingMinutes: number; publishedAt: string; cover?: Photo | null };

export type Destination = {
  id: string; slug: string; name: string; tagline: string; summary: string; description: string; region: Region;
  latitude: number; longitude: number; bestTime?: string | null; highlights: string[]; categories: Category[];
  photos: Photo[]; attractions: PoiCard[]; nearby: PoiCard[]; tours: TourCard[]; articles: ArticleCard[];
};
export type Poi = {
  id: string; slug: string; name: string; kind: PoiKind; summary: string; description: string; region: Region;
  latitude: number; longitude: number; altitudeM?: number | null; roadType: RoadType; entryFee?: number | null;
  lodgingPrice?: number | null; needsPermit: boolean; season?: string | null; photos: Photo[];
  destination?: DestinationCard | null; nearby: PoiCard[]; tours: TourCard[];
};
export type MapPoint = { id: string; slug: string; name: string; type: "destination" | "poi"; kind?: PoiKind | null; summary: string; latitude: number; longitude: number; imageUrl?: string | null; url: string };

export type TourPoint = { poiId: string; poiSlug: string; name: string; kind: PoiKind; day: number; order: number; note?: string | null; latitude: number; longitude: number; altitudeM?: number | null };
export type Departure = { id: string; startDate: string; price: number; seatsTotal: number; seatsAvailable: number };
export type OperatorPublic = { id: string; name: string; slug: string; kind: OperatorKind; description: string; rating: number; reviewsCount: number; verified: boolean; isDemo: boolean };
export type Review = { id: string; author: string; rating: number; text: string; operatorReply?: string | null; createdAt: string; tourTitle?: string | null };
export type Tour = {
  id: string; slug: string; title: string; summary: string; description: string; region: Region; category: Category;
  days: number; difficulty: Difficulty; seasonFromMonth: number; seasonToMonth: number; maxAltitudeM?: number | null;
  distanceKm?: number | null; priceFrom: number; guideLanguages: string[]; recommendations: string[]; includes: string[];
  needsPermit: boolean; rating: number; reviewsCount: number; photos: Photo[]; points: TourPoint[]; departures: Departure[];
  operator: OperatorPublic; reviews: Review[]; status: TourStatus;
};

export type Article = {
  id: string; slug: string; title: string; lead: string; body: string; topic: string; authorName: string; readingMinutes: number;
  publishedAt: string; photos: Photo[]; destination?: DestinationCard | null; related: ArticleCard[];
};
export type SearchResult = { destinations: DestinationCard[]; attractions: PoiCard[]; tours: TourCard[]; articles: ArticleCard[] };

export type User = { id: string; email: string; fullName: string; phone?: string | null; role: Role; operatorId?: string | null; operatorName?: string | null; operatorStatus?: Verification | null };
export type AuthResponse = { accessToken: string; expiresAt: string; user: User };

export type RoutePoint = { id: string; poiId: string; poiSlug: string; name: string; kind: PoiKind; day: number; order: number; nights: number; latitude: number; longitude: number; roadType: RoadType; entryFee?: number | null; lodgingPrice?: number | null; needsPermit: boolean };
export type UserRoute = { id: string; title: string; participants: number; startDate?: string | null; vehicleType: VehicleType; withGuide: boolean; operatorId?: string | null; operatorName?: string | null; updatedAt: string; points: RoutePoint[] };
export type RouteSummary = { id: string; title: string; participants: number; days: number; pointsCount: number; updatedAt: string; cover?: string | null };
export type Estimate = {
  routeId: string; operatorId: string; operatorName: string; participants: number; days: number; distanceKm: number; weightedDistanceKm: number;
  vehicles: number; drivingHoursByDay: number[]; items: { transport: number; lodging: number; meals: number; guide: number; fees: number };
  subtotal: number; seasonFactor: number; operatorMargin: number; total: number; perPerson: number; currency: string; approximate: boolean;
  warnings: string[]; geometry: [number, number][];
};
export type Provider = { id: string; name: string; slug: string; kind: OperatorKind; rating: number; margin: number; isDemo: boolean; vehicles: VehicleType[]; hasGuide: boolean };

export type BookingHistory = { fromStatus?: BookingStatus | null; toStatus: BookingStatus; by?: string | null; note?: string | null; createdAt: string };
export type Booking = {
  id: string; status: BookingStatus; title: string; tourSlug?: string | null; routeId?: string | null; departureId?: string | null;
  participants: number; startDate: string; endDate: string; priceCalc: number; priceFinal?: number | null; comment?: string | null;
  operatorNote?: string | null; operatorName: string; touristName?: string | null; touristEmail?: string | null; contactPhone?: string | null;
  createdAt: string; updatedAt: string; canReview: boolean; hasReview: boolean; history: BookingHistory[];
};
export type Favorite = { id: string; tour?: TourCard | null; destination?: DestinationCard | null; createdAt: string };
export type Notification = { id: string; title: string; body: string; link?: string | null; isRead: boolean; createdAt: string };

export type ApiError = { statusCode: number; error: string; message: string; details?: Record<string, string[]> | null };
