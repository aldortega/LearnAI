export const ICON_MOTION_TRIGGER = "group/icon";

export const iconMotion = {
  spinOnHover:
    "transition-transform duration-500 ease-out group-hover/icon:group-enabled/icon:-rotate-180 group-focus-visible/icon:-rotate-180 motion-reduce:transition-none",
  nudgeLeftOnHover:
    "transition-transform duration-200 ease-out group-hover/icon:-translate-x-0.5 group-focus-visible/icon:-translate-x-0.5 motion-reduce:transition-none",
  trashLidOnHover:
    "overflow-visible [&>path:nth-child(n+4)]:origin-[3px_6px] [&>path:nth-child(n+4)]:transition-transform [&>path:nth-child(n+4)]:duration-200 [&>path:nth-child(n+4)]:ease-out group-hover/icon:group-enabled/icon:[&>path:nth-child(n+4)]:-rotate-12 group-hover/icon:group-enabled/icon:[&>path:nth-child(n+4)]:-translate-y-px motion-reduce:[&>path]:transition-none",
  rotateQuarterOnHover:
    "transition-transform duration-200 ease-out group-hover/icon:group-enabled/icon:rotate-90 group-focus-visible/icon:rotate-90 motion-reduce:transition-none",
  floatOnHover:
    "transition-transform duration-200 ease-out group-hover/icon:group-enabled/icon:-translate-y-0.5 motion-reduce:transition-none",
  disclosure: "transition-transform duration-200 ease-out motion-reduce:transition-none",
} as const;
