import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { adminAPI } from '../api/client';
import './Users.css';

function Users() {
    const toast = useToast();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'user'
    });

    // Fetch users on mount and when window regains focus
    useEffect(() => {
        fetchUsers();

        const handleFocus = () => {
            console.log('Window focused - refreshing users');
            fetchUsers();
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getUsers();
            const userData = response.data.data.users || [];
            setUsers(userData);
            console.log('Fetched users:', userData.length, userData);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error(error.response?.data?.message || 'Failed to load users');
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'Active' && user.isActive) ||
            (statusFilter === 'Inactive' && !user.isActive);
        return matchesSearch && matchesRole && matchesStatus;
    });

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedUsers(filteredUsers.map(u => u.id));
        } else {
            setSelectedUsers([]);
        }
    };

    const handleSelectUser = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            await adminAPI.createUser(formData);
            toast.success('User created successfully!');
            setShowAddModal(false);
            setFormData({ email: '', password: '', firstName: '', lastName: '', role: 'user' });
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create user');
        }
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        try {
            await adminAPI.updateUser(editingUser.id, formData);
            toast.success('User updated successfully!');
            setShowEditModal(false);
            setEditingUser(null);
            setFormData({ email: '', password: '', firstName: '', lastName: '', role: 'user' });
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update user');
        }
    };

    const handleDeleteUser = async (userId, userName) => {
        if (!window.confirm(`Are you sure you want to delete user "${userName}"?`)) {
            return;
        }

        try {
            await adminAPI.deleteUser(userId);
            toast.success(`User "${userName}" deleted successfully`);
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete user');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedUsers.length === 0) {
            toast.error('No users selected');
            return;
        }

        if (!window.confirm(`Are you sure you want to delete ${selectedUsers.length} user(s)?`)) {
            return;
        }

        try {
            await Promise.all(selectedUsers.map(id => adminAPI.deleteUser(id)));
            toast.success(`${selectedUsers.length} user(s) deleted successfully`);
            setSelectedUsers([]);
            fetchUsers();
        } catch (error) {
            toast.error('Failed to delete some users');
        }
    };

    const handleToggleStatus = async (userId, userName, currentStatus) => {
        try {
            console.log('Toggling status for user:', userId, 'current:', currentStatus);
            const response = await adminAPI.toggleUserStatus(userId);
            const newStatus = response.data.data.isActive;
            console.log('New status from server:', newStatus);

            // Update local state immediately
            setUsers(prevUsers =>
                prevUsers.map(user =>
                    user.id === userId
                        ? { ...user, isActive: newStatus }
                        : user
                )
            );

            toast.success(`User "${userName}" ${newStatus ? 'activated' : 'deactivated'}`);
        } catch (error) {
            console.error('Toggle status error:', error);
            toast.error(error.response?.data?.message || 'Failed to update user status');
            fetchUsers(); // Refresh on error
        }
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setFormData({
            email: user.email,
            password: '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            role: user.role
        });
        setShowEditModal(true);
    };

    const handleExport = () => {
        const csv = [
            ['ID', 'Name', 'Email', 'Role', 'Status', 'Joined'],
            ...filteredUsers.map(u => [
                u.id,
                `${u.firstName} ${u.lastName}`,
                u.email,
                u.role,
                u.isActive ? 'Active' : 'Inactive',
                new Date(u.createdAt).toLocaleDateString()
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        toast.success('Users exported to CSV');
    };

    const clearFilters = () => {
        setSearchTerm('');
        setRoleFilter('all');
        setStatusFilter('all');
        toast.info('Filters cleared');
    };

    const getInitials = (firstName, lastName) => {
        return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || '?';
    };

    if (loading) {
        return (
            <div className="users-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading users...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="users-page">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1>Users Management</h1>
                    <p className="page-subtitle">{filteredUsers.length} total users</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    ➕ Add New User
                </button>
            </div>

            {/* Filters Bar */}
            <div className="filters-bar">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search users by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>

                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="filter-select"
                >
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="user">User</option>
                </select>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="filter-select"
                >
                    <option value="all">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                </select>

                {(searchTerm || roleFilter !== 'all' || statusFilter !== 'all') && (
                    <button className="btn btn-sm" onClick={clearFilters}>
                        ✖ Clear Filters
                    </button>
                )}
            </div>

            {/* Bulk Actions */}
            {selectedUsers.length > 0 && (
                <div className="bulk-actions-bar">
                    <span className="bulk-count">{selectedUsers.length} selected</span>
                    <div className="bulk-buttons">
                        <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                            🗑️ Delete Selected
                        </button>
                        <button className="btn btn-sm" onClick={() => setSelectedUsers([])}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Users Table */}
            <div className="card">
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                                        onChange={handleSelectAll}
                                        className="checkbox"
                                    />
                                </th>
                                <th>User</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Joined</th>
                                <th style={{ width: '120px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id} className={selectedUsers.includes(user.id) ? 'selected' : ''}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.includes(user.id)}
                                            onChange={() => handleSelectUser(user.id)}
                                            className="checkbox"
                                        />
                                    </td>
                                    <td>
                                        <div className="user-cell">
                                            <div className="user-avatar">
                                                {getInitials(user.firstName, user.lastName)}
                                            </div>
                                            <div className="user-info">
                                                <div className="user-name">{user.firstName} {user.lastName}</div>
                                                <div className="user-email">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="role-badge">{user.role}</span>
                                    </td>
                                    <td>
                                        <button
                                            className={`status-badge ${user.isActive ? 'status-active' : 'status-inactive'}`}
                                            onClick={() => handleToggleStatus(user.id, `${user.firstName} ${user.lastName}`, user.isActive)}
                                        >
                                            {user.isActive ? 'Active' : 'Inactive'}
                                        </button>
                                    </td>
                                    <td className="text-secondary">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="btn-icon"
                                                title="Edit"
                                                onClick={() => openEditModal(user)}
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="btn-icon btn-danger"
                                                title="Delete"
                                                onClick={() => handleDeleteUser(user.id, `${user.firstName} ${user.lastName}`)}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredUsers.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-icon">👥</div>
                            <h3>No users found</h3>
                            <p>Try adjusting your search or filters</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Export Button */}
            <div className="page-footer">
                <button className="btn" onClick={handleExport}>
                    📥 Export to CSV
                </button>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add New User</h2>
                            <button className="modal-close" onClick={() => setShowAddModal(false)}>✖</button>
                        </div>
                        <form onSubmit={handleAddUser}>
                            <div className="form-group">
                                <label>Email *</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="user@example.com"
                                />
                            </div>
                            <div className="form-group">
                                <label>Password *</label>
                                <input
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Minimum 8 characters"
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>First Name</label>
                                    <input
                                        type="text"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        placeholder="John"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Last Name</label>
                                    <input
                                        type="text"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        placeholder="Doe"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Role *</label>
                                <select
                                    required
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="user">User</option>
                                    <option value="editor">Editor</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn" onClick={() => setShowAddModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Create User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && editingUser && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit User</h2>
                            <button className="modal-close" onClick={() => setShowEditModal(false)}>✖</button>
                        </div>
                        <form onSubmit={handleEditUser}>
                            <div className="form-group">
                                <label>Email *</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Password (leave blank to keep current)</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Enter new password"
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>First Name</label>
                                    <input
                                        type="text"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Last Name</label>
                                    <input
                                        type="text"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Role *</label>
                                <select
                                    required
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="user">User</option>
                                    <option value="editor">Editor</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn" onClick={() => setShowEditModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Update User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Users;
