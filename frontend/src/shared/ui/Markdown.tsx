import { Streamdown } from "streamdown";

import { markdownPlugins } from "../lib/markdownPlugins";

type Props = Omit<React.ComponentProps<typeof Streamdown>, "plugins">;

export function Markdown(props: Props) {
  return <Streamdown {...props} plugins={markdownPlugins} />;
}
