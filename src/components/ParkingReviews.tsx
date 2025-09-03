import { Star, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Review {
  id: number;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
  avatar_url?: string;
}

interface ReviewsComponentProps {
  parkingId: number;
}

// Datos de ejemplo para reseñas
const mockReviews: Review[] = [
  {
    id: 1,
    user_name: "María González",
    rating: 5,
    comment: "Excelente parqueadero, muy seguro y bien ubicado. El personal es muy amable.",
    created_at: "2024-12-15T10:30:00Z",
  },
  {
    id: 2,
    user_name: "Carlos Rodríguez",
    rating: 4,
    comment: "Buen servicio, espacios amplios. Solo mejoraría la iluminación nocturna.",
    created_at: "2024-12-10T15:45:00Z",
  },
  {
    id: 3,
    user_name: "Ana Fernández",
    rating: 5,
    comment: "Perfecto para el centro de la ciudad. Fácil acceso y buenos precios.",
    created_at: "2024-12-08T09:20:00Z",
  },
];

export function ParkingReviews({ parkingId }: ReviewsComponentProps) {
  const averageRating = mockReviews.reduce((acc, review) => acc + review.rating, 0) / mockReviews.length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < rating ? "text-yellow-400 fill-current" : "text-gray-300"
        }`}
      />
    ));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400" />
            Reseñas
          </span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {renderStars(Math.round(averageRating))}
            </div>
            <span className="font-bold text-lg">{averageRating.toFixed(1)}</span>
            <span className="text-gray-500 text-sm">({mockReviews.length} reseñas)</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockReviews.map((review) => (
            <div key={review.id} className="border-b border-gray-100 last:border-b-0 pb-4 last:pb-0">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={review.avatar_url} alt={review.user_name} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{review.user_name}</p>
                      <p className="text-xs text-gray-500">{formatDate(review.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {renderStars(review.rating)}
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {review.comment}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
