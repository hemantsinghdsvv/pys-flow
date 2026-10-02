import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  image,
  className,
}: {
  name: string;
  image?: string | null;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Avatar className={cn("size-8", className)}>
      {image && <AvatarImage src={image} alt={name} />}
      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
    </Avatar>
  );
}
