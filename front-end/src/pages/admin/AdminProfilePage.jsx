import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAdminProfile,
  updateAdminProfile,
} from '../../store/admin-profile/admin-profile-actions';
import { adminProfileActions } from '../../store/admin-profile/admin-profile-slice';
import { useSession } from '../../context/SessionContext';
import { AdminPage, Details, Field } from '../../components/admin/AdminUI';

export default function AdminProfilePage() {
  const dispatch = useDispatch();
  const { user, updateUser } = useSession();
  const id = user?.adminId ?? user?.admin_id ?? user?.id;

  const profile = useSelector((state) => state.adminProfile.profile);
  const form = useSelector((state) => state.adminProfile.form);
  const loading = useSelector((state) => state.adminProfile.loading);
  const error = useSelector((state) => state.adminProfile.error);

  const [localNotice, setLocalNotice] = useState(null);

  useEffect(() => {
    if (id) {
      dispatch(fetchAdminProfile(id));
    }
  }, [dispatch, id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalNotice(null);
    try {
      const result = await dispatch(
        updateAdminProfile(id, { name: form.name.trim(), email: form.email.trim() })
      );
      if (updateUser) {
        updateUser(result);
      }
      setLocalNotice('Profile updated.');
    } catch {
      // Error handled in Redux state
    }
  };

  const resource = {
    loading,
    busy: loading,
    load: () => id && dispatch(fetchAdminProfile(id)),
    error,
    notice: localNotice,
    data: profile,
  };

  return (
    <AdminPage title="Profile" resource={resource}>
      {profile && (
        <>
          <Details
            entries={[
              ['Admin ID', profile.adminId],
              ['Role', profile.role],
            ]}
          />
          <form className="admin-profile-form" onSubmit={handleSubmit}>
            <Field
              label="Name"
              value={form.name}
              onChange={(e) => dispatch(adminProfileActions.setForm({ name: e.target.value }))}
              required
              pattern=".*\S.*"
              disabled={loading}
              autoComplete="name"
            />
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => dispatch(adminProfileActions.setForm({ email: e.target.value }))}
              required
              disabled={loading}
              autoComplete="email"
            />
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save profile'}
            </button>
          </form>
        </>
      )}
    </AdminPage>
  );
}
