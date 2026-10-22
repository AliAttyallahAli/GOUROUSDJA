// src/components/NotificationManager.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    FaBell, FaMoneyBillWave, FaIdCard, FaExclamationTriangle,
    FaCheckCircle, FaTimes, FaSpinner, FaArrowUp, FaArrowDown,
    FaStore, FaReceipt, FaUserCheck, FaClock, FaTrash,
    FaEye, FaExternalLinkAlt
} from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9000';

function NotificationManager({ user, socket }) {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const { isDark } = useTheme();
    const dropdownRef = useRef(null);

    // ============================================
    // HELPERS
    // ============================================
    const getToken = useCallback(() =>
        localStorage.getItem('accessToken') || localStorage.getItem('token'), []);

    const getAuthHeaders = useCallback(() => ({
        headers: { Authorization: `Bearer ${getToken()}` }
    }), [getToken]);

    // ✅ Ajouter une notification localement
    const addNotification = useCallback((notif) => {
        if (!notif) return;
        const newNotif = {
            id: notif.id || Date.now(),
            ...notif,
            is_read: false,
            created_at: notif.created_at || new Date().toISOString()
        };
        setNotifications(prev => {
            const newList = [newNotif, ...prev];
            return newList.slice(0, 100);
        });
        setUnreadCount(prev => prev + 1);
    }, []);

    // ✅ Notification navigateur (Safari-safe)
    const showBrowserNotification = useCallback((notif) => {
        try {
            if (typeof window === 'undefined') return;
            if (!('Notification' in window)) return;
            if (Notification.permission !== 'granted') return;

            new Notification(notif.title || 'AlkherPay', {
                body: notif.message || '',
                icon: '/AlkherPay-icon.png',
                silent: false
            });
        } catch (err) {
            console.warn('⚠️ Notification navigateur non supportée:', err.message);
        }
    }, []);

    // ============================================
    // CHARGEMENT
    // ============================================
    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(
                `${API_URL}/api/notifications`,
                getAuthHeaders()
            ).catch(() => ({ data: { notifications: [] } }));

            let notificationsList = [];
            if (Array.isArray(response.data?.notifications)) {
                notificationsList = response.data.notifications;
            } else if (Array.isArray(response.data)) {
                notificationsList = response.data;
            }

            setNotifications(notificationsList);
            setUnreadCount(notificationsList.filter(n => !n.is_read).length);
        } catch (error) {
            console.error('❌ Erreur chargement notifications:', error);
            setNotifications([]);
            setUnreadCount(0);
        } finally {
            setLoading(false);
        }
    }, [getAuthHeaders]);

    // ============================================
    // EFFETS
    // ============================================
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // ✅ Socket.IO — avec handler nommé (Safari-safe)
    useEffect(() => {
        if (!socket) return;

        const handleNotification = (notif) => {
            console.log('🔔 Notification reçue:', notif);
            addNotification(notif);
            showBrowserNotification(notif);
        };

        socket.on('notification', handleNotification);

        return () => {
            socket.off('notification', handleNotification);
        };
    }, [socket, addNotification, showBrowserNotification]);

    // Demander la permission (Safari-safe)
    useEffect(() => {
        try {
            if (typeof window === 'undefined') return;
            if (!('Notification' in window)) return;
            if (Notification.permission === 'default') {
                Notification.requestPermission().catch(() => {});
            }
        } catch (err) {
            console.warn('⚠️ Permission notification non supportée');
        }
    }, []);

    // Fermer le dropdown au clic extérieur
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ============================================
    // ACTIONS
    // ============================================
    const markAsRead = async (id) => {
        try {
            await axios.put(
                `${API_URL}/api/notifications/${id}/read`,
                {},
                getAuthHeaders()
            ).catch(() => {});
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('❌ Erreur marquage:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await axios.put(
                `${API_URL}/api/notifications/read-all`,
                {},
                getAuthHeaders()
            ).catch(() => {});
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
            toast.success('Toutes les notifications ont été marquées comme lues');
        } catch (error) {
            console.error('❌ Erreur:', error);
            toast.error('Erreur lors du marquage');
        }
    };

    const deleteNotification = async (id, e) => {
        if (e) e.stopPropagation();
        try {
            await axios.delete(
                `${API_URL}/api/notifications/${id}`,
                getAuthHeaders()
            ).catch(() => {});

            const wasUnread = notifications.find(n => n.id === id && !n.is_read);
            setNotifications(prev => prev.filter(n => n.id !== id));
            if (wasUnread) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
            toast.success('Notification supprimée');
        } catch (error) {
            console.error('❌ Erreur suppression:', error);
            toast.error('Erreur lors de la suppression');
        }
    };

    const handleNotificationClick = (notification) => {
        if (!notification.is_read) {
            markAsRead(notification.id);
        }

        const title = notification.title || '';
        let metadata = {};
        try {
            metadata = notification.metadata ? JSON.parse(notification.metadata) : {};
        } catch {
            metadata = {};
        }

        if (title.includes('KYC')) {
            navigate('/profile');
        } else if (title.includes('Candidature') || title.includes('agent')) {
            navigate('/admin/agent-applications');
        } else if (notification.type === 'transaction' && metadata.reference) {
            navigate(`/history?ref=${metadata.reference}`);
        } else {
            navigate(`/notifications/${notification.id}`);
        }

        setShowDropdown(false);
    };

    // ============================================
    // HELPERS UI
    // ============================================
    const getNotificationIcon = (notification) => {
        const title = notification.title || '';
        if (title.includes('Transfert reçu')) return <FaArrowDown className="text-green-400" size={18} />;
        if (title.includes('Transfert envoyé')) return <FaArrowUp className="text-blue-400" size={18} />;
        if (title.includes('Dépôt')) return <FaStore className="text-green-400" size={18} />;
        if (title.includes('Retrait')) return <FaMoneyBillWave className="text-yellow-400" size={18} />;
        if (title.includes('Frais')) return <FaReceipt className="text-purple-400" size={18} />;
        if (title.includes('KYC')) return <FaIdCard className="text-purple-400" size={18} />;
        if (title.includes('Candidature') || title.includes('agent')) return <FaUserCheck className="text-blue-400" size={18} />;
        if (notification.type === 'alert') return <FaExclamationTriangle className="text-yellow-400" size={18} />;
        return <FaBell className="text-blue-400" size={18} />;
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diff = now - date;
            const minutes = Math.floor(diff / 60000);

            if (minutes < 1) return 'À l\'instant';
            if (minutes < 60) return `Il y a ${minutes} min`;
            if (minutes < 1440) return `Il y a ${Math.floor(minutes / 60)} h`;
            return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        } catch {
            return '';
        }
    };

    // ============================================
    // CALCULS
    // ============================================
    const safeNotifications = Array.isArray(notifications) ? notifications : [];

    const filteredNotifications = safeNotifications.filter(n => {
        if (filter === 'all') return true;
        if (filter === 'transaction') return n.category === 'transaction' || n.type === 'transaction';
        if (filter === 'kyc') return n.category === 'kyc';
        if (filter === 'alert') return n.type === 'alert';
        return true;
    });

    const totalCount = safeNotifications.length;
    const transactionCount = safeNotifications.filter(n => n.category === 'transaction' || n.type === 'transaction').length;
    const kycCount = safeNotifications.filter(n => n.category === 'kyc').length;
    const alertCount = safeNotifications.filter(n => n.type === 'alert').length;

    // ============================================
    // RENDU
    // ============================================
    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bouton de notification */}
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative p-2 rounded-full transition-all hover:bg-white/10"
                aria-label="Notifications"
            >
                <FaBell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {showDropdown && (
                <div className={`absolute right-0 mt-2 w-80 md:w-96 rounded-xl shadow-2xl z-50 overflow-hidden ${isDark ? 'bg-blue-800/95' : 'bg-white'} backdrop-blur-lg border border-white/20`}>
                    {/* En-tête */}
                    <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <FaBell className="text-blue-400" />
                                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Notifications
                                </h3>
                                {unreadCount > 0 && (
                                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                        {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                            {totalCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-blue-400 text-xs hover:text-blue-300"
                                >
                                    Tout marquer lu
                                </button>
                            )}
                        </div>

                        {/* Filtres */}
                        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                                    filter === 'all' ? 'bg-blue-600 text-white' : isDark ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-600'
                                }`}
                            >
                                Toutes ({totalCount})
                            </button>
                            <button
                                onClick={() => setFilter('transaction')}
                                className={`px-3 py-1 rounded-full text-xs flex items-center gap-1 whitespace-nowrap ${
                                    filter === 'transaction' ? 'bg-green-600 text-white' : isDark ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-600'
                                }`}
                            >
                                <FaMoneyBillWave size={10} /> Transactions ({transactionCount})
                            </button>
                            <button
                                onClick={() => setFilter('kyc')}
                                className={`px-3 py-1 rounded-full text-xs flex items-center gap-1 whitespace-nowrap ${
                                    filter === 'kyc' ? 'bg-purple-600 text-white' : isDark ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-600'
                                }`}
                            >
                                <FaIdCard size={10} /> KYC ({kycCount})
                            </button>
                            <button
                                onClick={() => setFilter('alert')}
                                className={`px-3 py-1 rounded-full text-xs flex items-center gap-1 whitespace-nowrap ${
                                    filter === 'alert' ? 'bg-red-600 text-white' : isDark ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-600'
                                }`}
                            >
                                <FaExclamationTriangle size={10} /> Alertes ({alertCount})
                            </button>
                        </div>
                    </div>

                    {/* Liste */}
                    <div className="max-h-[450px] overflow-y-auto">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <FaSpinner className="text-white text-2xl animate-spin" />
                            </div>
                        ) : filteredNotifications.length === 0 ? (
                            <div className="text-center py-8">
                                <FaBell className={`text-4xl mx-auto mb-2 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
                                <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                                    Aucune notification
                                </p>
                            </div>
                        ) : (
                            filteredNotifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`p-4 border-b cursor-pointer group ${
                                        isDark ? 'border-white/10 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'
                                    } ${!notif.is_read ? (isDark ? 'bg-blue-700/30' : 'bg-blue-50') : ''}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0">
                                            {getNotificationIcon(notif)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                    {notif.title}
                                                </p>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                                                    <button
                                                        onClick={(e) => handleNotificationClick(notif)}
                                                        className={`p-1 ${isDark ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}
                                                    >
                                                        <FaEye size={12} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => deleteNotification(notif.id, e)}
                                                        className={`p-1 ${isDark ? 'text-white/30 hover:text-white/60' : 'text-gray-400 hover:text-gray-600'}`}
                                                    >
                                                        <FaTrash size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className={`text-xs mt-1 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                                                {notif.message?.length > 100
                                                    ? notif.message.substring(0, 100) + '...'
                                                    : notif.message}
                                            </p>
                                            <div className="flex items-center justify-between mt-2">
                                                <div className="flex items-center gap-2">
                                                    <FaClock className={`text-xs ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
                                                    <p className={`text-xs ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                                                        {formatTime(notif.created_at)}
                                                    </p>
                                                    {!notif.is_read && (
                                                        <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                                                    )}
                                                </div>
                                                <span className="text-blue-400 text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100">
                                                    <FaExternalLinkAlt size={10} /> Détails
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Pied */}
                    {totalCount > 0 && (
                        <div className={`p-3 text-center border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                            <button
                                onClick={() => {
                                    setShowDropdown(false);
                                    navigate('/notifications');
                                }}
                                className="text-blue-400 text-sm hover:text-blue-300"
                            >
                                Voir toutes les notifications
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default NotificationManager;