import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CustomerSegmentBadgeProps {
  segment: string;
  className?: string;
}

const CustomerSegmentBadge = ({ segment, className }: CustomerSegmentBadgeProps) => {
  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'Champions':
        return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200';
      case 'Loyal':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'At-Risk':
        return 'bg-amber-100 text-amber-800 hover:bg-amber-200';
      case 'Lost':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'New':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      case 'Potential':
        return 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(getSegmentColor(segment), className)}
    >
      {segment}
    </Badge>
  );
};

export default CustomerSegmentBadge;