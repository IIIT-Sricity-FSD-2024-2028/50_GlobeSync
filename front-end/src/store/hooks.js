import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect, useMemo } from 'react';

/** Connect a page to one domain slice. CRUD calls are dispatched, never made from JSX. */
export function useResource(resource, loadArgs, { load = true } = {}) {
  const dispatch = useDispatch();
  const state = useSelector((root) => root[resource]);
  // Pages commonly pass an object literal as loadArgs. Stabilize it so an ordinary
  // render does not accidentally re-run the initial data request.
  const loadArgsKey = JSON.stringify(loadArgs ?? null);
  const stableLoadArgs = useMemo(() => loadArgs, [loadArgsKey]);
  const refresh = useCallback((args = stableLoadArgs) => dispatch(stateActions(resource).load(args)).unwrap(), [dispatch, resource, stableLoadArgs]);
  useEffect(() => { if (load) refresh().catch(() => {}); }, [load, refresh]);
  const actions = stateActions(resource);
  return {
    ...state,
    refresh,
    create: (payload) => dispatch(actions.create(payload)).unwrap(),
    update: (id, changes) => dispatch(actions.update({ id, changes })).unwrap(),
    remove: (id) => dispatch(actions.remove(id)).unwrap(),
    upsert: (item) => dispatch(actions.upsert(item)),
    replaceAll: (items) => dispatch(actions.replaceAll(items)),
    setMeta: (meta) => dispatch(actions.setMeta(meta)),
    ...Object.fromEntries(Object.keys(actions)
      .filter((key) => !['load', 'create', 'update', 'remove', 'upsert', 'clearError', 'replaceAll', 'setMeta', 'reset'].includes(key))
      .map((key) => [key, (payload) => dispatch(actions[key](payload)).unwrap()])),
  };
}

// Imported lazily to keep page imports compact while retaining one source of action definitions.
import { agencies, agencyCommissions, bookings, expenses, guideDashboard, guides, itineraries, messages, packages, passengers, payments, refunds, reviews, supportDashboard, supportTickets, travelerDashboard, travelers, trips } from './resources';
const registry = { travelers, agencies, agencyCommissions, passengers, packages, trips, itineraries, bookings, expenses, payments, refunds, guides, guideDashboard, supportDashboard, reviews, supportTickets, messages, travelerDashboard };
function stateActions(name) {
  const entry = registry[name];
  if (!entry) throw new Error(`Unknown Redux resource: ${name}`);
  return entry.actions;
}
