import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";

import { useNotebook } from "../../notebooks";
import { DeleteDocumentModal } from "../../notebooks/components/DeleteDocumentModal";
import { NotebookShell } from "../../notebooks/components/NotebookShell";
import { MindmapCanvas } from "../components/MindmapCanvas";
import { MindmapDetailPanel } from "../components/MindmapDetailPanel";
import { MindmapEmptyState } from "../components/MindmapEmptyState";
import { MindmapShell } from "../components/MindmapShell";
import { useGenerateMindmap } from "../hooks/useGenerateMindmap";
import { useMindmapNotebookSources } from "../hooks/useMindmapNotebookSources";
import { useMindmapNodeDetail } from "../hooks/useMindmapNodeDetail";
import { useMindmap } from "../hooks/useMindmap";

export function NotebookMindmapPage() {
  const { notebookId } = useParams();
  const navigate = useNavigate();
  const { notebook } = useNotebook(notebookId);
  const canManageDocuments = notebook?.can_manage_documents ?? false;
  const hasCheckedLatestJobRef = useRef(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    () => new Set(),
  );

  const {
    fileInputRef,
    documents,
    hasReadySources,
    readySignature,
    isUploading,
    deletingDocumentIds,
    deleteTarget,
    setDeleteTarget,
    handleFileChange,
    handleDeleteConfirm,
    pickFile,
  } = useMindmapNotebookSources(notebookId);
  const {
    mindmap,
    isLoading: isMindmapLoading,
    error: mindmapError,
    reload: reloadMindmap,
  } = useMindmap(notebookId);
  const {
    generate,
    resumeLatest,
    isGenerating,
    error: generateError,
    clearError: clearGenerateError,
  } = useGenerateMindmap(notebookId);
  const {
    getDetail,
    getCachedDetail,
    isNodeLoading,
    getNodeError,
    clearNodeError,
    clearAll,
  } = useMindmapNodeDetail(notebookId);

  useEffect(() => {
    queueMicrotask(() => {
      setSelectedNodeId(null);
      setIsDetailModalVisible(false);
      setExpandedNodeIds(new Set());
    });
  }, [notebookId]);

  useEffect(() => {
    hasCheckedLatestJobRef.current = false;
  }, [notebookId]);

  useEffect(() => {
    if (!notebookId) return;
    void reloadMindmap();
  }, [notebookId, reloadMindmap, readySignature]);

  useEffect(() => {
    if (!notebookId || hasCheckedLatestJobRef.current) return;
    if (mindmap && mindmap.status !== "missing") return;
    if (isMindmapLoading || isGenerating) return;

    hasCheckedLatestJobRef.current = true;

    void (async () => {
      const result = await resumeLatest({ suppressFailedError: true });
      if (result?.status === "done") {
        await reloadMindmap();
      }
    })();
  }, [
    notebookId,
    mindmap,
    isMindmapLoading,
    isGenerating,
    resumeLatest,
    reloadMindmap,
  ]);

  useEffect(() => {
    if (!mindmap?.root_node_id) {
      queueMicrotask(() => {
        setExpandedNodeIds(new Set());
      });
      return;
    }
    const rootNodeId = mindmap.root_node_id;
    queueMicrotask(() => {
      setExpandedNodeIds(new Set([rootNodeId]));
    });
  }, [mindmap?.root_node_id]);

  useEffect(() => {
    if (!mindmap || !selectedNodeId) return;
    const exists = mindmap.nodes.some((node) => node.id === selectedNodeId);
    if (!exists) {
      queueMicrotask(() => {
        setSelectedNodeId(null);
      });
    }
  }, [mindmap, selectedNodeId]);

  const handleGenerateMindmap = async (prompt?: string) => {
    if (!notebookId) return;
    clearGenerateError();
    const result = await generate({ prompt });
    if (!result) return;
    clearAll();
    setSelectedNodeId(null);
    await reloadMindmap();
  };

  const isStale = mindmap?.status === "stale";
  const isEmpty = !mindmap || mindmap.status === "missing";
  const usedGenericFallback = Boolean(
    mindmap?.generation_meta?.used_generic_fallback,
  );

  const selectedNode = useMemo(() => {
    if (!mindmap || !selectedNodeId) return null;
    return mindmap.nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [mindmap, selectedNodeId]);

  const selectedExplanation = selectedNodeId ? getCachedDetail(selectedNodeId) : null;
  const selectedDetailError = selectedNodeId ? getNodeError(selectedNodeId) : null;
  const isDetailLoading = selectedNodeId ? isNodeLoading(selectedNodeId) : false;

  return (
    <NotebookShell
      title={notebook?.title}
      documents={documents}
      canManageDocuments={canManageDocuments}
      isUploading={isUploading}
      deletingDocumentIds={deletingDocumentIds}
      onAddSource={() => {
        if (!canManageDocuments) return;
        pickFile();
      }}
      onDeleteDocument={(document) => {
        if (!canManageDocuments) return;
        setDeleteTarget(document);
      }}
      mode="mindmap"
      isStudioLocked={false}
      canStartQuiz={hasReadySources}
      isGeneratingQuiz={false}
      canStartQuickstart={hasReadySources}
      isGeneratingQuickstart={false}
      canStartReports={hasReadySources}
      isGeneratingReports={false}
      canStartMindmap={hasReadySources}
      isGeneratingMindmap={isGenerating}
      canStartFlashcards={hasReadySources}
      isGeneratingFlashcards={false}
      onGoChat={() => notebookId && navigate(`/notebook/${notebookId}/chat`)}
      onGoQuiz={() => notebookId && navigate(`/notebook/${notebookId}/quiz`)}
      onGoQuickstart={() =>
        notebookId && navigate(`/notebook/${notebookId}/quickstart`)
      }
      onGoReports={() => notebookId && navigate(`/notebook/${notebookId}/reports`)}
      onGoMindmap={() => {}}
      onGoFlashcards={() => notebookId && navigate(`/notebook/${notebookId}/flashcards`)}
      beforeMain={
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.txt,.pptx"
          onChange={handleFileChange}
        />
      }
      footer={
        <DeleteDocumentModal
          isOpen={Boolean(deleteTarget)}
          documentName={deleteTarget?.file_name}
          isDeleting={
            deleteTarget ? deletingDocumentIds.has(deleteTarget.id) : false
          }
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      }
    >
        <MindmapShell
          showRefreshAction={!isEmpty}
          canRefresh={hasReadySources}
          isRefreshing={isGenerating}
          onRefresh={(prompt) => {
            void handleGenerateMindmap(prompt);
          }}
        >
        {isMindmapLoading && !mindmap ? (
          <div className="flex h-full items-center justify-center px-6">
            <p className="text-sm text-muted-foreground">Cargando mapa mental...</p>
          </div>
        ) : isEmpty ? (
          <MindmapEmptyState
            isGenerating={isGenerating}
            canGenerate={hasReadySources}
            error={generateError ?? mindmapError}
            onGenerate={handleGenerateMindmap}
          />
        ) : mindmap?.root_node_id ? (
          <div className="flex h-full min-h-0 flex-col">
            {isStale ? (
              <p className="border-b border-border bg-muted px-4 py-2 text-xs text-muted-foreground">
                Tu mapa mental esta desactualizado porque cambiaron las fuentes.
                Regeneralo para actualizar nodos y explicaciones.
              </p>
            ) : null}
            {usedGenericFallback ? (
              <p className="border-b border-border bg-amber-50 px-4 py-2 text-xs text-amber-800">
                Se detecto estructura limitada en la generacion. Puedes regenerar
                el mapa para intentar mejorar la cobertura de nodos.
              </p>
            ) : null}
            <div className="min-h-0 flex-1">
              <MindmapCanvas
                nodes={mindmap.nodes}
                rootNodeId={mindmap.root_node_id ?? null}
                selectedNodeId={selectedNodeId}
                expandedNodeIds={expandedNodeIds}
                onToggleNode={(nodeId) => {
                  setExpandedNodeIds((previous) => {
                    const next = new Set(previous);
                    if (next.has(nodeId)) {
                      next.delete(nodeId);
                    } else {
                      next.add(nodeId);
                    }
                    return next;
                  });
                }}
                onSelectNode={(nodeId) => {
                  setSelectedNodeId(nodeId);
                  setIsDetailModalVisible(true);
                  clearNodeError(nodeId);
                  if (mindmap.status === "stale") return;
                  void getDetail(nodeId);
                }}
              />
            </div>
            <MindmapDetailPanel
              isOpen={isDetailModalVisible}
              onClose={() => setIsDetailModalVisible(false)}
              selectedNodeTitle={selectedNode?.title ?? null}
              explanation={selectedExplanation}
              isLoading={isDetailLoading}
              error={selectedDetailError}
              isStale={Boolean(isStale)}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-6">
            <p className="text-sm text-muted-foreground" role="alert">
              {generateError ?? mindmapError ?? "No se pudo cargar el mapa mental."}
            </p>
          </div>
        )}
      </MindmapShell>
    </NotebookShell>
  );
}

