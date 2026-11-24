namespace TurMax.Api.Entities;

public enum UserRole { Tourist = 0, Operator = 1, Admin = 2 }

public enum OperatorKind { TourOperator = 0, Guide = 1, GuestHouse = 2, Cbt = 3 }

public enum VerificationStatus { Pending = 0, Verified = 1, Blocked = 2 }

public enum PoiKind { City = 0, Lake = 1, Gorge = 2, Pass = 3, Peak = 4, Monument = 5, Museum = 6, Nature = 7, YurtCamp = 8, HotSpring = 9, Waterfall = 10 }

/// <summary>Тип дороги до точки — определяет коэффициент k_i (п. 2.6 диплома).</summary>
public enum RoadType { Asphalt = 0, Gravel = 1, Dirt = 2 }

public enum Difficulty { Easy = 0, Moderate = 1, Hard = 2, Expert = 3 }

public enum TourStatus { Draft = 0, Pending = 1, Published = 2, Rejected = 3, Hidden = 4 }

public enum ServiceType { Transport = 0, Lodging = 1, Meals = 2, Guide = 3 }

public enum VehicleType { Sedan = 0, Minivan = 1, Bus = 2 }

/// <summary>Статусы заявки по диаграмме состояний (рис. 2.7).</summary>
public enum BookingStatus { New = 0, InReview = 1, PriceChanged = 2, Confirmed = 3, Rejected = 4, Cancelled = 5, Completed = 6 }

public enum ReviewStatus { Published = 0, Hidden = 1 }
