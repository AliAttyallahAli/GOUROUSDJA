// src/components/Layout.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
    FaHome, FaHistory, FaUser, FaSignOutAlt, FaComments,
    FaBullhorn, FaCog, FaBell, FaWallet, FaQrcode, FaTimes,
    FaCheckCircle, FaHandHoldingUsd, FaUserCircle, FaCoins,
    FaMoneyBillWave, FaFacebook, FaWhatsapp, FaTelegram, FaGlobe,
    FaPiggyBank, FaStore, FaChartLine, FaUserShield, FaDownload,
    FaCopy, FaUniversity, FaCreditCard, FaLandmark, FaBuilding,
    FaBus, FaPlane
} from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';
import NotificationManager from './NotificationManager';

// ✅ API_URL en haut (utilisé partout)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9000';

function Layout({ user, children, socket }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { isDark } = useTheme();

    // ============================================
    // ÉTATS
    // ============================================
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const [balance, setBalance] = useState(null);
    const [loadingBalance, setLoadingBalance] = useState(false);
    const [qrAmount, setQrAmount] = useState('');
    const [qrDescription, setQrDescription] = useState('');
    const [qrGenerated, setQrGenerated] = useState(false);
    const [qrImageUrl, setQrImageUrl] = useState('');
    const [paymentLink, setPaymentLink] = useState('');
    const [copied, setCopied] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [hasCard, setHasCard] = useState(false);

    // ✅ Notification locale
    const [notification, setNotification] = useState(null);
    const [showNotification, setShowNotification] = useState(false);

    // ============================================
    // HELPERS — AVANT les useEffect (fix Safari)
    // ============================================
    const getToken = useCallback(() =>
        localStorage.getItem('accessToken') || localStorage.getItem('token'), []);

    const getAuthHeaders = useCallback(() => ({
        headers: { Authorization: `Bearer ${getToken()}` }
    }), [getToken]);

    const formatAmount = useCallback((amount) => {
        if (amount === null || amount === undefined) return '--- FCFA';
        return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
    }, []);

    const fetchBalance = useCallback(async () => {
        try {
            const response = await axios.get(
                `${API_URL}/api/wallet/balance`,
                getAuthHeaders()
            ).catch(() => ({ data: { balance: 0 } }));
            setBalance(response.data?.balance || 0);
        } catch (error) {
            console.error('❌ Erreur solde:', error);
        }
    }, [getAuthHeaders]);

    // ============================================
    // EFFETS
    // ============================================
    useEffect(() => {
        if (user) fetchBalance();
    }, [user, fetchBalance]);

    // Vérifier carte virtuelle
    useEffect(() => {
        let mounted = true;
        const checkCardStatus = async () => {
            if (!user) return;
            try {
                const res = await axios.get(
                    `${API_URL}/api/cards/my-card`,
                    getAuthHeaders()
                ).catch(() => ({ data: { card: null } }));
                if (mounted) setHasCard(res.data?.card?.status === 'active');
            } catch {
                if (mounted) setHasCard(false);
            }
        };
        checkCardStatus();
        return () => { mounted = false; };
    }, [user, getAuthHeaders]);

    // Messages non lus
    useEffect(() => {
        let mounted = true;
        const fetchUnreadMessages = async () => {
            if (!user) return;
            try {
                const response = await axios.get(
                    `${API_URL}/api/chat/unread-count`,
                    getAuthHeaders()
                ).catch(() => ({ data: { count: 0 } }));
                if (mounted) setUnreadMessages(response.data?.count || 0);
            } catch {
                if (mounted) setUnreadMessages(0);
            }
        };
        fetchUnreadMessages();
        const interval = setInterval(fetchUnreadMessages, 30000);
        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [user, getAuthHeaders]);

    // ✅ Socket.IO — avec gestion Safari (handlers nommés)
    useEffect(() => {
        if (!socket) return;

        const handleNotification = (notif) => {
            console.log('🔔 Notification reçue:', notif);
            setNotification(notif);
            setShowNotification(true);

            const type = notif?.type || 'info';
            const message = notif?.message || notif?.title || 'Nouvelle notification';

            if (type === 'success') toast.success(message, { icon: '✅', duration: 5000 });
            else if (type === 'error') toast.error(message, { icon: '❌', duration: 5000 });
            else if (type === 'warning') toast(message, { icon: '⚠️', duration: 5000 });
            else toast(message, { icon: '🔔', duration: 5000 });

            setTimeout(() => setShowNotification(false), 5000);
        };

        const handleBalanceUpdate = (data) => {
            if (data?.user_id === user?.id) {
                setBalance(data.new_balance || 0);
                toast.success(`Solde: ${formatAmount(data.new_balance)}`, { icon: '💰' });
            }
        };

        const handleTransactionUpdate = () => {
            fetchBalance();
        };

        const handleNewMessage = (data) => {
            setUnreadMessages(prev => prev + 1);
            toast(data?.sender_name || 'Nouveau message', { icon: '💬', duration: 4000 });
        };

        const handlePaymentReceived = (data) => {
            toast.success(`+${formatAmount(data?.amount)} reçu !`, { icon: '💰', duration: 6000 });
            fetchBalance();
        };

        socket.on('notification', handleNotification);
        socket.on('balance_updated', handleBalanceUpdate);
        socket.on('transaction_update', handleTransactionUpdate);
        socket.on('new_message', handleNewMessage);
        socket.on('payment_received', handlePaymentReceived);

        return () => {
            socket.off('notification', handleNotification);
            socket.off('balance_updated', handleBalanceUpdate);
            socket.off('transaction_update', handleTransactionUpdate);
            socket.off('new_message', handleNewMessage);
            socket.off('payment_received', handlePaymentReceived);
        };
    }, [socket, user, formatAmount, fetchBalance]);

    // ============================================
    // NAVIGATION
    // ============================================
    const navItems = [
        { path: '/dashboard', icon: FaHome, label: 'Accueil' },
        { path: '/my-company', icon: FaBuilding, label: 'Mon Entreprise' },
        { path: '/tax-management', icon: FaLandmark, label: 'Gestion des Taxes' },
        { path: '/company/dashboard', icon: FaStore, label: 'Mon Bureau' },
        { path: '/savings', icon: FaPiggyBank, label: 'Épargne' },
        { path: '/investments', icon: FaChartLine, label: 'Investissements' },
        { path: '/loans', icon: FaHandHoldingUsd, label: 'Prêts', subLabel: 'Demander un prêt', roles: ['user', 'agent'] },
        {
            path: '/virtual-card',
            icon: FaCreditCard,
            label: hasCard ? 'Ma Carte' : 'Demander une carte',
            subLabel: hasCard ? 'Carte active' : 'Carte virtuelle',
            badge: hasCard ? null : 'NEW',
            roles: ['user', 'agent', 'admin', 'commune']
        },
        { path: '/card-payment', icon: FaUniversity, label: 'Encaisser', subLabel: 'Paiement par carte', roles: ['user', 'agent', 'admin'] },
        { path: '/agency-management', icon: FaBuilding, label: 'Agence', subLabel: 'Gestion voyages', roles: ['agent', 'admin'] },
        { path: '/token-market', icon: FaCoins, label: 'Marché Tokens', subLabel: 'Investir', roles: ['user', 'agent', 'admin', 'commune'] },
        { path: '/history', icon: FaHistory, label: 'Historique' },
        { path: '/settings', icon: FaCog, label: 'Paramètres' },
        { path: '/announcements', icon: FaBell, label: 'Annonces' },
        { path: '/blog', icon: FaBullhorn, label: 'Blog' },
        { path: '/profile', icon: FaUser, label: 'Profil' },
        { path: '/chat', icon: FaComments, label: 'Messagerie', subLabel: 'Discuter', badge: unreadMessages > 0 ? unreadMessages : null, roles: ['user', 'agent', 'admin', 'commune'] },
    ];

    const adminItems = [
        { path: '/admin', icon: FaUserShield, label: 'Admin' },
        { path: '/admin/savings', icon: FaPiggyBank, label: 'Gestion Épargne' },
        { path: '/admin/loans', icon: FaHandHoldingUsd, label: 'Gestion Prêts' },
        { path: '/admin/cards', icon: FaCreditCard, label: 'Gestion Cartes' },
    ];

    const filteredNavItems = navItems.filter(item => {
        if (!item.roles) return true;
        return item.roles.includes(user?.role);
    });

    const allNavItems = user?.role === 'admin'
        ? [...filteredNavItems, ...adminItems]
        : filteredNavItems;

    const footerLinks = [
        { path: '/terms', label: 'Conditions' },
        { path: '/privacy', label: 'Confidentialité' },
        { path: '/contact', label: 'Contact' },
        { path: '/faq', label: 'FAQ' },
        { path: '/agents', label: 'Agents' },
    ];

    const socialLinks = [
        { icon: FaFacebook, href: 'https://facebook.com/AlkherPay', color: 'hover:bg-[#1877f2]' },
        { icon: FaWhatsapp, href: 'https://wa.me/23562787307', color: 'hover:bg-[#25d366]' },
        { icon: FaTelegram, href: 'https://t.me/AlkherPay', color: 'hover:bg-[#0088cc]' },
        { icon: FaGlobe, href: 'https://alkherpay.td', color: 'hover:bg-blue-500' },
    ];

    // ============================================
    // HANDLERS
    // ============================================
    const handleLogout = async () => {
        try {
            await axios.post(`${API_URL}/api/auth/logout`, {}, getAuthHeaders());
        } catch (error) {
            console.error('Erreur déconnexion:', error);
        } finally {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            toast.success('Déconnecté');
            navigate('/login');
        }
    };

    // ============================================
    // QR CODE
    // ============================================
    const generatePaymentLink = () => {
        const amountNum = parseInt(qrAmount);
        if (amountNum && amountNum < 25) {
            toast.error('Montant minimum: 25 FCFA');
            return null;
        }
        const params = new URLSearchParams();
        if (user?.phone) params.append('phone', user.phone);
        if (amountNum) params.append('amount', amountNum);
        if (qrDescription) params.append('description', qrDescription);
        return `${window.location.origin}/transfer?${params.toString()}`;
    };

    const generateDynamicQR = async () => {
        const link = generatePaymentLink();
        if (!link) return;

        setGenerating(true);
        try {
            const encodedLink = encodeURIComponent(link);
            const qrApiUrl = `https://quickchart.io/qr?text=${encodedLink}&size=250&margin=2`;
            const response = await fetch(qrApiUrl);
            if (response.ok) {
                setPaymentLink(link);
                setQrImageUrl(qrApiUrl);
                setQrGenerated(true);
                toast.success('QR code généré !');
            } else {
                throw new Error('Erreur QR');
            }
        } catch (error) {
            console.error('Erreur QR:', error);
            toast.error('Erreur génération');
        } finally {
            setGenerating(false);
        }
    };

    const resetQRGenerator = () => {
        setQrGenerated(false);
        setQrAmount('');
        setQrDescription('');
        setQrImageUrl('');
        setPaymentLink('');
    };

    const copyToClipboard = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Copié !');
        setTimeout(() => setCopied(false), 2000);
    };

    const shareViaWhatsApp = () => {
        if (!paymentLink) return;
        const message = `💰 Demande de paiement AlkherPay\n\n${paymentLink}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    const downloadQRCode = () => {
        if (qrImageUrl) {
            const link = document.createElement('a');
            link.download = `alkherpay-qr-${user?.phone}.png`;
            link.href = qrImageUrl;
            link.click();
            toast.success('QR téléchargé');
        }
    };

    const isActiveLink = (path) => {
        if (path === '/admin') return location.pathname.startsWith('/admin');
        return location.pathname === path;
    };

    const mobileNavItems = filteredNavItems.slice(0, 5);

    // ============================================
    // RENDU
    // ============================================
    return (
        <div className={`min-h-screen flex flex-col ${isDark ? 'dark' : 'light'}`}>

            {/* Bannière notification */}
            {showNotification && notification && (
                <div className="fixed top-20 right-4 z-[60] max-w-sm">
                    <div className={`rounded-xl shadow-2xl p-4 border-l-4 ${
                        notification.type === 'success' ? 'bg-green-500 border-green-700' :
                        notification.type === 'error' ? 'bg-red-500 border-red-700' :
                        notification.type === 'warning' ? 'bg-yellow-500 border-yellow-700' :
                        'bg-blue-500 border-blue-700'
                    }`}>
                        <div className="flex items-start gap-3">
                            <div className="text-white text-2xl">
                                {notification.type === 'success' ? '✅' :
                                 notification.type === 'error' ? '❌' :
                                 notification.type === 'warning' ? '⚠️' : '🔔'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-white text-sm truncate">
                                    {notification.title || 'Notification'}
                                </p>
                                <p className="text-white/90 text-xs mt-1">{notification.message}</p>
                            </div>
                            <button onClick={() => setShowNotification(false)} className="text-white/70 hover:text-white">
                                <FaTimes size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <header className={`sticky top-0 z-40 border-b ${isDark ? 'bg-blue-900/80 border-white/10' : 'bg-white/90 border-gray-200'} backdrop-blur-md`}>
                <div className="container mx-auto px-4 py-3">
                    <div className="flex justify-between items-center">
                        <Link to="/dashboard" className="flex items-center gap-2 group">
                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-xl">
                                <FaMoneyBillWave className="text-white text-xl" />
                            </div>
                            <div>
                                <span className={`font-bold text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>AlkherPay</span>
                                <span className="text-blue-400 text-xs block">GOUROUSDJA</span>
                            </div>
                        </Link>

                        <div className="flex items-center gap-3">
                            {balance !== null && (
                                <div className={`hidden md:flex items-center gap-2 rounded-full px-3 py-1.5 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                                    {loadingBalance ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <FaWallet className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
                                    )}
                                    <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {formatAmount(balance)}
                                    </span>
                                </div>
                            )}

                            <ThemeToggle />
                            <NotificationManager user={user} socket={socket} />

                            <button onClick={() => setShowQR(true)} className={`p-2 rounded-full ${isDark ? 'text-white/70 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}>
                                <FaQrcode size={18} />
                            </button>

                            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className={`md:hidden p-2 rounded-full ${isDark ? 'text-white' : 'text-gray-700'}`}>
                                <FaUserCircle size={24} />
                            </button>

                            <button onClick={handleLogout} className={`hidden md:flex items-center gap-2 ${isDark ? 'text-white/60 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                                <FaSignOutAlt />
                                <span className="text-sm">Déconnexion</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* SIDEBAR DESKTOP */}
            <aside className={`hidden md:block fixed left-0 top-[73px] bottom-0 w-64 border-r z-30 ${isDark ? 'bg-blue-900/40 border-white/10' : 'bg-white/80 border-gray-200'} backdrop-blur-sm`}>
                <div className="p-4 h-full flex flex-col">
                    <div className={`mb-6 p-3 rounded-xl flex-shrink-0 ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-full">
                                <FaUser className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {user?.fullname || 'Utilisateur'}
                                </p>
                                <p className={`text-xs truncate ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                                    {user?.phone}
                                </p>
                                {user?.role === 'admin' && <span className="text-[10px] text-red-400">🛡️ Admin</span>}
                            </div>
                        </div>
                        {balance !== null && (
                            <div className={`mt-3 pt-3 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                <div className="flex justify-between">
                                    <span className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Solde</span>
                                    <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {formatAmount(balance)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                        {allNavItems.map((item) => (
                            <Link key={item.path} to={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                                isActiveLink(item.path) ? 'bg-yellow-500 text-black' : isDark ? 'text-white/70 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'
                            }`}>
                                <item.icon className="text-lg flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">{item.label}</div>
                                    {item.subLabel && <div className="text-[10px] text-gray-400 truncate">{item.subLabel}</div>}
                                </div>
                                {item.badge && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${item.badge === 'NEW' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </div>

                    <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-4 py-3 mt-6 rounded-lg ${isDark ? 'text-white/50 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100'}`}>
                        <FaSignOutAlt />
                        <span>Déconnexion</span>
                    </button>
                </div>
            </aside>

            {/* CONTENU DESKTOP */}
            <div className="hidden md:block md:ml-64">
                <main className="flex-1 container mx-auto px-4 py-6 pb-24 md:pb-6">{children}</main>
                <footer className={`mt-auto border-t ${isDark ? 'border-white/10 bg-blue-900/30' : 'border-gray-200 bg-gray-50'} py-6`}>
                    <div className="container mx-auto px-4">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="text-center md:text-left">
                                <div className="flex items-center gap-2 mb-2">
                                    <FaMoneyBillWave className={`text-xl ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                                    <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>AlkherPay</span>
                                </div>
                                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>© 2026 AlkherPay - GOUROUSDJA</p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-6">
                                {footerLinks.map((link) => (
                                    <Link key={link.path} to={link.path} className={`text-sm ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                            <div className="flex gap-3">
                                {socialLinks.map((social, index) => (
                                    <a key={index} href={social.href} target="_blank" rel="noopener noreferrer" className={`p-2 rounded-full ${isDark ? 'bg-white/10 text-white/70' : 'bg-gray-100 text-gray-600'} ${social.color}`}>
                                        <social.icon size={16} />
                                    </a>
                                ))}
                            </div>
                        </div>
                        <div className={`mt-4 pt-4 text-center text-xs ${isDark ? 'text-white/30' : 'text-gray-400'} border-t ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
                            <p>Service client: 62 78 73 07 | supportalkher@gmail.com</p>
                        </div>
                    </div>
                </footer>
            </div>

            {/* CONTENU MOBILE */}
            <div className="md:hidden flex-1">
                <main className="container mx-auto px-4 py-6 pb-24">{children}</main>
            </div>

            {/* NAVIGATION MOBILE */}
            <nav className={`fixed bottom-0 left-0 right-0 border-t z-40 md:hidden ${isDark ? 'bg-blue-900/95 border-white/10' : 'bg-white/95 border-gray-200'} backdrop-blur-lg`}>
                <div className="flex justify-around py-2">
                    {mobileNavItems.map((item) => (
                        <Link key={item.path} to={item.path} className={`flex flex-col items-center py-2 px-3 relative ${
                            isActiveLink(item.path) ? 'text-yellow-400' : isDark ? 'text-white/50' : 'text-gray-500'
                        }`}>
                            <item.icon className="text-xl" />
                            <span className="text-xs mt-1">{item.label}</span>
                            {item.badge && (
                                <span className="absolute top-0 right-0 text-[8px] bg-red-500 text-white px-1 rounded-full">
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    ))}
                </div>
            </nav>

            {/* MENU MOBILE */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div className={`absolute inset-0 ${isDark ? 'bg-black/60' : 'bg-black/30'}`} onClick={() => setMobileMenuOpen(false)} />
                    <div className={`absolute right-0 top-0 bottom-0 w-64 p-4 overflow-y-auto ${isDark ? 'bg-blue-900' : 'bg-white'}`}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Menu</h3>
                            <button onClick={() => setMobileMenuOpen(false)} className={isDark ? 'text-white/60' : 'text-gray-500'}>
                                <FaTimes size={20} />
                            </button>
                        </div>
                        <div className={`mb-6 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                            <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.fullname}</p>
                            <p className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{user?.phone}</p>
                            {balance !== null && (
                                <p className={`text-sm mt-2 ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>
                                    {formatAmount(balance)}
                                </p>
                            )}
                        </div>
                        {allNavItems.map((item) => (
                            <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                                isActiveLink(item.path) ? 'bg-yellow-500 text-black' : isDark ? 'text-white/70 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'
                            }`}>
                                <item.icon />
                                <span className="flex-1">{item.label}</span>
                                {item.badge && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${item.badge === 'NEW' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        ))}
                        <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-4 py-3 mt-6 rounded-lg ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                            <FaSignOutAlt />
                            <span>Déconnexion</span>
                        </button>
                    </div>
                </div>
            )}

            {/* QR MODAL */}
            {showQR && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
                    <div className={`relative max-w-md w-full rounded-2xl ${isDark ? 'bg-blue-900' : 'bg-white'} max-h-[90vh] overflow-y-auto`}>
                        <div className={`sticky top-0 p-4 border-b ${isDark ? 'border-white/10 bg-blue-900' : 'border-gray-200 bg-white'} flex justify-between items-center`}>
                            <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
                                <FaQrcode className="text-blue-400" /> QR Code
                            </h3>
                            <button onClick={() => setShowQR(false)} className={isDark ? 'text-white/60' : 'text-gray-400'}>
                                <FaTimes size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            {!qrGenerated ? (
                                <div className="space-y-4">
                                    <div className="text-center mb-4">
                                        <div className="w-20 h-20 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center mb-3">
                                            <FaQrcode className="text-blue-400 text-3xl" />
                                        </div>
                                        <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                                            Générez un QR code pour recevoir un paiement
                                        </p>
                                    </div>

                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>Montant (optionnel)</label>
                                        <input
                                            type="number"
                                            value={qrAmount}
                                            onChange={(e) => setQrAmount(e.target.value)}
                                            className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                                            placeholder="Ex: 5000"
                                            min="25"
                                        />
                                    </div>

                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>Description</label>
                                        <input
                                            type="text"
                                            value={qrDescription}
                                            onChange={(e) => setQrDescription(e.target.value)}
                                            className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                                            placeholder="Ex: Paiement service"
                                        />
                                    </div>

                                    <button
                                        onClick={generateDynamicQR}
                                        disabled={generating}
                                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {generating ? (
                                            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Génération...</>
                                        ) : (
                                            <><FaQrcode /> Générer mon QR code</>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="text-center">
                                        {qrImageUrl && (
                                            <img src={qrImageUrl} alt="QR Code" className="w-48 h-48 mx-auto bg-white p-4 rounded-xl shadow-lg" />
                                        )}
                                    </div>

                                    <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                                        <div className={`flex justify-between text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            <span className={isDark ? 'text-white/60' : 'text-gray-500'}>Votre numéro</span>
                                            <span className="font-mono font-bold">{user?.phone}</span>
                                        </div>
                                        {qrAmount && (
                                            <div className={`flex justify-between text-sm mt-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                <span className={isDark ? 'text-white/60' : 'text-gray-500'}>Montant</span>
                                                <span className="text-green-500 font-bold">{parseInt(qrAmount).toLocaleString()} FCFA</span>
                                            </div>
                                        )}
                                        <div className={`flex justify-between text-sm mt-2 pt-2 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                            <button onClick={() => copyToClipboard(paymentLink)} className="text-blue-400 text-xs flex items-center gap-1">
                                                {copied ? <FaCheckCircle /> : <FaCopy />}
                                                {copied ? 'Copié !' : 'Copier le lien'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button onClick={downloadQRCode} className="flex-1 bg-gray-600 text-white text-sm py-2 rounded-lg flex items-center justify-center gap-1">
                                            <FaDownload /> Télécharger
                                        </button>
                                        <button onClick={shareViaWhatsApp} className="flex-1 bg-[#25d366] text-white text-sm py-2 rounded-lg flex items-center justify-center gap-1">
                                            <FaWhatsapp /> WhatsApp
                                        </button>
                                    </div>

                                    <button onClick={resetQRGenerator} className={`w-full text-sm ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                        Générer un nouveau QR code
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Layout;