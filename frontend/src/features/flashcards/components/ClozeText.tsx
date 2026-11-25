import { Fragment } from "react";

type Props = {
  text: string;
};

export function ClozeText({ text }: Props) {
  const parts = text.split(/_{3,}/);

  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part}
          {index < parts.length - 1 ? (
            <span className="mx-1 inline-block w-20 border-b-2 border-primary align-baseline">
              <span className="sr-only">espacio en blanco</span>
            </span>
          ) : null}
        </Fragment>
      ))}
    </>
  );
}
