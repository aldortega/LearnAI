import { createMathPlugin } from "@streamdown/math";

export const markdownPlugins = {
  math: createMathPlugin({ singleDollarTextMath: true }),
};
