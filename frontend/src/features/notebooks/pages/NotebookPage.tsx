import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

import { SourcesSidebar } from "../components/SourcesSidebar";
import { ChatArea } from "../components/ChatArea";
import { StudioSidebar } from "../components/StudioSidebar";
import type { Notebook } from "../types/notebooks.types";
import { notebooksApi } from "../api/notebooksApi";
import { Header } from "../../home/components/Header";

export function NotebookPage() {
  const { notebookId } = useParams();
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  
  // Simple fetch for title (could be a hook)
  useEffect(() => {
    if (notebookId) {
        notebooksApi.get(notebookId).then(setNotebook).catch(console.error);
    }
  }, [notebookId]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <Header 
        title={notebook?.title} 
        className="flex-none"
      />

      {/* Main Layout */}
      <main className="flex flex-1 overflow-hidden">
        <SourcesSidebar />
        <div className="flex-1 min-w-0">
           <ChatArea />
        </div>
        <StudioSidebar />
      </main>
    </div>
  );
}
