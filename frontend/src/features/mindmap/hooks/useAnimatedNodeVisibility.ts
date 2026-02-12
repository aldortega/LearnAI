import { useEffect, useMemo, useReducer, useRef } from "react";

type Result = {
  displayedNodeIds: string[];
  visibleNodeIdSet: Set<string>;
};

type State = {
  retainedNodeIds: string[];
  exitingNodeIds: Set<string>;
};

type Action =
  | { type: "reset" }
  | { type: "mergeVisible"; visibleNodeIds: string[] }
  | { type: "setExiting"; nodesToExit: string[] }
  | { type: "removeNode"; nodeId: string };

function areSetsEqual(left: Set<string>, right: Set<string>): boolean {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
}

function reducer(state: State, action: Action): State {
  if (action.type === "reset") {
    if (state.retainedNodeIds.length === 0 && state.exitingNodeIds.size === 0) {
      return state;
    }
    return { retainedNodeIds: [], exitingNodeIds: new Set() };
  }

  if (action.type === "mergeVisible") {
    if (action.visibleNodeIds.length === 0) return state;
    if (state.retainedNodeIds.length === 0) {
      return {
        ...state,
        retainedNodeIds: [...action.visibleNodeIds],
      };
    }

    const retainedSet = new Set(state.retainedNodeIds);
    const next = [...state.retainedNodeIds];
    let changed = false;
    for (const nodeId of action.visibleNodeIds) {
      if (!retainedSet.has(nodeId)) {
        next.push(nodeId);
        changed = true;
      }
    }
    if (!changed) return state;
    return { ...state, retainedNodeIds: next };
  }

  if (action.type === "setExiting") {
    const next = new Set(action.nodesToExit);
    if (areSetsEqual(state.exitingNodeIds, next)) return state;
    return { ...state, exitingNodeIds: next };
  }

  const retainedNodeIds = state.retainedNodeIds.filter(
    (nodeId) => nodeId !== action.nodeId,
  );
  const exitingNodeIds = new Set(state.exitingNodeIds);
  exitingNodeIds.delete(action.nodeId);

  const retainedUnchanged = retainedNodeIds.length === state.retainedNodeIds.length;
  const exitingUnchanged = exitingNodeIds.size === state.exitingNodeIds.size;
  if (retainedUnchanged && exitingUnchanged) return state;

  return {
    retainedNodeIds,
    exitingNodeIds,
  };
}

export function useAnimatedNodeVisibility(
  rootNodeId: string | null,
  visibleNodeIds: string[],
  transitionMs = 240,
): Result {
  const [state, dispatch] = useReducer(reducer, {
    retainedNodeIds: [...visibleNodeIds],
    exitingNodeIds: new Set<string>(),
  });
  const exitTimersRef = useRef<Map<string, number>>(new Map());
  const visibleNodeIdSet = useMemo(
    () => new Set(visibleNodeIds),
    [visibleNodeIds],
  );

  useEffect(() => {
    const timers = exitTimersRef.current;
    return () => {
      for (const timerId of timers.values()) {
        window.clearTimeout(timerId);
      }
      timers.clear();
    };
  }, []);

  useEffect(() => {
    if (!rootNodeId) {
      for (const timerId of exitTimersRef.current.values()) {
        window.clearTimeout(timerId);
      }
      exitTimersRef.current.clear();
      dispatch({ type: "reset" });
      return;
    }
    dispatch({ type: "mergeVisible", visibleNodeIds });
  }, [rootNodeId, visibleNodeIds]);

  useEffect(() => {
    if (!rootNodeId) return;

    for (const nodeId of visibleNodeIds) {
      const timerId = exitTimersRef.current.get(nodeId);
      if (typeof timerId === "number") {
        window.clearTimeout(timerId);
        exitTimersRef.current.delete(nodeId);
      }
    }

    const nodesToExit = state.retainedNodeIds.filter(
      (nodeId) => !visibleNodeIdSet.has(nodeId),
    );

    for (const nodeId of nodesToExit) {
      if (exitTimersRef.current.has(nodeId)) continue;
      const timerId = window.setTimeout(() => {
        exitTimersRef.current.delete(nodeId);
        dispatch({ type: "removeNode", nodeId });
      }, transitionMs);
      exitTimersRef.current.set(nodeId, timerId);
    }

    dispatch({ type: "setExiting", nodesToExit });
  }, [
    rootNodeId,
    state.retainedNodeIds,
    transitionMs,
    visibleNodeIdSet,
    visibleNodeIds,
  ]);

  const displayedNodeIds = useMemo(() => {
    if (!rootNodeId) return [];
    if (state.retainedNodeIds.length === 0) return visibleNodeIds;
    return state.retainedNodeIds;
  }, [rootNodeId, state.retainedNodeIds, visibleNodeIds]);

  const visibleWithExiting = useMemo(() => {
    const merged = new Set(visibleNodeIdSet);
    for (const exitingId of state.exitingNodeIds) {
      merged.delete(exitingId);
    }
    return merged;
  }, [state.exitingNodeIds, visibleNodeIdSet]);

  return {
    displayedNodeIds,
    visibleNodeIdSet: visibleWithExiting,
  };
}
