import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

const asList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  // Detail endpoints return one entity; normalize it so all slices keep an items array.
  return response && typeof response === 'object' ? [response] : [];
};

/**
 * Creates a consistent CRUD slice for a REST resource.
 * API calls remain in services/api.js; components only dispatch these operations.
 */
export function createResourceSlice({ name, api, idKey = 'id', list, operations = {} }) {
  const idOf = (item) => (Array.isArray(idKey)
    ? idKey.map((key) => item?.[key]).find((id) => id !== undefined && id !== null)
    : item?.[idKey]) ?? item?.id;
  const initialState = {
    items: [],
    status: 'idle',
    error: null,
    mutationStatus: 'idle',
    mutationError: null,
    meta: {},
  };

  const load = createAsyncThunk(`${name}/load`, async (args = {}, { signal, rejectWithValue }) => {
    try {
      const data = await list(args, { signal });
      return asList(data);
    } catch (error) {
      if (error?.isCancelled) throw error;
      return rejectWithValue(error?.message || `Unable to load ${name}.`);
    }
  });

  const create = createAsyncThunk(`${name}/create`, async (payload, { signal, rejectWithValue }) => {
    try { return await api.create(payload, { signal }); }
    catch (error) { return rejectWithValue(error?.message || `Unable to create ${name}.`); }
  });

  const update = createAsyncThunk(`${name}/update`, async ({ id, changes }, { signal, rejectWithValue }) => {
    try { return await api.update(id, changes, { signal }); }
    catch (error) { return rejectWithValue(error?.message || `Unable to update ${name}.`); }
  });

  const remove = createAsyncThunk(`${name}/remove`, async (id, { signal, rejectWithValue }) => {
    try { await api.delete(id, { signal }); return id; }
    catch (error) { return rejectWithValue(error?.message || `Unable to delete ${name}.`); }
  });

  // Domain operations are explicit thunks so buttons never need to call an API module directly.
  const domainActions = Object.fromEntries(Object.entries(operations).map(([operation, config]) => {
    const thunk = createAsyncThunk(`${name}/${operation}`, async (payload, { signal, rejectWithValue }) => {
      try {
        const args = Array.isArray(payload) ? payload : [payload];
        return await config(...args, { signal });
      } catch (error) {
        return rejectWithValue(error?.message || `Unable to ${operation} ${name}.`);
      }
    });
    return [operation, thunk];
  }));

  const slice = createSlice({
    name,
    initialState,
    reducers: {
      clearError(state) { state.error = null; state.mutationError = null; },
      upsert(state, action) {
        const item = action.payload;
        const index = state.items.findIndex((entry) => String(idOf(entry)) === String(idOf(item)));
        if (index === -1) state.items.unshift(item); else state.items[index] = { ...state.items[index], ...item };
      },
      replaceAll(state, action) { state.items = asList(action.payload); },
      setMeta(state, action) { state.meta = { ...state.meta, ...action.payload }; },
      reset(state) { Object.assign(state, initialState); },
    },
    extraReducers: (builder) => builder
      .addCase(load.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(load.fulfilled, (state, action) => { state.status = 'succeeded'; state.items = action.payload; })
      .addCase(load.rejected, (state, action) => {
        if (action.meta.aborted) return;
        state.status = 'failed'; state.error = action.payload || action.error.message;
      })
      .addCase(remove.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded';
        state.items = state.items.filter((item) => String(idOf(item)) !== String(action.payload));
      })
      .addMatcher((action) => action.type === create.pending.type || action.type === update.pending.type || action.type === remove.pending.type,
        (state) => { state.mutationStatus = 'loading'; state.mutationError = null; })
      .addMatcher((action) => action.type === create.fulfilled.type || action.type === update.fulfilled.type,
        (state, action) => {
          state.mutationStatus = 'succeeded';
          const item = action.payload;
          if (!item) return;
          const index = state.items.findIndex((entry) => String(idOf(entry)) === String(idOf(item)));
          if (index === -1) state.items.unshift(item); else state.items[index] = { ...state.items[index], ...item };
        })
      .addMatcher((action) => action.type === create.rejected.type || action.type === update.rejected.type || action.type === remove.rejected.type || Object.values(domainActions).some((thunk) => action.type === thunk.rejected.type),
        (state, action) => {
          if (action.meta.aborted) return;
          state.mutationStatus = 'failed'; state.mutationError = action.payload || action.error.message;
        }),
  });

  return { reducer: slice.reducer, actions: { ...slice.actions, load, create, update, remove, ...domainActions } };
}
