// src/pages/Transfer.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    FaPhone, FaMoneyBillWave, FaQrcode,
    FaTimes, FaCopy, FaCheckCircle,
    FaWhatsapp, FaDownload, FaSpinner, FaTrash,
    FaShieldAlt, FaFilePdf
} from 'react-icons/fa';
import Layout from '../components/Layout';
import PinModal from '../components/PinModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9000';

function Transfer({ user, socket }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Formulaire
    const [receiverPhone, setReceiverPhone] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [recentContacts, setRecentContacts] = useState([]);
    const [favorites, setFavorites] = useState([]);

    // PIN
    const [hasPin, setHasPin] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [pendingTransaction, setPendingTransaction] = useState(null);
    const [checkingPin, setCheckingPin] = useState(true);

    // QR Code
    const [qrAmount, setQrAmount] = useState('');
    const [qrDescription, setQrDescription] = useState('');
    const [qrGenerated, setQrGenerated] = useState(false);
    const [qrImageUrl, setQrImageUrl] = useState('');
    const [paymentLink, setPaymentLink] = useState('');

    // Notification
    const [showNotification, setShowNotification] = useState(false);
    const [notificationType, setNotificationType] = useState('success');
    const [transactionData, setTransactionData] = useState(null);
    const [kycLimit, setKycLimit] = useState(null);

    // ============================================
    // HELPERS
    // ============================================
    const getToken = () =>
        localStorage.getItem('accessToken') || localStorage.getItem('token');

    const getAuthHeaders = () => ({
        headers: { Authorization: `Bearer ${getToken()}` }
    });

    // ============================================
    // EFFETS
    // ============================================
    useEffect(() => {
        if (user) {
            checkUserPin();
            fetchRecentContacts();
            loadFavorites();
            fetchKycLimits();
        }
    }, [user]);

    useEffect(() => {
        const phoneParam = searchParams.get('phone');
        const amountParam = searchParams.get('amount');
        const descParam = searchParams.get('description');

        if (phoneParam) {
            setReceiverPhone(phoneParam);
        }
        if (amountParam && !isNaN(amountParam) && amountParam > 0) {
            setAmount(amountParam);
        }
        if (descParam) {
            setDescription(decodeURIComponent(descParam));
        }
    }, [searchParams]);

    useEffect(() => {
        if (socket) {
            socket.on('transaction_received', (data) => {
                toast.success(`💰 ${data.amount.toLocaleString()} FCFA reçu de ${data.sender_name}`);
                setTransactionData({
                    amount: data.amount,
                    reference: data.reference,
                    sender_name: data.sender_name,
                    sender_phone: data.sender_phone,
                    status: 'completed',
                    type: 'received'
                });
                setNotificationType('received');
                setShowNotification(true);
            });
        }
        return () => {
            if (socket) socket.off('transaction_received');
        };
    }, [socket]);

    // ============================================
    // CHARGEMENT
    // ============================================
    const checkUserPin = async () => {
        try {
            const response = await axios.get(
                `${API_URL}/api/user/pin-status`,
                getAuthHeaders()
            ).catch(() => ({ data: { hasPin: false } }));
            setHasPin(response.data?.hasPin || false);
        } catch (error) {
            console.error('Erreur PIN status:', error);
            setHasPin(false);
        } finally {
            setCheckingPin(false);
        }
    };

    const fetchRecentContacts = async () => {
        try {
            const response = await axios.get(
                `${API_URL}/api/wallet/history?limit=10`,
                getAuthHeaders()
            ).catch(() => ({ data: { transactions: [] } }));

            const contacts = (response.data?.transactions || [])
                .filter(tx => tx.receiver_phone && tx.receiver_phone !== user?.phone)
                .map(tx => ({
                    phone: tx.receiver_phone,
                    name: tx.receiver_name || tx.receiver_phone
                }))
                .filter((v, i, a) => a.findIndex(t => t.phone === v.phone) === i)
                .slice(0, 5);

            setRecentContacts(contacts);
        } catch (error) {
            console.error('Erreur contacts:', error);
        }
    };

    const fetchKycLimits = async () => {
        try {
            const response = await axios.get(
                `${API_URL}/api/kyc/limits`,
                getAuthHeaders()
            ).catch(() => ({ data: null }));
            setKycLimit(response.data);
        } catch (error) {
            console.error('Erreur limites KYC:', error);
        }
    };

    const loadFavorites = () => {
        try {
            const saved = localStorage.getItem('alkherpay_favorites');
            if (saved) setFavorites(JSON.parse(saved));
        } catch (e) {
            console.error('Erreur favoris:', e);
        }
    };

    const removeFavorite = (phone) => {
        const newFavorites = favorites.filter(f => f.phone !== phone);
        setFavorites(newFavorites);
        localStorage.setItem('alkherpay_favorites', JSON.stringify(newFavorites));
        toast.success('Retiré des favoris');
    };

    // ============================================
    // QR CODE
    // ============================================
    const generatePaymentLink = () => {
        const amountNum = parseInt(qrAmount);
        if (amountNum && amountNum < 25) {
            toast.error('Le montant minimum est de 25 FCFA');
            return null;
        }
        const params = new URLSearchParams();
        params.append('phone', user?.phone);
        if (amountNum) params.append('amount', amountNum);
        if (qrDescription) params.append('description', qrDescription);
        return `${window.location.origin}/transfer?${params.toString()}`;
    };

    const generateQRCode = () => {
        const link = generatePaymentLink();
        if (!link) return;
        setPaymentLink(link);
        setQrImageUrl(`https://quickchart.io/qr?text=${encodeURIComponent(link)}&size=250&margin=2`);
        setQrGenerated(true);
        toast.success('QR code généré !');
    };

    const resetQRGenerator = () => {
        setQrGenerated(false);
        setQrAmount('');
        setQrDescription('');
        setQrImageUrl('');
        setPaymentLink('');
    };

    const copyToClipboard = (text, label = 'Lien') => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success(`${label} copié !`);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareViaWhatsApp = () => {
        if (!paymentLink) return;
        const message = `💰 *Demande de paiement AlkherPay*\n\n${paymentLink}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    const downloadQRCode = () => {
        if (qrImageUrl) {
            const link = document.createElement('a');
            link.download = `alkherpay-qr-${user?.phone}.png`;
            link.href = qrImageUrl;
            link.click();
            toast.success('QR code téléchargé');
        }
    };

    // ============================================
    // TRANSFERT
    // ============================================
    const prepareTransaction = () => {
        const amountNum = parseInt(amount);

        if (!receiverPhone) {
            toast.error('Numéro du destinataire requis');
            return false;
        }

        if (receiverPhone.length !== 8 || !/^\d{8}$/.test(receiverPhone)) {
            toast.error('Le numéro doit contenir 8 chiffres');
            return false;
        }

        if (receiverPhone === user?.phone) {
            toast.error('Vous ne pouvez pas vous envoyer de l\'argent');
            return false;
        }

        if (!amountNum || amountNum < 25) {
            toast.error('Le montant minimum est de 25 FCFA');
            return false;
        }

        if (kycLimit && amountNum > kycLimit.limits?.single_transaction_limit) {
            toast.error(`Limite: ${kycLimit.limits.single_transaction_limit.toLocaleString()} FCFA`);
            return false;
        }

        setPendingTransaction({
            receiver_phone: receiverPhone,
            amount: amountNum,
            description
        });

        return true;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!prepareTransaction()) return;
        setShowPinModal(true);
    };

    // ✅ PROCESS TRANSACTION AVEC PIN
    const processTransaction = async (pin) => {
        if (!pendingTransaction) return;
        setLoading(true);

        try {
            console.log('📤 Envoi transfert avec PIN')
            const response = await axios.post(`${API_URL}/api/transfer`,
                {
                    receiver_phone: pendingTransaction.receiver_phone,
                    amount: pendingTransaction.amount,
                    description: pendingTransaction.description,
                    pin: pin  // ✅ PIN INCLUS
                },
                getAuthHeaders()
            );

            setTransactionData({
                reference: response.data.transaction?.reference || 'N/A',
                amount: pendingTransaction.amount,
                fee: response.data.transaction?.fee || 0,
                receiver_name: response.data.transaction?.receiver || pendingTransaction.receiver_phone,
                receiver_phone: pendingTransaction.receiver_phone,
                sender_name: user?.fullname,
                sender_phone: user?.phone,
                status: 'completed',
                type: 'sent',
                new_balance: response.data.transaction?.new_balance,
                date: new Date().toISOString()
            });

            setNotificationType('success');
            setShowNotification(true);
            setReceiverPhone('');
            setAmount('');
            setDescription('');
            setPendingTransaction(null);
            if (!hasPin) setHasPin(true);
            fetchRecentContacts();

        } catch (error) {
            console.error('❌ Erreur transfert:', error);
            const errorMessage = error.response?.data?.error || 'Erreur lors du transfert';
            setTransactionData({
                error: errorMessage,
                suggestion: 'Vérifiez votre solde ou réessayez plus tard.'
            });
            setNotificationType('error');
            setShowNotification(true);
            setPendingTransaction(null);
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // CALCULS
    // ============================================
    const calculateFees = () => {
        const amountNum = parseInt(amount) || 0;
        const fee = Math.floor(amountNum * 0.02);
        const total = amountNum + fee;
        return { fee, total };
    };

    const { fee, total } = calculateFees();

    const formatAmount = (amt) => {
        if (amt === null || amt === undefined) return '0 FCFA';
        return new Intl.NumberFormat('fr-FR').format(amt) + ' FCFA';
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // ============================================
    // PDF / PARTAGE
    // ============================================
    const generatePDF = () => {
        const receiptHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Reçu ${transactionData?.reference}</title>
                <style>
                    body { font-family: Arial; padding: 40px; }
                    .receipt { max-width: 600px; margin: 0 auto; border: 2px solid #0A2F6C; border-radius: 16px; padding: 30px; }
                    .header { text-align: center; border-bottom: 2px solid #0A2F6C; padding-bottom: 20px; margin-bottom: 20px; }
                    .logo { font-size: 28px; font-weight: bold; color: #0A2F6C; }
                    .subtitle { color: #666; font-size: 12px; }
                    .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #eee; }
                    .label { font-weight: bold; }
                    .total { font-size: 18px; font-weight: bold; margin-top: 20px; padding-top: 15px; border-top: 2px solid #0A2F6C; }
                    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 10px; color: #999; }
                </style>
            </head>
            <body>
                <div class="receipt">
                    <div class="header">
                        <div class="logo">AlkherPay</div>
                        <div class="subtitle">Transfert d'argent - GOUROUSDJA</div>
                    </div>
                    <div class="info-row"><span class="label">RÉFÉRENCE</span><span>${transactionData?.reference}</span></div>
                    <div class="info-row"><span class="label">DATE</span><span>${formatDate(transactionData?.date || new Date())}</span></div>
                    <div class="info-row"><span class="label">STATUT</span><span>COMPLÉTÉ</span></div>
                    <div class="info-row"><span class="label">EXPÉDITEUR</span><span>${transactionData?.sender_name || user?.fullname}</span></div>
                    <div class="info-row"><span class="label">TÉLÉPHONE</span><span>${transactionData?.sender_phone || user?.phone}</span></div>
                    <div class="info-row"><span class="label">DESTINATAIRE</span><span>${transactionData?.receiver_name}</span></div>
                    <div class="info-row"><span class="label">TÉLÉPHONE DEST</span><span>${transactionData?.receiver_phone}</span></div>
                    <div class="info-row"><span class="label">MONTANT</span><span>${formatAmount(transactionData?.amount)}</span></div>
                    <div class="info-row"><span class="label">FRAIS (2%)</span><span>${formatAmount(transactionData?.fee)}</span></div>
                    <div class="info-row total"><span class="label">TOTAL DÉBITÉ</span><span>${formatAmount((transactionData?.amount || 0) + (transactionData?.fee || 0))}</span></div>
                    <div class="footer">
                        <p>Merci d'utiliser AlkherPay</p>
                        <p>Service client: 62 78 73 07</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        const win = window.open();
        win.document.write(receiptHTML);
        win.document.close();
        win.print();
    };

    const downloadTXT = () => {
        const receipt = `AlkherPay - REÇU\n\nRéférence: ${transactionData?.reference}\nMontant: ${formatAmount(transactionData?.amount)}\nFrais: ${formatAmount(transactionData?.fee)}\nDestinataire: ${transactionData?.receiver_name}`;
        const blob = new Blob([receipt], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `recu_${transactionData?.reference}.txt`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Reçu téléchargé !');
    };

    const shareViaWhatsAppReceipt = () => {
        const message = `🏦 AlkherPay - Transaction réussie ✅\n\n📋 Référence: ${transactionData?.reference}\n💰 Montant: ${formatAmount(transactionData?.amount)}\n📊 Frais: ${formatAmount(transactionData?.fee)}\n👤 Destinataire: ${transactionData?.receiver_name}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    // ============================================
    // NOTIFICATION
    // ============================================
    const renderNotification = () => {
        if (!showNotification) return null;

        if (notificationType === 'success') {
            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                    <div className="max-w-md w-full bg-green-800 rounded-2xl p-6">
                        <div className="text-center">
                            <div className="text-green-400 text-5xl mb-3">✓</div>
                            <h2 className="text-xl font-bold text-white mb-2">Transfert réussi !</h2>
                            <p className="text-white/70 text-sm mb-4">{formatAmount(transactionData?.amount)} envoyés</p>
                            <div className="bg-white/10 rounded-lg p-3 mb-4 text-left">
                                <p className="text-white/60 text-xs">Référence: {transactionData?.reference}</p>
                                <p className="text-white/60 text-xs">Destinataire: {transactionData?.receiver_name}</p>
                                <p className="text-white/60 text-xs">Montant: {formatAmount(transactionData?.amount)}</p>
                                <p className="text-white/60 text-xs">Frais: {formatAmount(transactionData?.fee)}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={generatePDF} className="flex-1 bg-white/20 text-white py-2 rounded-lg text-sm flex items-center justify-center gap-1">
                                    <FaFilePdf /> PDF
                                </button>
                                <button onClick={downloadTXT} className="flex-1 bg-white/20 text-white py-2 rounded-lg text-sm">
                                    TXT
                                </button>
                                <button onClick={shareViaWhatsAppReceipt} className="flex-1 bg-[#25d366]/20 text-white py-2 rounded-lg text-sm flex items-center justify-center gap-1">
                                    <FaWhatsapp />
                                </button>
                            </div>
                            <button onClick={() => setShowNotification(false)} className="w-full mt-4 bg-white text-green-800 py-2 rounded-lg font-semibold">
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        if (notificationType === 'received') {
            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                    <div className="max-w-md w-full bg-blue-800 rounded-2xl p-6">
                        <div className="text-center">
                            <div className="text-blue-400 text-5xl mb-3">💰</div>
                            <h2 className="text-xl font-bold text-white mb-2">Argent reçu !</h2>
                            <p className="text-white/70 text-sm mb-4">{formatAmount(transactionData?.amount)} reçus</p>
                            <div className="bg-white/10 rounded-lg p-3 mb-4 text-left">
                                <p className="text-white/60 text-xs">Référence: {transactionData?.reference}</p>
                                <p className="text-white/60 text-xs">Expéditeur: {transactionData?.sender_name}</p>
                            </div>
                            <button onClick={() => setShowNotification(false)} className="w-full bg-white text-blue-800 py-2 rounded-lg font-semibold">
                                Voir mon solde
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        if (notificationType === 'error') {
            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                    <div className="max-w-md w-full bg-red-800 rounded-2xl p-6">
                        <div className="text-center">
                            <div className="text-red-400 text-5xl mb-3">⚠️</div>
                            <h2 className="text-xl font-bold text-white mb-2">Transfert échoué</h2>
                            <p className="text-white/70 text-sm mb-4">{transactionData?.error}</p>
                            <div className="bg-white/10 rounded-lg p-3 mb-4">
                                <p className="text-white/60 text-sm">{transactionData?.suggestion}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setShowNotification(false)} className="flex-1 bg-white/20 text-white py-2 rounded-lg">
                                    Réessayer
                                </button>
                                <button onClick={() => { setShowNotification(false); navigate('/dashboard'); }} className="flex-1 bg-white text-red-800 py-2 rounded-lg font-semibold">
                                    Retour
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return null;
    };

    // ============================================
    // RENDU
    // ============================================
    if (checkingPin) {
        return (
            <Layout user={user} socket={socket}>
                <div className="flex justify-center items-center h-64">
                    <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout user={user} socket={socket}>
            <div className="grid lg:grid-cols-2 gap-6">
                {/* FORMULAIRE DE TRANSFERT */}
                <div className="card">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <FaMoneyBillWave className="text-blue-400" /> Nouveau transfert
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Destinataire */}
                        <div>
                            <label className="label">
                                <FaPhone className="inline mr-2" /> Numéro du destinataire
                            </label>
                            <input
                                type="tel"
                                value={receiverPhone}
                                onChange={(e) => setReceiverPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                className="input-field"
                                placeholder="Ex: 66345678"
                                maxLength="8"
                                required
                                autoFocus
                            />

                            {recentContacts.length > 0 && (
                                <div className="mt-3">
                                    <p className="text-white/40 text-xs mb-2">📋 Contacts récents :</p>
                                    <div className="flex flex-wrap gap-2">
                                        {recentContacts.map(contact => (
                                            <button
                                                key={contact.phone}
                                                type="button"
                                                onClick={() => setReceiverPhone(contact.phone)}
                                                className="text-xs bg-white/10 hover:bg-white/20 text-white/80 px-3 py-1 rounded-full"
                                            >
                                                {contact.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {favorites.length > 0 && (
                                <div className="mt-3">
                                    <p className="text-white/40 text-xs mb-2">⭐ Favoris :</p>
                                    <div className="flex flex-wrap gap-2">
                                        {favorites.map(fav => (
                                            <button
                                                key={fav.phone}
                                                type="button"
                                                onClick={() => setReceiverPhone(fav.phone)}
                                                className="text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-3 py-1 rounded-full flex items-center gap-1"
                                            >
                                                {fav.name}
                                                <FaTrash
                                                    size={10}
                                                    className="ml-1 opacity-50 hover:opacity-100"
                                                    onClick={(e) => { e.stopPropagation(); removeFavorite(fav.phone); }}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Montant */}
                        <div>
                            <label className="label">
                                <FaMoneyBillWave className="inline mr-2" /> Montant (FCFA)
                            </label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="input-field"
                                placeholder="Montant à envoyer"
                                min="25"
                                required
                            />
                            <div className="flex justify-between items-center mt-1">
                                <p className="text-white/40 text-xs">Minimum: 25 FCFA</p>
                                {kycLimit && (
                                    <p className="text-white/40 text-xs">
                                        <FaShieldAlt className="inline mr-1" size={10} />
                                        Limite: {kycLimit.limits?.single_transaction_limit?.toLocaleString()} FCFA
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="label">Description (optionnelle)</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="input-field"
                                placeholder="Motif du transfert"
                            />
                        </div>

                        {/* Récap frais */}
                        {amount && parseInt(amount) >= 25 && (
                            <div className="bg-white/5 rounded-xl p-4 space-y-2">
                                <div className="flex justify-between text-white/80">
                                    <span>Montant à envoyer</span>
                                    <span>{parseInt(amount).toLocaleString()} FCFA</span>
                                </div>
                                <div className="flex justify-between text-white/60 text-sm">
                                    <span>Frais (2%)</span>
                                    <span>{fee.toLocaleString()} FCFA</span>
                                </div>
                                <div className="border-t border-white/20 pt-2 flex justify-between text-white font-bold">
                                    <span>Total à débiter</span>
                                    <span>{total.toLocaleString()} FCFA</span>
                                </div>
                            </div>
                        )}

                        {/* Mon numéro */}
                        <div className="border-t border-white/10 pt-4 mt-2">
                            <p className="text-white/60 text-sm">📱 Votre adresse wallet</p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-white font-mono text-lg font-bold">{user?.phone}</p>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(user?.phone || '', 'Numéro')}
                                    className="text-white/40 hover:text-white"
                                >
                                    {copied ? <FaCheckCircle className="text-green-400" /> : <FaCopy />}
                                </button>
                            </div>
                        </div>

                        {/* Info PIN */}
                        <div className="bg-blue-500/10 rounded-xl p-3 flex items-center gap-2">
                            <FaShieldAlt className="text-blue-400" />
                            <p className="text-blue-300 text-xs">
                                {hasPin
                                    ? '🔐 Vos transactions sont sécurisées par votre code PIN'
                                    : '🔒 Définissez votre code PIN pour sécuriser vos transactions'}
                            </p>
                        </div>

                        {/* Bouton */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <><FaSpinner className="animate-spin" /> Traitement...</>
                            ) : (
                                'Confirmer le transfert'
                            )}
                        </button>
                    </form>
                </div>

                {/* QR CODE GENERATOR */}
                <div className="card">
                    <div className="text-center mb-6">
                        <div className="inline-flex p-3 bg-blue-500/20 rounded-full mb-3">
                            <FaQrcode className="text-blue-400 text-2xl" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Recevoir un paiement</h2>
                        <p className="text-white/50 text-sm">Générez un QR code pour recevoir de l'argent</p>
                    </div>

                    {!qrGenerated ? (
                        <div className="space-y-4">
                            <div>
                                <label className="label">Montant (optionnel)</label>
                                <input
                                    type="number"
                                    value={qrAmount}
                                    onChange={(e) => setQrAmount(e.target.value)}
                                    className="input-field"
                                    placeholder="Ex: 5000"
                                    min="25"
                                />
                            </div>
                            <div>
                                <label className="label">Description (optionnelle)</label>
                                <input
                                    type="text"
                                    value={qrDescription}
                                    onChange={(e) => setQrDescription(e.target.value)}
                                    className="input-field"
                                    placeholder="Ex: Paiement service"
                                />
                            </div>
                            <button
                                onClick={generateQRCode}
                                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition flex items-center justify-center gap-2"
                            >
                                <FaQrcode /> Générer mon QR code
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-center">
                                {qrImageUrl && (
                                    <img
                                        src={qrImageUrl}
                                        alt="QR Code"
                                        className="w-48 h-48 mx-auto bg-white p-4 rounded-xl shadow-lg"
                                    />
                                )}
                            </div>
                            <div className="bg-white/5 rounded-xl p-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/60">Votre numéro</span>
                                    <span className="font-mono font-bold text-white">{user?.phone}</span>
                                </div>
                                <div className="flex justify-between text-sm mt-2 pt-2 border-t border-white/10">
                                    <button
                                        onClick={() => copyToClipboard(paymentLink, 'Lien')}
                                        className="text-blue-400 text-xs"
                                    >
                                        Copier le lien
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={downloadQRCode}
                                    className="flex-1 bg-white/10 text-white py-2 rounded-lg text-sm hover:bg-white/20 flex items-center justify-center gap-1"
                                >
                                    <FaDownload /> Télécharger
                                </button>
                                <button
                                    onClick={shareViaWhatsApp}
                                    className="flex-1 bg-[#25d366]/20 text-white py-2 rounded-lg text-sm hover:bg-[#25d366]/30 flex items-center justify-center gap-1"
                                >
                                    <FaWhatsapp /> WhatsApp
                                </button>
                            </div>
                            <button
                                onClick={resetQRGenerator}
                                className="w-full text-sm text-white/40 hover:text-white/60"
                            >
                                Nouveau QR code
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL PIN */}
            {showPinModal && (
                <PinModal
                    isOpen={showPinModal}
                    onClose={() => {
                        setShowPinModal(false);
                        setPendingTransaction(null);
                    }}
                    onSuccess={(pin) => {
                        console.log('✅ PIN reçu, traitement du transfert');
                        if (!hasPin) setHasPin(true);
                        setShowPinModal(false);
                        processTransaction(pin);
                    }}
                    type={hasPin ? 'verify' : 'set'}
                    amount={pendingTransaction?.amount}
                />
            )}

            {renderNotification()}
        </Layout>
    );
}

export default Transfer;