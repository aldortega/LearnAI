import type { QuickstartTopic } from "../types/quickstart.types";
import { QuickstartTopicCard } from "./QuickstartTopicCard";

type Props = {
  topics: QuickstartTopic[];
  notebookId?: string;
  isStale: boolean;
};

export function QuickstartTopicsList({ topics, notebookId, isStale }: Props) {
  return (
    <div className="space-y-4">
      {topics.map((topic) => (
        <QuickstartTopicCard
          key={topic.id}
          topic={topic}
          notebookId={notebookId}
          isStale={isStale}
        />
      ))}
    </div>
  );
}
