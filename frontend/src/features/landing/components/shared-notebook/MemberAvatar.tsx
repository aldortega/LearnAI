type Props = {
  name: string;
};

export function MemberAvatar({ name }: Props) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-medium text-primary">
      {initials}
    </span>
  );
}
