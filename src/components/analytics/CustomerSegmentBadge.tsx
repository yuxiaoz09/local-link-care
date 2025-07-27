import { Badge } from "@/components/ui/badge";

interface CustomerSegmentBadgeProps {
  segment: string;
}

export const CustomerSegmentBadge = ({ segment }: CustomerSegmentBadgeProps) => {
  const getSegmentVariant = (segment: string) => {
    switch (segment.toLowerCase()) {
      case 'champions':
        return 'default';
      case 'loyal':
        return 'secondary';
      case 'at-risk':
        return 'destructive';
      case 'lost':
        return 'outline';
      case 'new':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getSegmentColor = (segment: string) => {
    switch (segment.toLowerCase()) {
      case 'champions':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'loyal':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'at-risk':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'lost':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'new':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Badge 
      variant="outline" 
      className={getSegmentColor(segment)}
    >
      {segment}
    </Badge>
  );
};