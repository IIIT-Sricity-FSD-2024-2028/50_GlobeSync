import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
      .map((key) => [key, (...payload) => dispatch(actions[key](payload.length > 1 ? payload : payload[0])).unwrap()])),
  };
}

const aggregateResources = ['superuserDashboard', 'superuserReports', 'superuserRevenue', 'superuserRules', 'superuserProfile'];
export function useReduxAdminData(resourceName, loadArgs, options) {
  const resource = useResource(resourceName, loadArgs, options);
  const [notice, setNotice] = useState('');
  const [localError, setLocalError] = useState('');
  const run = useCallback(async (operation, payload, message, onSuccess) => {
    setNotice(''); setLocalError('');
    try {
      const result = typeof operation === 'function' ? await operation() : await resource[operation](...(Array.isArray(payload) ? payload : [payload]));
      await resource.refresh().catch(() => {});
      if (message) setNotice(message);
      onSuccess?.(result);
      return result;
    } catch (error) {
      setLocalError(error?.message || 'The operation failed.');
      return false;
    }
  }, [resource]);
  return { ...resource, data: aggregateResources.includes(resourceName) ? (resource.items[0] ?? null) : resource.items, loading: resource.status === 'loading', busy: resource.mutationStatus === 'loading', error: localError || resource.mutationError || resource.error, notice, reload: resource.refresh, run, setError: setLocalError };
}

// Imported lazily to keep page imports compact while retaining one source of action definitions.
import { agencies, agencyCommissions, bookings, expenses, guideDashboard, guides, itineraries, messages, packages, passengers, payments, refunds, reviews, supportDashboard, supportTickets, travelerDashboard, travelers, trips } from './resources';
import { superuserAgencies, superuserDashboard, superuserReports, superuserRevenue, superuserRules, superuserIntegrations, superuserPaymentMethods, superuserProfile, superuserUsers } from './superuserResources';
const registry = { travelers, agencies, agencyCommissions, passengers, packages, trips, itineraries, bookings, expenses, payments, refunds, guides, guideDashboard, supportDashboard, reviews, supportTickets, messages, travelerDashboard, superuserAgencies, superuserDashboard, superuserReports, superuserRevenue, superuserRules, superuserIntegrations, superuserPaymentMethods, superuserProfile, superuserUsers };
function stateActions(name) {
  const entry = registry[name];
  if (!entry) throw new Error(`Unknown Redux resource: ${name}`);
  return entry.actions;
}
